import { addOwned, applyRewards, spendEcus, removeOwned, getInventory } from "./inventory";
import { MONSTER_BY_ID } from "./bestiary";

/**
 * Les Canyons Écarlates — the third gathering zone, and a third distinct pressure model on the same
 * structural skeleton `gathering.ts`/`fishing.ts` already established: tiers described by data,
 * chance-rolled drop tables, a settle-on-read consumable resource (pickaxe durability), and ambushes
 * on the shared battle engine. The cave punishes lingering, the lake punishes failure outright; the
 * canyon punishes a BAD strike specifically — a clean hit costs nothing extra, a miss costs durability
 * on top of the swing's baseline cost. Three zones, three different reasons to be careful.
 */

export type MiningTier = 1 | 2 | 3;

export interface OreDrop {
  materialId: string;
  chance: number;
  qty: number;
}

export interface MiningNodeDef {
  id: string;
  tier: MiningTier;
  name: string;
  levelRequired: number;
  guardianId: string;
  drops: OreDrop[];
  xp: number;
  /** Seconds for one full sweep of the fracture-line marker (there and back). Tightens per tier. */
  sweepDuration: number;
  /** Width of the perfect-break zone, centred, as % of the line. */
  goldZoneSize: number;
  /** Width of the forgiving "still breaks the rock" zone, centred, as % of the line — encompasses
   * the gold zone. Outside it, the pickaxe rebounds. */
  okZoneSize: number;
  x: number;
  y: number;
  accent: string;
}

/**
 * Three veins, one per tier. EVERY TIER'S HEADLINE ORE IS A CHANCE ROLL, never a guarantee — the
 * lesson both earlier gathering zones had to learn the hard way (a 100%-drop "Épique" item is a lie
 * about its own rarity badge). Each node's bulk material is reliable, its prestige one is not, and
 * T3 also restocks T2's ore so the tiers chain rather than each being a closed loop.
 */
export const MINING_NODES: MiningNodeDef[] = [
  {
    id: "clay_vein",
    tier: 1,
    name: "Faille d'Argile",
    levelRequired: 1,
    guardianId: "crevasse_scorpion",
    drops: [
      { materialId: "clay", chance: 100, qty: 2 },
      { materialId: "copper_ore", chance: 65, qty: 1 },
      { materialId: "coal", chance: 40, qty: 1 },
    ],
    xp: 25,
    sweepDuration: 1.8,
    goldZoneSize: 18,
    okZoneSize: 60,
    x: 28,
    y: 78,
    accent: "#f97316",
  },
  {
    id: "iron_seam",
    tier: 2,
    name: "Veine de Fer Rouge",
    levelRequired: 10,
    guardianId: "canyon_raider",
    drops: [
      { materialId: "copper_ore", chance: 100, qty: 1 },
      { materialId: "red_iron_ore", chance: 55, qty: 1 },
      { materialId: "coal", chance: 45, qty: 1 },
    ],
    xp: 70,
    sweepDuration: 1.3,
    goldZoneSize: 13,
    okZoneSize: 44,
    x: 70,
    y: 50,
    accent: "#dc2626",
  },
  {
    id: "ruby_fault",
    tier: 3,
    name: "Faille de Rubis Ardent",
    levelRequired: 20,
    guardianId: "sandstone_golem",
    drops: [
      { materialId: "red_iron_ore", chance: 100, qty: 1 },
      { materialId: "ardent_ruby_rough", chance: 20, qty: 1 },
      { materialId: "sealed_fossil", chance: 10, qty: 1 },
    ],
    xp: 160,
    sweepDuration: 0.9,
    goldZoneSize: 8,
    okZoneSize: 30,
    x: 48,
    y: 22,
    accent: "#e11d48",
  },
];

export const MINING_NODE_BY_ID: Record<string, MiningNodeDef> = Object.fromEntries(
  MINING_NODES.map((n) => [n.id, n])
);

export const PERFECT_CHANCE_BONUS = 15;
export const PERFECT_YIELD_MULT = 1.5;
export const AMBUSH_CHANCE = 0.15;

export const HARVESTS_PER_NODE = 3;
export const NODE_RECHARGE_MS = 5 * 60 * 1000;

export const PICKAXE_MAX_DURABILITY = 35;
/** A clean or forgiving hit costs the swing's baseline wear; a miss costs this on top of it. */
export const HIT_DURABILITY_COST = 1;
export const MISS_EXTRA_DURABILITY_COST = 2;
export const PICKAXE_REPAIR_COST = 70;

/** The Pioche Renforcée en Cuivre: a one-time permanent +40% max durability upgrade, not a stored
 * item — there is nowhere in the bag for "a better version of the tool you're already holding". */
export const PICKAXE_UPGRADE_BONUS = 0.4;
export const PICKAXE_UPGRADE_MATERIALS = [
  { materialId: "copper_ingot", qty: 2 },
  { materialId: "raw_hide", qty: 1 },
];
export const PICKAXE_UPGRADE_ECUS = 35;

const STORAGE_KEY = "pixelrmmo:mining";

export interface NodeState {
  harvests: number;
  exhaustedAt: number;
}

