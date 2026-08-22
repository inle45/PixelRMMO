import { addOwned, applyRewards, spendEcus, getInventory } from "./inventory";
import { MONSTER_BY_ID } from "./bestiary";

/**
 * La Lisière Sylvestre — the camp's left-hand panel, and the game's fourth gathering loop.
 *
 * A fourth zone needs a fourth *pressure model*, not a reskin of an existing one. The cave punishes
 * lingering (toxicity on a clock), the lake punishes failure outright (bait is spent on the cast),
 * the canyon punishes a bad strike specifically (rebound wear). The forest punishes **rhythm**: a
 * tree is felled over several consecutive chops and every chop has to land inside a shrinking beat
 * window. Miss one and the combo resets to zero — the axe wear is trivial, the cost is that the
 * tree you were three chops into is suddenly five chops away again.
 *
 * The other reason this loop matters is economic: it is the *only* source of the animal feed the
 * Domaine d'Élevage runs on. Logs are the headline drop, but the seeds/roots/acorns that fall
 * alongside them are what keep the barn's troughs full, which is what ties the camp's left panel to
 * its right one rather than leaving each a closed loop.
 */

export type TreeTier = 1 | 2 | 3;

export interface TreeDrop {
  materialId: string;
  chance: number;
  qty: number;
}

export interface TreeDef {
  id: string;
  tier: TreeTier;
  name: string;
  levelRequired: number;
  guardianId: string;
  /** Chops needed to fell the tree. Each one has to land in the beat window. */
  chopsToFell: number;
  /** Seconds for one sweep of the rhythm marker. Tightens per tier. */
  beatDuration: number;
  /** Half-width of the "on beat" window, as a percentage of the sweep. */
  beatWindow: number;
  drops: TreeDrop[];
  xp: number;
  x: number;
  y: number;
  accent: string;
}

/**
 * Tuning note: because a missed beat resets the combo to ZERO, the difficulty of a tier is
 * `hitRate ^ chopsToFell`, not the window width on its own — the two compound hard. The first pass
 * (4/6/8 chops at 15/11/8% half-windows) made even tier 1 essentially unfellable: a headless test
 * that mashed the button 40 times never once strung together a full run, because 4 consecutive hits
 * at a 30%-of-cycle window is under 1% per attempt. These numbers are pitched at a player who is
 * actually watching the marker (~85% hit rate), which puts a tier-3 run around 45% and a tier-1 run
 * near certain, while random mashing still gets nowhere.
 *
 * Every tier's *prestige* line is a chance roll on top of a guaranteed bulk line — the rule both
 * earlier gathering zones had to be corrected on, applied from the start here. T2 and T3 also
 * restock the tier below them (acorns off the oak, ash logs off the ironwood) so the tiers chain
 * instead of each being a closed loop.
 */
export const TREES: TreeDef[] = [
  {
    id: "young_ash",
    tier: 1,
    name: "Jeune Frêne",
    levelRequired: 1,
    guardianId: "bark_weaver_spider",
    chopsToFell: 3,
    beatDuration: 1.9,
    beatWindow: 22,
    drops: [
      { materialId: "buche_frene", chance: 100, qty: 2 },
      { materialId: "graines_sauvages", chance: 70, qty: 3 },
      { materialId: "herbe_tendre", chance: 55, qty: 2 },
      { materialId: "racines_comestibles", chance: 40, qty: 2 },
    ],
    xp: 22,
    x: 33,
    y: 82,
    accent: "#86efac",
  },
  {
    id: "knotted_oak",
    tier: 2,
    name: "Chêne Noueux",
    levelRequired: 10,
    guardianId: "trunk_hornet",
    chopsToFell: 4,
    beatDuration: 1.5,
    beatWindow: 16,
    drops: [
      { materialId: "buche_chene", chance: 100, qty: 2 },
      { materialId: "glands", chance: 80, qty: 3 },
      { materialId: "ecorces_tendres", chance: 60, qty: 2 },
      { materialId: "fourrage", chance: 45, qty: 2 },
      { materialId: "seve_ambree", chance: 30, qty: 1 },
    ],
    xp: 65,
    x: 50,
    y: 88,
    accent: "#fbbf24",
  },
  {
    id: "ancient_ironwood",
    tier: 3,
    name: "Bois de Fer Ancestral",
    levelRequired: 20,
    guardianId: "corrupted_treant",
    chopsToFell: 5,
    beatDuration: 1.15,
    beatWindow: 11,
    drops: [
      { materialId: "buche_chene", chance: 100, qty: 2 },
      { materialId: "buche_bois_fer", chance: 35, qty: 1 },
      { materialId: "fruits_ambre", chance: 40, qty: 2 },
      { materialId: "seve_petrifiee", chance: 18, qty: 1 },
    ],
    xp: 150,
    x: 67,
    y: 78,
    accent: "#c084fc",
  },
];

