export interface Star {
  x: number;
  y: number;
  size: number;
  dur: number;
  delay: number;
  min: number;
  max: number;
}

/** Small deterministic PRNG (mulberry32) so the star field is stable across re-renders. */
function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateStars(count: number, seed = 1337): Star[] {
  const random = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    x: random() * 1600,
    y: random() * 460,
    size: random() < 0.15 ? 3 : 2,
    dur: 2 + random() * 3,
    delay: random() * 4,
    min: 0.15 + random() * 0.25,
    max: 0.7 + random() * 0.3,
  }));
}
