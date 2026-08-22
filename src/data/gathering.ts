import { addOwned, applyRewards, spendEcus, removeOwned, getInventory } from "./inventory";
import { MONSTER_BY_ID } from "./bestiary";

export type NodeTier = 1 | 2 | 3;

/** One line of a node's harvest table. A node is no longer "cut it, receive its material" — see
 * GATHERING_NODES below for why that had to change. */
export interface NodeDrop {
  materialId: string;
  /** Percent chance this line lands on a successful cut. */
  chance: number;
  /** Units granted when it does. A perfect cut multiplies this by 1.5 (rounded up). */
  qty: number;
}

export interface GatheringNodeDef {
  id: string;
  tier: NodeTier;
  name: string;
  /** Minimum hero level. Below it the node can be inspected but not harvested. */
  levelRequired: number;
  /** The node's headline material — what the pin is named after and what the Codex links to. It is
   * NOT necessarily what a given cut yields; `drops` is the actual table. */
  materialId: string;
  /** Bestiary id of the guardian this tier can wake. */
  guardianId: string;
  /** What a successful cut actually rolls for. */
  drops: NodeDrop[];
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

/**
 * Three nodes, one per tier, laid out on the two cavern floors of `mushroom_cave_bg.png`: the two
 * easy ones on the near (lower) ledge, the royal one deeper in on the upper ledge.
 *
 * EVERY TIER'S HEADLINE MATERIAL IS A CHANCE ROLL, NOT A GUARANTEE. The first version handed the
 * node's material over on every successful cut, which made an "Épique" Fongus Toxique something you
 * printed 100% of the time — the rarity badge was a lie, and the player said so directly ("soit ce
 * matériaux tu le rend épique par sa rareté et son taux de drop soit tu baisse sa rareté"). Rather
 * than demote the tiers, each node now yields its *bulk* material reliably and its prestige material
 * on a roll whose odds are pitched at the rarity: ~45% for a Rare, ~20% for an Épique. That also
 * chains the tiers together (T3 restocks T2's spores) instead of each node being a closed loop.
 */
export const GATHERING_NODES: GatheringNodeDef[] = [
  {
    id: "moss_caps",
    tier: 1,
    name: "Chapeaux de Mousse",
    levelRequired: 1,
    materialId: "mousse_caverne",
    guardianId: "fungal_larva",
    // Commun, so it stays guaranteed — the rarity and the drop rate agree here already.
    drops: [{ materialId: "mousse_caverne", chance: 100, qty: 2 }],
    xp: 20,
    points: 3,
    reactionWindow: 2.0,
    failToxicity: 10,
    attemptToxicity: 5,
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
    drops: [
      { materialId: "mousse_caverne", chance: 100, qty: 1 },
      { materialId: "spores_luminescents", chance: 45, qty: 1 },
    ],
    xp: 55,
    points: 4,
    reactionWindow: 1.6,
    failToxicity: 20,
    attemptToxicity: 9,
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
    drops: [
      { materialId: "spores_luminescents", chance: 100, qty: 1 },
      { materialId: "fongus_toxique", chance: 20, qty: 1 },
    ],
    xp: 130,
    points: 5,
    reactionWindow: 1.15,
    failToxicity: 35,
    attemptToxicity: 14,
    drifting: true,
    x: 50,
    y: 44,
    accent: "#c084fc",
  },
];

/** Flat bonus added to every drop line's chance on a perfect cut — the real reward for playing the
 * mini-game well is *better odds on the prestige material*, not just more of the bulk one. */
export const PERFECT_CHANCE_BONUS = 15;

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
/**
 * Real time spent OUTSIDE the cave that clears one point of toxicity — a full 100% takes 10 minutes
 * to breathe off.
 *
 * This exists because toxicity used to live only in `MushroomCaveScene`'s `useState(0)`, so walking
 * out and straight back in was a free, instant, unlimited purge. That single hole is what made the
 * zone farmable forever regardless of any per-cut tuning: no toxicity cost is a real cost if the
 * player can zero it at will. Persisted + settled on read, the same shape `energy.ts` uses for key
 * recharge, so leaving to detox now costs exactly what it should — time.
 */
export const TOXICITY_DECAY_MS_PER_POINT = 6000;
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
  /** Toxicity as of `toxicityAt`; read it through `getToxicity()`, never raw. */
  toxicity: number;
  toxicityAt: number;
}

const DEFAULT_STATE: GatheringState = {
  sickleDurability: SICKLE_MAX_DURABILITY,
  nodes: {},
  toxicity: 0,
  toxicityAt: 0,
};

export function getGatheringState(): GatheringState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw) as Partial<GatheringState>;
    return {
      sickleDurability: typeof parsed.sickleDurability === "number" ? parsed.sickleDurability : SICKLE_MAX_DURABILITY,
      nodes: parsed.nodes ?? {},
      toxicity: typeof parsed.toxicity === "number" ? parsed.toxicity : 0,
      toxicityAt: typeof parsed.toxicityAt === "number" ? parsed.toxicityAt : 0,
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

/* ------------------------------------------------------------------------------ toxicity state */

/** Pure read: the stored value with elapsed out-of-cave decay applied. Safe to call every tick. */
export function getToxicity(now: number = Date.now()): number {
  const state = getGatheringState();
  if (state.toxicityAt === 0) return state.toxicity;
  const decayed = Math.floor((now - state.toxicityAt) / TOXICITY_DECAY_MS_PER_POINT);
  return Math.max(0, Math.min(MAX_TOXICITY, state.toxicity - decayed));
}

/** The only writer. Clamps, and stamps `now` so decay is measured from this moment. */
export function setToxicity(value: number, now: number = Date.now()): number {
  const state = getGatheringState();
  const clamped = Math.max(0, Math.min(MAX_TOXICITY, value));
  write({ ...state, toxicity: clamped, toxicityAt: now });
  return clamped;
}

export function msUntilToxicityClear(now: number = Date.now()): number {
  return getToxicity(now) * TOXICITY_DECAY_MS_PER_POINT;
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
  /** Only the drop lines that actually landed — can be empty in the (rare) case every roll misses. */
  granted: { materialId: string; amount: number }[];
  xp: number;
  perfect: boolean;
}

/** Banks a successful cut by rolling the node's own drop table. A perfect run (every vital point
 * struck) both raises each line's odds by PERFECT_CHANCE_BONUS and grants +50% quantity, plus
 * double XP. */
export function grantHarvest(node: GatheringNodeDef, perfect: boolean): HarvestOutcome {
  const granted: { materialId: string; amount: number }[] = [];
  for (const drop of node.drops) {
    const chance = perfect ? Math.min(100, drop.chance + PERFECT_CHANCE_BONUS) : drop.chance;
    if (Math.random() * 100 >= chance) continue;
    const amount = perfect ? Math.ceil(drop.qty * 1.5) : drop.qty;
    addOwned("material", drop.materialId, amount);
    granted.push({ materialId: drop.materialId, amount });
  }
  const xp = perfect ? node.xp * 2 : node.xp;
  applyRewards({ xp });
  return { granted, xp, perfect };
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
