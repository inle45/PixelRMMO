import { MATERIALS, type MaterialDef } from "./materials";
import { EQUIPMENT_BY_ID, EQUIPMENT_SLOTS, scoreEquipment, type EquipmentItemDef, type EquipmentSlotId } from "./equipment";
import { BATTLE_ITEM_BY_ID, type BattleItem } from "./items";
import type { ClassId } from "./classes";

const STORAGE_KEY = "pixelrmmo:inventory";

export interface InventoryState {
  ecus: number;
  materials: Record<string, number>;
  xp: number;
  level: number;
  /** Equipment copies sitting in the bag, unequipped. */
  ownedEquipment: Record<string, number>;
  /** One item id per slot, or absent if the slot is empty. */
  equippedItems: Partial<Record<EquipmentSlotId, string>>;
  ownedConsumables: Record<string, number>;
  /** `${kind}:${id}` keys the player has already opened at least once — drives the "Nouveau" badge. */
  seen: Record<string, boolean>;
}

/** Starter loadout: the 4 armor slots (usable by any class) pre-equipped so the paper doll and
 * combat stats are testable immediately. Weapon/offhand are class-restricted (a Mage can't equip
 * a sword, an Archer has no shield/grimoire) so they start empty — the matching starter piece sits
 * unequipped in the bag instead, for every class, since inventory.ts has no notion of hero class. */
const DEFAULT_EQUIPPED: Partial<Record<EquipmentSlotId, string>> = {
  head: "cracked_bone_helm",
  chest: "chitin_plate",
  legs: "scale_greaves",
  boots: "tracker_boots",
};

/** One starter weapon per class, the matching starter offhand for classes that use one, plus a
 * spare upgraded pair of boots so "Équiper le meilleur" has something to demonstrate immediately. */
const DEFAULT_OWNED_EQUIPMENT: Record<string, number> = {
  rusty_steel_sword: 1,
  short_bow: 1,
  gnarled_staff: 1,
  bone_pavise: 1,
  elemental_grimoire: 1,
  reinforced_tracker_boots: 1,
};

const DEFAULT_STATE: InventoryState = {
  ecus: 250,
  materials: {},
  xp: 0,
  level: 1,
  ownedEquipment: { ...DEFAULT_OWNED_EQUIPMENT },
  equippedItems: { ...DEFAULT_EQUIPPED },
  ownedConsumables: { heal_potion: 2, remedy: 1 },
  seen: Object.fromEntries(Object.values(DEFAULT_EQUIPPED).map((id) => [`equipment:${id}`, true])),
};

/** Flat curve — 400 XP per level. A demo game doesn't need a tuned escalating curve. */
export const XP_PER_LEVEL = 400;

export function xpIntoLevel(state: Pick<InventoryState, "xp" | "level">): number {
  return state.xp - (state.level - 1) * XP_PER_LEVEL;
}

