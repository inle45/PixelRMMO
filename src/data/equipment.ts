import rawEquipment from "./equipment.json";
import type { RarityId } from "./rarity";
import type { DamageTypeId } from "./typeSystem";
import type { ClassId } from "./classes";

export type EquipmentSlotId = "head" | "chest" | "legs" | "boots" | "weapon" | "offhand";

export const EQUIPMENT_SLOTS: EquipmentSlotId[] = ["head", "chest", "legs", "boots", "weapon", "offhand"];

export interface SlotMeta {
  id: EquipmentSlotId;
  label: string;
  emoji: string;
  /** What this slot's stats represent, shown as a caption in the paper doll. */
  focus: string;
}

export const SLOT_META: Record<EquipmentSlotId, SlotMeta> = {
  head: { id: "head", label: "Tête", emoji: "🪖", focus: "PV, Mana, Résistances" },
  chest: { id: "chest", label: "Haut du corps", emoji: "🥋", focus: "Défense principale, PV" },
  legs: { id: "legs", label: "Bas du corps", emoji: "👖", focus: "Défense, Résistances" },
  boots: { id: "boots", label: "Chaussures", emoji: "👢", focus: "Vitesse, Esquive" },
  weapon: { id: "weapon", label: "Arme Principale", emoji: "⚔️", focus: "Attaque, Affinité élémentaire" },
  offhand: { id: "offhand", label: "Main Secondaire", emoji: "🛡️", focus: "Parade, Défense" },
};

export interface EquipmentStats {
  hp?: number;
  mana?: number;
  atk?: number;
  def?: number;
  speed?: number;
  critChance?: number;
  dodgeChance?: number;
  blockChance?: number;
  magicPenetration?: number;
}

interface RawEquipmentItem {
  id: string;
  name: string;
  slot: EquipmentSlotId;
  rarity: RarityId;
  value: number;
  /** Which classes may equip this piece — a Mage can't pick up a sword, an Archer can't wear a shield. */
  classes: ClassId[];
  lore: string;
  stats: EquipmentStats;
  damageType?: DamageTypeId;
  /** Higher-rarity tiers of the same base item reuse its icon instead of a new PixelLab generation. */
  iconRef?: string;
}

export interface EquipmentItemDef extends RawEquipmentItem {
  icon: string;
}

const iconModules = import.meta.glob("../assets/inventory/icons/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function getIcon(id: string): string {
  const entry = Object.entries(iconModules).find(([path]) => path.endsWith(`/${id}.png`));
  return entry?.[1] ?? "";
}

export const EQUIPMENT: EquipmentItemDef[] = (rawEquipment as RawEquipmentItem[]).map((e) => ({
  ...e,
  icon: getIcon(e.iconRef ?? e.id),
}));

export const EQUIPMENT_BY_ID: Record<string, EquipmentItemDef> = Object.fromEntries(
  EQUIPMENT.map((e) => [e.id, e])
);

const slotSilhouetteModules = import.meta.glob("../assets/inventory/slots/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

/** The empty-slot silhouette glyph shown in the paper doll before anything is equipped there. */
export function getSlotSilhouette(slot: EquipmentSlotId): string {
  const entry = Object.entries(slotSilhouetteModules).find(([path]) => path.endsWith(`/${slot}.png`));
  return entry?.[1] ?? "";
}

const filterIconModules = import.meta.glob("../assets/inventory/filters/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

export function getFilterIcon(id: string): string {
  const entry = Object.entries(filterIconModules).find(([path]) => path.endsWith(`/${id}.png`));
  return entry?.[1] ?? "";
}

export interface EquipmentBonuses {
  hp: number;
  mana: number;
  atk: number;
  def: number;
  speed: number;
  critChance: number;
  dodgeChance: number;
  blockChance: number;
  magicPenetration: number;
  /** The active elemental affinity transmitted by the equipped weapon, if any. */
  damageType?: DamageTypeId;
}

const EMPTY_BONUSES: EquipmentBonuses = {
  hp: 0,
  mana: 0,
  atk: 0,
  def: 0,
  speed: 0,
  critChance: 0,
  dodgeChance: 0,
  blockChance: 0,
  magicPenetration: 0,
};

/** Sums every equipped item's stat bonuses into one aggregate — the single source both the paper
 * doll's live stat readout and the battle engine's combatant builder consume. */
export function aggregateEquipmentBonuses(
  equippedItems: Partial<Record<EquipmentSlotId, string>>
): EquipmentBonuses {
  const bonuses: EquipmentBonuses = { ...EMPTY_BONUSES };
  for (const itemId of Object.values(equippedItems)) {
    if (!itemId) continue;
    const item = EQUIPMENT_BY_ID[itemId];
    if (!item) continue;
    bonuses.hp += item.stats.hp ?? 0;
    bonuses.mana += item.stats.mana ?? 0;
    bonuses.atk += item.stats.atk ?? 0;
    bonuses.def += item.stats.def ?? 0;
    bonuses.speed += item.stats.speed ?? 0;
    bonuses.critChance += item.stats.critChance ?? 0;
    bonuses.dodgeChance += item.stats.dodgeChance ?? 0;
    bonuses.blockChance += item.stats.blockChance ?? 0;
    bonuses.magicPenetration += item.stats.magicPenetration ?? 0;
    if (item.slot === "weapon" && item.damageType) bonuses.damageType = item.damageType;
  }
  return bonuses;
}

/** Naive single-number "power score" for comparing two items in the same slot — flat stats weighted
 * by rough combat impact, percentage stats weighted heavier since they compound. Not a min-max
 * optimizer, just enough to drive the "Équiper le meilleur" auto-equip button. */
export function scoreEquipment(item: EquipmentItemDef): number {
  const s = item.stats;
  return (
    (s.hp ?? 0) +
    (s.mana ?? 0) +
    (s.atk ?? 0) * 3 +
    (s.def ?? 0) * 3 +
    (s.speed ?? 0) * 5 +
    ((s.critChance ?? 0) + (s.dodgeChance ?? 0) + (s.blockChance ?? 0) + (s.magicPenetration ?? 0)) * 100
  );
}
