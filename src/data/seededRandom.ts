/** Small deterministic PRNG (mulberry32) — same technique starfield.ts already uses for a stable
 * star field, pulled out standalone here since two new town systems (bounties, market listings) both
 * need "the same random picks all day, different tomorrow" rather than a one-off stable field. */
export function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable integer seed for "today" (local calendar date, not time-of-day) — every session landing
 * on the same date gets the same seed, so daily-rotating content stays identical until midnight, the
 * same determinism weather.ts's own cycle already relies on (there it's a pure function of elapsed
 * ms instead, since weather rotates within a day rather than across days). */
export function dailySeedFor(date: Date = new Date()): number {
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (Math.imul(hash, 31) + key.charCodeAt(i)) | 0;
  return hash >>> 0;
}

/** Picks `count` distinct items from `pool` using `random` — Fisher-Yates partial shuffle. */
export function pickDistinct<T>(pool: T[], count: number, random: () => number): T[] {
  const copy = [...pool];
  const picked: T[] = [];
  for (let i = 0; i < count && copy.length > 0; i++) {
    const idx = Math.floor(random() * copy.length);
    picked.push(copy.splice(idx, 1)[0]);
  }
  return picked;
}
