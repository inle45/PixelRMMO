import { MATERIALS, type MaterialDef } from "./materials";

const STORAGE_KEY = "pixelrmmo:inventory";

export interface InventoryState {
  ecus: number;
  materials: Record<string, number>;
  xp: number;
  level: number;
}

const DEFAULT_STATE: InventoryState = { ecus: 250, materials: {}, xp: 0, level: 1 };

/** Flat curve — 400 XP per level. A demo game doesn't need a tuned escalating curve. */
export const XP_PER_LEVEL = 400;

export function xpIntoLevel(state: Pick<InventoryState, "xp" | "level">): number {
  return state.xp - (state.level - 1) * XP_PER_LEVEL;
}

export function getInventory(): InventoryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE, materials: {} };
    const parsed = JSON.parse(raw) as Partial<InventoryState>;
    return {
      ecus: typeof parsed.ecus === "number" ? parsed.ecus : DEFAULT_STATE.ecus,
      materials: parsed.materials ?? {},
      xp: typeof parsed.xp === "number" ? parsed.xp : 0,
      level: typeof parsed.level === "number" ? parsed.level : 1,
    };
  } catch {
    return { ...DEFAULT_STATE, materials: {} };
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
