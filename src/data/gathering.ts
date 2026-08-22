import { addOwned, applyRewards, spendEcus, removeOwned, getInventory } from "./inventory";
import { MATERIAL_BY_ID } from "./materials";
import { MONSTER_BY_ID } from "./bestiary";

export type NodeTier = 1 | 2 | 3;

export interface GatheringNodeDef {
  id: string;
  tier: NodeTier;
  name: string;
  /** Minimum hero level. Below it the node can be inspected but not harvested. */
  levelRequired: number;
  materialId: string;
  /** Bestiary id of the guardian this tier can wake. */
  guardianId: string;
  /** Base units harvested on a normal success. A perfect run adds +50% (rounded up). */
  yield: number;
  xp: number;
  /** Mini-game shape, scaled per tier: more points, tighter window, and T3's points drift. */
  points: number;
  /** Seconds the player has to hit each point. */
  reactionWindow: number;
  /** Toxicity added on a failed attempt. */
  failToxicity: number;
  /** Toxicity added per harvest attempt regardless of outcome. */
  attemptToxicity: number;
  /** T3's targets oscillate instead of sitting still. */
  drifting: boolean;
  /** Percentage position on the cave backdrop. */
  x: number;
  y: number;
  accent: string;
}

/** Three nodes, one per tier, laid out on the two cavern floors of `mushroom_cave_bg.png`: the two
 * easy ones on the near (lower) ledge, the royal one deeper in on the upper ledge. */
export const GATHERING_NODES: GatheringNodeDef[] = [
  {
    id: "moss_caps",
    tier: 1,
    name: "Chapeaux de Mousse",
    levelRequired: 1,
    materialId: "mousse_caverne",
    guardianId: "fungal_larva",
    yield: 2,
    xp: 20,
    points: 3,
    reactionWindow: 3.5,
    failToxicity: 10,
    attemptToxicity: 3,
    drifting: false,
    x: 24,
    y: 89,
    accent: "#6ee7a0",
  },
  {
    id: "biolum_spores",
    tier: 2,
    name: "Spores Bioluminescents",
    levelRequired: 10,
    materialId: "spores_luminescents",
    guardianId: "myconid_guard",
    yield: 2,
    xp: 55,
    points: 4,
    reactionWindow: 2.4,
    failToxicity: 20,
    attemptToxicity: 6,
    drifting: false,
    x: 72,
    y: 86,
    accent: "#5eead4",
  },
  {
    id: "royal_fungus",
    tier: 3,
    name: "Fongus Toxique Royal",
    levelRequired: 20,
    materialId: "fongus_toxique",
    guardianId: "spectral_myconid",
    yield: 1,
    xp: 130,
    points: 5,
    reactionWindow: 1.6,
    failToxicity: 35,
    attemptToxicity: 10,
    drifting: true,
    x: 50,
    y: 44,
    accent: "#c084fc",
  },
];

export const NODE_BY_ID: Record<string, GatheringNodeDef> = Object.fromEntries(
  GATHERING_NODES.map((n) => [n.id, n])
);

/** A node is exhausted after this many harvests, then recharges. */
export const HARVESTS_PER_NODE = 3;
export const NODE_RECHARGE_MS = 5 * 60 * 1000;
/** Chance per attempt that the node's guardian wakes up. */
export const GUARDIAN_CHANCE = 0.2;

/* --------------------------------------------------------------------------- toxicity + sickle */

export const MAX_TOXICITY = 100;
/** Passive build-up just from breathing the cave's air. */
export const TOXICITY_PER_SECOND = 1;
export const SICKLE_MAX_DURABILITY = 40;
export const SICKLE_REPAIR_COST = 60;

const STORAGE_KEY = "pixelrmmo:gathering";

export interface NodeState {
  /** Harvests taken since the node last recharged. */
  harvests: number;
  /** Wall-clock ms the node became exhausted, or 0 while it still has charges. */
  exhaustedAt: number;
}

export interface GatheringState {
  sickleDurability: number;
  nodes: Record<string, NodeState>;
}

const DEFAULT_STATE: GatheringState = { sickleDurability: SICKLE_MAX_DURABILITY, nodes: {} };

