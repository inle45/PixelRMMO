const STORAGE_KEY = "pixelrmmo:worldstate";

export interface WorldState {
  currentNodeId: string;
  unlockedNodeIds: string[];
  /** Node ids whose arrival dialogue has already played once — first-visit only after this. */
  seenDialogueNodeIds: string[];
}

/** The camp, the crypt entrance and the city all ship pre-unlocked (biomes 1/5/6 — the starting
 * valley); the volcano and everything past it stay behind the fog for a future content drop. */
const DEFAULT_STATE: WorldState = {
  currentNodeId: "campement",
  unlockedNodeIds: ["campement", "crypte", "cite", "mushroom_cave"],
  seenDialogueNodeIds: [],
};

function readRaw(): WorldState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<WorldState>;
    if (!parsed.currentNodeId || !Array.isArray(parsed.unlockedNodeIds) || !Array.isArray(parsed.seenDialogueNodeIds)) {
      return DEFAULT_STATE;
    }
    return {
      currentNodeId: parsed.currentNodeId,
      unlockedNodeIds: parsed.unlockedNodeIds,
      seenDialogueNodeIds: parsed.seenDialogueNodeIds,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function write(state: WorldState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getWorldState(): WorldState {
  return readRaw();
}

export function isNodeUnlocked(nodeId: string): boolean {
  return readRaw().unlockedNodeIds.includes(nodeId);
}

/** Moves the hero to `nodeId`, unlocking it permanently if this is a first arrival. */
export function travelToNode(nodeId: string): WorldState {
  const state = readRaw();
  const next: WorldState = {
    ...state,
    currentNodeId: nodeId,
    unlockedNodeIds: state.unlockedNodeIds.includes(nodeId) ? state.unlockedNodeIds : [...state.unlockedNodeIds, nodeId],
  };
  write(next);
  return next;
}

export function hasSeenDialogue(nodeId: string): boolean {
  return readRaw().seenDialogueNodeIds.includes(nodeId);
}

export function markDialogueSeen(nodeId: string): void {
  const state = readRaw();
  if (state.seenDialogueNodeIds.includes(nodeId)) return;
  write({ ...state, seenDialogueNodeIds: [...state.seenDialogueNodeIds, nodeId] });
}