export const TREE_BY_ID: Record<string, TreeDef> = Object.fromEntries(TREES.map((t) => [t.id, t]));

/** A run in which every single chop landed on the beat. Same reward shape as the other zones: a
 * flat bonus to every drop line's odds plus a quantity multiplier, so playing well buys better
 * odds on the rare line rather than just more bulk. */
export const PERFECT_CHANCE_BONUS = 15;
export const PERFECT_YIELD_MULT = 1.5;

/** Rolled once per felled tree — the axe blows are what wake whatever lives in the branches. */
export const AMBUSH_CHANCE = 0.15;

export const FELLS_PER_TREE = 3;
export const TREE_REGROW_MS = 5 * 60 * 1000;

export const AXE_MAX_DURABILITY = 40;
export const AXE_REPAIR_COST = 65;

const STORAGE_KEY = "pixelrmmo:woodcutting";

export interface TreeState {
  fells: number;
  cutAt: number;
}

export interface WoodcuttingState {
  axeDurability: number;
  trees: Record<string, TreeState>;
}

const DEFAULT_STATE: WoodcuttingState = { axeDurability: AXE_MAX_DURABILITY, trees: {} };

export function getWoodcuttingState(): WoodcuttingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const p = JSON.parse(raw) as Partial<WoodcuttingState>;
    return {
      axeDurability: typeof p.axeDurability === "number" ? p.axeDurability : AXE_MAX_DURABILITY,
      trees: p.trees ?? {},
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function write(state: WoodcuttingState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Settled on read against elapsed regrowth, the same shape as every other node cooldown here. */
export function getTreeState(treeId: string, now: number = Date.now()): TreeState {
  const state = getWoodcuttingState();
  const t = state.trees[treeId] ?? { fells: 0, cutAt: 0 };
  if (t.cutAt > 0 && now - t.cutAt >= TREE_REGROW_MS) return { fells: 0, cutAt: 0 };
  return t;
}

export function msUntilRegrown(treeId: string, now: number = Date.now()): number {
  const t = getTreeState(treeId, now);
  return t.cutAt === 0 ? 0 : Math.max(0, TREE_REGROW_MS - (now - t.cutAt));
}

/** Spends one axe point and one of the tree's charges. Called once per felled tree, not per chop —
 * the rhythm mini-game's own failure mode (a reset combo) is the cost of a missed beat, so charging
 * durability per swing on top of it would punish the same mistake twice. */
export function consumeFell(treeId: string, now: number = Date.now()): void {
  const state = getWoodcuttingState();
  state.axeDurability = Math.max(0, state.axeDurability - 1);
  const t = getTreeState(treeId, now);
  const fells = t.fells + 1;
  state.trees[treeId] = fells >= FELLS_PER_TREE ? { fells, cutAt: now } : { fells, cutAt: 0 };
  write(state);
}

export function repairAxe(): boolean {
  if (!spendEcus(AXE_REPAIR_COST)) return false;
  const state = getWoodcuttingState();
  state.axeDurability = AXE_MAX_DURABILITY;
  write(state);
  return true;
}

export interface FellOutcome {
  granted: { materialId: string; amount: number }[];
  xp: number;
  perfect: boolean;
}

export function grantWood(tree: TreeDef, perfect: boolean): FellOutcome {
  const granted: { materialId: string; amount: number }[] = [];
  for (const drop of tree.drops) {
    const chance = perfect ? Math.min(100, drop.chance + PERFECT_CHANCE_BONUS) : drop.chance;
    if (Math.random() * 100 >= chance) continue;
    const amount = perfect ? Math.ceil(drop.qty * PERFECT_YIELD_MULT) : drop.qty;
    addOwned("material", drop.materialId, amount);
    granted.push({ materialId: drop.materialId, amount });
  }
  const xp = perfect ? tree.xp * 2 : tree.xp;
  applyRewards({ xp });
  return { granted, xp, perfect };
}

export function treeGuardian(tree: TreeDef) {
  return MONSTER_BY_ID[tree.guardianId];
}

export function canChop(tree: TreeDef, now: number = Date.now()): string | null {
  if (getInventory().level < tree.levelRequired) return `Niveau ${tree.levelRequired} requis.`;
  if (getWoodcuttingState().axeDurability <= 0) return "Hache émoussée — réparez-la avant de couper.";
  if (getTreeState(tree.id, now).cutAt !== 0) return "Cet arbre repousse.";
  return null;
}

/* ------------------------------------------------------------------------------- tree sprites */

const treeModules = import.meta.glob("../assets/gathering/nodes/tree-*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

export function treeSprite(tier: TreeTier): string {
  const entry = Object.entries(treeModules).find(([p]) => p.endsWith(`/tree-t${tier}.png`));
  return entry?.[1] ?? "";
}
