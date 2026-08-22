import { BATTLE_ITEM_BY_ID, type MealBuff } from "./items";
import { removeOwned } from "./inventory";

const STORAGE_KEY = "pixelrmmo:meals";

/**
 * Timed food buffs.
 *
 * Persisted with an absolute expiry rather than a ticking countdown, and settled on read — the same
 * shape `energy.ts` (key recharge) and `gathering.ts` (toxicity decay) already use, so a buff keeps
 * running while the tab is closed and expires on its own without anything having to be awake.
 *
 * Only ONE meal is active at a time: eating a second one replaces the first. That is a design call,
 * not a limitation — stacking three timed buffs would make the Festin's +25 % max HP additive with
 * everything else and turn cooking into a mandatory pre-dungeon checklist rather than a choice.
 */
export interface ActiveMeal {
  itemId: string;
  expiresAt: number;
}

function read(): ActiveMeal | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActiveMeal>;
    if (!parsed.itemId || typeof parsed.expiresAt !== "number") return null;
    return { itemId: parsed.itemId, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

/** The meal still in effect, or null. Expiry is applied here, so callers never see a stale buff. */
export function getActiveMeal(now: number = Date.now()): ActiveMeal | null {
  const meal = read();
  if (!meal || meal.expiresAt <= now) return null;
  return meal;
}

export function getActiveMealBuff(now: number = Date.now()): MealBuff | null {
  const meal = getActiveMeal(now);
  return meal ? BATTLE_ITEM_BY_ID[meal.itemId]?.buff ?? null : null;
}

export function msUntilMealExpires(now: number = Date.now()): number {
  const meal = getActiveMeal(now);
  return meal ? Math.max(0, meal.expiresAt - now) : 0;
}

/** Eats one copy from the bag and starts its timer. Returns false if none is held or the item
 * isn't actually a meal. */
export function eatMeal(itemId: string, now: number = Date.now()): boolean {
  const item = BATTLE_ITEM_BY_ID[itemId];
  if (!item?.buff) return false;
  if (!removeOwned("consumable", itemId, 1)) return false;
  const active: ActiveMeal = { itemId, expiresAt: now + item.buff.durationMin * 60_000 };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
  return true;
}

export function clearMeal(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Whether the active meal grants immunity to a given status id — read by the battle engine's
 * status-application check so the Festin's poison immunity is real, not flavour text. */
export function mealGrantsImmunity(statusId: string, now: number = Date.now()): boolean {
  return getActiveMealBuff(now)?.immuneTo?.includes(statusId) ?? false;
}