export function getInventory(): InventoryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw) as Partial<InventoryState>;
    return {
      ecus: typeof parsed.ecus === "number" ? parsed.ecus : DEFAULT_STATE.ecus,
      materials: parsed.materials ?? {},
      xp: typeof parsed.xp === "number" ? parsed.xp : 0,
      level: typeof parsed.level === "number" ? parsed.level : 1,
      ownedEquipment: parsed.ownedEquipment ?? { ...DEFAULT_OWNED_EQUIPMENT },
      equippedItems: parsed.equippedItems ?? { ...DEFAULT_EQUIPPED },
      ownedConsumables: parsed.ownedConsumables ?? { ...DEFAULT_STATE.ownedConsumables },
      seen: parsed.seen ?? { ...DEFAULT_STATE.seen },
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function write(state: InventoryState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export interface RewardInput {
  ecus?: number;
  materials?: Record<string, number>;
  xp?: number;
}

export interface ApplyRewardsResult {
  state: InventoryState;
  leveledUp: boolean;
  levelsGained: number;
  previousLevel: number;
}

/** Applies dungeon-run rewards atomically, resolves level-ups, and persists the result. */
export function applyRewards(rewards: RewardInput): ApplyRewardsResult {
  const state = getInventory();
  const previousLevel = state.level;

  state.ecus += rewards.ecus ?? 0;
  for (const [id, count] of Object.entries(rewards.materials ?? {})) {
    state.materials[id] = (state.materials[id] ?? 0) + count;
  }
  state.xp += rewards.xp ?? 0;

  let levelsGained = 0;
  while (xpIntoLevel(state) >= XP_PER_LEVEL) {
    state.level += 1;
    levelsGained += 1;
  }

  write(state);
  return { state, leveledUp: levelsGained > 0, levelsGained, previousLevel };
}

export interface OwnedMaterial {
  material: MaterialDef;
  count: number;
}

/** Owned materials resolved against the MATERIALS catalog for display (icon/name/rarity). */
export function getOwnedMaterials(): OwnedMaterial[] {
  const state = getInventory();
  const owned: OwnedMaterial[] = [];
  for (const [id, count] of Object.entries(state.materials)) {
    if (count <= 0) continue;
    const material = MATERIALS.find((m) => m.id === id);
    if (material) owned.push({ material, count });
  }
  return owned;
}

export interface OwnedEquipment {
  item: EquipmentItemDef;
  count: number;
}

/** Unequipped equipment copies sitting in the bag, resolved against the EQUIPMENT catalog. */
export function getOwnedEquipment(): OwnedEquipment[] {
  const state = getInventory();
  const owned: OwnedEquipment[] = [];
  for (const [id, count] of Object.entries(state.ownedEquipment)) {
    if (count <= 0) continue;
    const item = EQUIPMENT_BY_ID[id];
    if (item) owned.push({ item, count });
  }
  return owned;
}

export interface EquippedSlot {
  slot: EquipmentSlotId;
  item: EquipmentItemDef;
}

/** The 6 equipment slots that currently hold an item, resolved against the EQUIPMENT catalog. */
export function getEquippedItems(): EquippedSlot[] {
  const state = getInventory();
  const equipped: EquippedSlot[] = [];
  for (const [slot, id] of Object.entries(state.equippedItems) as [EquipmentSlotId, string | undefined][]) {
    if (!id) continue;
    const item = EQUIPMENT_BY_ID[id];
    if (item) equipped.push({ slot, item });
  }
  return equipped;
}

export interface OwnedConsumable {
  item: BattleItem;
  count: number;
}

/** Owned consumables resolved against the BATTLE_ITEMS catalog. */
export function getOwnedConsumables(): OwnedConsumable[] {
  const state = getInventory();
  const owned: OwnedConsumable[] = [];
  for (const [id, count] of Object.entries(state.ownedConsumables)) {
    if (count <= 0) continue;
    const item = BATTLE_ITEM_BY_ID[id];
    if (item) owned.push({ item, count });
  }
  return owned;
}

/** Moves one copy of `itemId` from the bag into its assigned slot, swapping out whatever was
 * already equipped there (which returns to the bag) rather than requiring an explicit unequip first.
 * Refuses silently if `classId` isn't allowed to use this item (e.g. an Archer trying a sword). */
export function equipItem(itemId: string, classId: ClassId): InventoryState {
  const item = EQUIPMENT_BY_ID[itemId];
  const state = getInventory();
  if (!item || !item.classes.includes(classId) || (state.ownedEquipment[itemId] ?? 0) <= 0) return state;

  const previousId = state.equippedItems[item.slot];
  if (previousId) {
    state.ownedEquipment[previousId] = (state.ownedEquipment[previousId] ?? 0) + 1;
  }

  state.ownedEquipment[itemId] -= 1;
  if (state.ownedEquipment[itemId] <= 0) delete state.ownedEquipment[itemId];
  state.equippedItems[item.slot] = itemId;

  write(state);
  return state;
}

/** For each of the 6 slots, equips the highest-`scoreEquipment` item the class can use among what's
 * already equipped there plus whatever matching copies sit in the bag. One atomic write for all 6. */
export function autoEquipBest(classId: ClassId): InventoryState {
  const state = getInventory();
  for (const slot of EQUIPMENT_SLOTS) {
    const equippedId = state.equippedItems[slot];
    const candidateIds = new Set<string>(equippedId ? [equippedId] : []);
    for (const [id, count] of Object.entries(state.ownedEquipment)) {
      if (count > 0 && EQUIPMENT_BY_ID[id]?.slot === slot) candidateIds.add(id);
    }
    const candidates = [...candidateIds]
      .map((id) => EQUIPMENT_BY_ID[id])
      .filter((i): i is EquipmentItemDef => !!i && i.classes.includes(classId));
    if (candidates.length === 0) continue;

    const best = candidates.reduce((a, b) => (scoreEquipment(b) > scoreEquipment(a) ? b : a));
    if (best.id === equippedId) continue;

    if (equippedId) state.ownedEquipment[equippedId] = (state.ownedEquipment[equippedId] ?? 0) + 1;
    state.ownedEquipment[best.id] -= 1;
    if (state.ownedEquipment[best.id] <= 0) delete state.ownedEquipment[best.id];
    state.equippedItems[slot] = best.id;
  }
  write(state);
  return state;
}

/** Returns whatever is equipped in `slot` to the bag, leaving the slot empty. */
export function unequipSlot(slot: EquipmentSlotId): InventoryState {
  const state = getInventory();
  const itemId = state.equippedItems[slot];
  if (!itemId) return state;

  state.ownedEquipment[itemId] = (state.ownedEquipment[itemId] ?? 0) + 1;
  delete state.equippedItems[slot];

  write(state);
  return state;
}

/** Consumes one copy of a consumable from the bag (no persistent hero HP to restore outside a
 * dungeon run — this just removes it from the inventory). */
export function consumeConsumable(itemId: string): InventoryState {
  const state = getInventory();
  if ((state.ownedConsumables[itemId] ?? 0) <= 0) return state;
  state.ownedConsumables[itemId] -= 1;
  if (state.ownedConsumables[itemId] <= 0) delete state.ownedConsumables[itemId];
  write(state);
  return state;
}

export type DiscardableKind = "equipment" | "material" | "consumable";

/** Discards one copy of an owned (unequipped) item from the bag. */
export function discardItem(kind: DiscardableKind, itemId: string): InventoryState {
  const state = getInventory();
  const bucket = kind === "equipment" ? state.ownedEquipment : kind === "material" ? state.materials : state.ownedConsumables;
  if ((bucket[itemId] ?? 0) <= 0) return state;
  bucket[itemId] -= 1;
  if (bucket[itemId] <= 0) delete bucket[itemId];
  write(state);
  return state;
}

/** True until the player has opened this bag item's details modal at least once — drives the
 * "Nouveau" badge. Works for any owned item, including future dungeon-loot equipment drops, since
 * it just checks for the absence of a "seen" flag rather than requiring explicit grant-time wiring. */
export function isItemNew(kind: DiscardableKind, itemId: string): boolean {
  return !getInventory().seen[`${kind}:${itemId}`];
}

export function markItemSeen(kind: DiscardableKind, itemId: string): InventoryState {
  const state = getInventory();
  if (state.seen[`${kind}:${itemId}`]) return state;
  state.seen[`${kind}:${itemId}`] = true;
  write(state);
  return state;
}
