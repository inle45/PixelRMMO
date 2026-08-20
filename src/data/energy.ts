const STORAGE_KEY = "pixelrmmo:keys";

export const MAX_KEYS = 5;
export const KEY_RECHARGE_MS = 15 * 60 * 1000;

export interface KeyState {
  count: number;
  /** Wall-clock timestamp the current unspent recharge window started counting from. */
  lastUpdate: number;
}

function readRaw(): KeyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: MAX_KEYS, lastUpdate: Date.now() };
    const parsed = JSON.parse(raw) as Partial<KeyState>;
    if (typeof parsed.count !== "number" || typeof parsed.lastUpdate !== "number") {
      return { count: MAX_KEYS, lastUpdate: Date.now() };
    }
    return { count: parsed.count, lastUpdate: parsed.lastUpdate };
  } catch {
    return { count: MAX_KEYS, lastUpdate: Date.now() };
  }
}

function write(state: KeyState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Applies any recharge ticks owed since lastUpdate, capping at MAX_KEYS. Pure — does not persist. */
function settle(state: KeyState, now: number): KeyState {
  if (state.count >= MAX_KEYS) return { count: MAX_KEYS, lastUpdate: now };
  const elapsed = now - state.lastUpdate;
  const gained = Math.floor(elapsed / KEY_RECHARGE_MS);
  if (gained <= 0) return state;
  const count = Math.min(MAX_KEYS, state.count + gained);
  const lastUpdate = count >= MAX_KEYS ? now : state.lastUpdate + gained * KEY_RECHARGE_MS;
  return { count, lastUpdate };
}

/** Current key count with any owed recharge applied, without writing to storage — safe to call every tick. */
export function getSettledKeyState(now: number = Date.now()): KeyState {
  return settle(readRaw(), now);
}

export function msUntilNextKey(now: number = Date.now()): number {
  const state = getSettledKeyState(now);
  if (state.count >= MAX_KEYS) return 0;
  const elapsed = (now - state.lastUpdate) % KEY_RECHARGE_MS;
  return KEY_RECHARGE_MS - elapsed;
}

/** Consumes 1 key if available, persisting the settled+decremented state. Returns null if none to spend. */
export function consumeKey(now: number = Date.now()): KeyState | null {
  const settled = getSettledKeyState(now);
  if (settled.count < 1) return null;
  const next: KeyState = {
    count: settled.count - 1,
    lastUpdate: settled.count >= MAX_KEYS ? now : settled.lastUpdate,
  };
  write(next);
  return next;
}
