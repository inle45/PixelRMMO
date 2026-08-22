import { CLASSES, type ClassDefinition, type ClassId, type Gender } from "./classes";

const STORAGE_KEY = "pixelrmmo:hero";

export interface StoredHero {
  classId: ClassId;
  gender: Gender;
}

/**
 * The hero the player confirmed on character-select.
 *
 * This used to be an ~8-line block copy-pasted into whichever screen needed it, on the reasoning
 * that pulling it into `classes.ts` would mix persistence into a pure data file. That reasoning
 * still holds for `classes.ts` — but once a *fourth* screen needed the read (the mushroom cave, so
 * a guardian ambush can build the real hero combatant), a dedicated persistence module alongside
 * `inventory.ts`/`worldState.ts` is the right home for it rather than a fifth copy.
 */
export function readStoredHero(): StoredHero | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredHero;
    return parsed?.classId && parsed?.gender ? parsed : null;
  } catch {
    return null;
  }
}

/** The stored hero already resolved against the class catalog — null if nothing is stored yet or
 * the stored classId no longer exists. */
export function readStoredHeroClass(): { hero: StoredHero; classDef: ClassDefinition } | null {
  const hero = readStoredHero();
  if (!hero) return null;
  const classDef = CLASSES.find((c) => c.id === hero.classId);
  return classDef ? { hero, classDef } : null;
}