export interface MiningState {
  pickaxeDurability: number;
  pickaxeUpgraded: boolean;
  nodes: Record<string, NodeState>;
}

const DEFAULT_STATE: MiningState = { pickaxeDurability: PICKAXE_MAX_DURABILITY, pickaxeUpgraded: false, nodes: {} };

export function pickaxeMax(state: MiningState = getMiningState()): number {
  return state.pickaxeUpgraded ? Math.round(PICKAXE_MAX_DURABILITY * (1 + PICKAXE_UPGRADE_BONUS)) : PICKAXE_MAX_DURABILITY;
}

export function getMiningState(): MiningState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw) as Partial<MiningState>;
    return {
      pickaxeDurability: typeof parsed.pickaxeDurability === "number" ? parsed.pickaxeDurability : PICKAXE_MAX_DURABILITY,
      pickaxeUpgraded: parsed.pickaxeUpgraded ?? false,
      nodes: parsed.nodes ?? {},
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function write(state: MiningState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getNodeState(nodeId: string, now: number = Date.now()): NodeState {
  const state = getMiningState();
  const node = state.nodes[nodeId] ?? { harvests: 0, exhaustedAt: 0 };
  if (node.exhaustedAt > 0 && now - node.exhaustedAt >= NODE_RECHARGE_MS) return { harvests: 0, exhaustedAt: 0 };
  return node;
}

export function isNodeReady(nodeId: string, now: number = Date.now()): boolean {
  return getNodeState(nodeId, now).exhaustedAt === 0;
}

export function msUntilNodeReady(nodeId: string, now: number = Date.now()): number {
  const node = getNodeState(nodeId, now);
  return node.exhaustedAt === 0 ? 0 : Math.max(0, NODE_RECHARGE_MS - (now - node.exhaustedAt));
}

/** Spends durability and one node charge. `missed` adds the rebound penalty on top of the baseline
 * swing cost — a clean or forgiving hit only ever pays the baseline. */
export function consumeAttempt(nodeId: string, missed: boolean, now: number = Date.now()): void {
  const state = getMiningState();
  const cost = HIT_DURABILITY_COST + (missed ? MISS_EXTRA_DURABILITY_COST : 0);
  state.pickaxeDurability = Math.max(0, state.pickaxeDurability - cost);
  const node = getNodeState(nodeId, now);
  const harvests = node.harvests + 1;
  state.nodes[nodeId] = harvests >= HARVESTS_PER_NODE ? { harvests, exhaustedAt: now } : { harvests, exhaustedAt: 0 };
  write(state);
}

export function repairPickaxe(): boolean {
  if (!spendEcus(PICKAXE_REPAIR_COST)) return false;
  const state = getMiningState();
  state.pickaxeDurability = pickaxeMax(state);
  write(state);
  return true;
}

export function canUpgradePickaxe(): boolean {
  if (getMiningState().pickaxeUpgraded) return false;
  const inv = getInventory();
  if (inv.ecus < PICKAXE_UPGRADE_ECUS) return false;
  return PICKAXE_UPGRADE_MATERIALS.every((m) => (inv.materials[m.materialId] ?? 0) >= m.qty);
}

/** Consumes the upgrade's cost and permanently raises max durability — refuses atomically, and
 * refuses again (silently) once already upgraded, since there is only one tier of this upgrade. */
export function upgradePickaxe(): boolean {
  if (!canUpgradePickaxe()) return false;
  if (!spendEcus(PICKAXE_UPGRADE_ECUS)) return false;
  for (const m of PICKAXE_UPGRADE_MATERIALS) removeOwned("material", m.materialId, m.qty);
  const state = getMiningState();
  state.pickaxeUpgraded = true;
  state.pickaxeDurability = pickaxeMax(state);
  write(state);
  return true;
}

export interface StrikeOutcome {
  granted: { materialId: string; amount: number }[];
  xp: number;
  perfect: boolean;
}

/** Banks a successful break by rolling the node's own table. */
export function grantOre(node: MiningNodeDef, perfect: boolean): StrikeOutcome {
  const granted: { materialId: string; amount: number }[] = [];
  for (const drop of node.drops) {
    const chance = perfect ? Math.min(100, drop.chance + PERFECT_CHANCE_BONUS) : drop.chance;
    if (Math.random() * 100 >= chance) continue;
    const amount = perfect ? Math.ceil(drop.qty * PERFECT_YIELD_MULT) : drop.qty;
    addOwned("material", drop.materialId, amount);
    granted.push({ materialId: drop.materialId, amount });
  }
  const xp = perfect ? node.xp * 2 : node.xp;
  applyRewards({ xp });
  return { granted, xp, perfect };
}

export function nodeGuardian(node: MiningNodeDef) {
  return MONSTER_BY_ID[node.guardianId];
}

/* ------------------------------------------------------------------------------- scene assets */

export const CANYON_BACKGROUND = "/assets/gathering/red_canyon_bg.png";
export const CANYON_ASPECT = 384 / 680;

/** 06h–21h — the heat-shimmer window (the "night" complement of the lake's own day/night gate). */
export function isDaytime(now: Date = new Date()): boolean {
  const h = now.getHours();
  return h >= 6 && h < 21;
}