export function getGatheringState(): GatheringState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw) as Partial<GatheringState>;
    return {
      sickleDurability: typeof parsed.sickleDurability === "number" ? parsed.sickleDurability : SICKLE_MAX_DURABILITY,
      nodes: parsed.nodes ?? {},
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function write(state: GatheringState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Exhausted nodes come back on their own once NODE_RECHARGE_MS has elapsed — settled on read, the
 * same shape energy.ts uses for key recharge, so nothing has to tick a timer to make it happen. */
export function getNodeState(nodeId: string, now: number = Date.now()): NodeState {
  const state = getGatheringState();
  const node = state.nodes[nodeId] ?? { harvests: 0, exhaustedAt: 0 };
  if (node.exhaustedAt > 0 && now - node.exhaustedAt >= NODE_RECHARGE_MS) {
    return { harvests: 0, exhaustedAt: 0 };
  }
  return node;
}

export function isNodeReady(nodeId: string, now: number = Date.now()): boolean {
  return getNodeState(nodeId, now).exhaustedAt === 0;
}

export function msUntilNodeReady(nodeId: string, now: number = Date.now()): number {
  const node = getNodeState(nodeId, now);
  return node.exhaustedAt === 0 ? 0 : Math.max(0, NODE_RECHARGE_MS - (now - node.exhaustedAt));
}

/** Spends one durability point and one node charge. Called once per attempt, win or lose — a botched
 * cut still blunts the blade and still damages the mushroom. */
export function consumeAttempt(nodeId: string, now: number = Date.now()): void {
  const state = getGatheringState();
  state.sickleDurability = Math.max(0, state.sickleDurability - 1);
  const node = getNodeState(nodeId, now);
  const harvests = node.harvests + 1;
  state.nodes[nodeId] =
    harvests >= HARVESTS_PER_NODE ? { harvests, exhaustedAt: now } : { harvests, exhaustedAt: 0 };
  write(state);
}

export function repairSickle(): boolean {
  if (!spendEcus(SICKLE_REPAIR_COST)) return false;
  const state = getGatheringState();
  state.sickleDurability = SICKLE_MAX_DURABILITY;
  write(state);
  return true;
}

/* --------------------------------------------------------------------------------- harvesting */

export interface HarvestOutcome {
  materialId: string;
  amount: number;
  xp: number;
  perfect: boolean;
}

/** Banks a successful cut. A perfect run (every point hit) yields +50% material and double XP. */
export function grantHarvest(node: GatheringNodeDef, perfect: boolean): HarvestOutcome {
  const amount = perfect ? Math.ceil(node.yield * 1.5) : node.yield;
  const xp = perfect ? node.xp * 2 : node.xp;
  addOwned("material", node.materialId, amount);
  applyRewards({ xp });
  return { materialId: node.materialId, amount, xp, perfect };
}

export function nodeMaterial(node: GatheringNodeDef) {
  return MATERIAL_BY_ID[node.materialId];
}

export function nodeGuardian(node: GatheringNodeDef) {
  return MONSTER_BY_ID[node.guardianId];
}

/* ------------------------------------------------------------------------------- node sprites */

const nodeModules = import.meta.glob("../assets/gathering/nodes/*.png", { eager: true, import: "default" }) as Record<
  string,
  string
>;

export function nodeSprite(tier: NodeTier): string {
  const entry = Object.entries(nodeModules).find(([p]) => p.endsWith(`/node-t${tier}.png`));
  return entry?.[1] ?? "";
}

export const CAVE_BACKGROUND = "/assets/gathering/mushroom_cave_bg.png";
export const CAVE_ASPECT = 384 / 680;

/* ------------------------------------------------------------------------------- purifiers */

/** The Remède already in items.ts doubles as the cave's purifier rather than a new consumable —
 * "clears what is poisoning you" is the same fiction, and it keeps one item to balance instead of
 * two that overlap. */
export const PURIFIER_ID = "remedy";
export const PURIFIER_RELIEF = 30;

export function purifierCount(): number {
  return getInventory().ownedConsumables[PURIFIER_ID] ?? 0;
}

/** Consumes one purifier. Returns how much toxicity it clears, or 0 if none were held. */
export function consumePurifier(): number {
  if (!removeOwned("consumable", PURIFIER_ID, 1)) return 0;
  return PURIFIER_RELIEF;
}
