const STORAGE_KEY = "pixelrmmo:worldstate";

export interface WorldState {
  currentNodeId: string;
  unlockedNodeIds: string[];
  /** Node ids whose arrival dialogue has already played once — first-visit only after this. */
  seenDialogueNodeIds: string[];
}

/** Nodes that are open to everyone from the start — the camp, the crypt entrance, the city and the
 * mushroom cave; the volcano and everything past it stay behind the fog for a future content drop.
 *
 * This is merged into whatever is stored on every read (see `readRaw`), not just used to seed a
 * fresh save. Without that, adding a starter node only ever reaches *new* players: an existing
 * save was written with the old list and would keep showing the new zone as locked forever, which
 * is exactly what happened when the cave was added. Any future starter location added here reaches
 * existing saves for free. */
const ALWAYS_UNLOCKED = ["campement", "crypte", "cite", "mushroom_cave", "crater_lake"];

const DEFAULT_STATE: WorldState = {
  currentNodeId: "campement",
  unlockedNodeIds: [...ALWAYS_UNLOCKED],
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
      // Union, so a save made before a starter node existed still sees it, while everything the
      // player unlocked by actually travelling there is preserved.
      unlockedNodeIds: [...new Set([...ALWAYS_UNLOCKED, ...parsed.unlockedNodeIds])],
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
