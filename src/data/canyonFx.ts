/**
 * The Canyons Écarlates' shared ambient sprite pack. Lives in `/public/assets/worldmap/` rather than
 * `src/assets` + `import.meta.glob` — the one deliberate exception this codebase already makes for
 * the World Map's own continent art — because these frames have TWO consumers (the world-map node's
 * overlay AND the interior mining scene's own ambience) and a plain public URL list is simpler to
 * share between two files than duplicating an eager glob in each. Frame 0 is always the original
 * static generation; frames 1+ are the animated ones from `animate_image`.
 */
function frames(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `/assets/worldmap/${prefix}-${i}.png`);
}

export const DUST_DEVIL_FRAMES = frames("canyon_dust_devil", 5);
export const VULTURE_SHADOW_FRAMES = frames("canyon_vulture_shadow", 5);
export const ORE_SPARKLE_FRAMES = frames("ore_sparkle", 5);
export const ROCK_FALL_FRAMES = frames("canyon_rock_fall", 5);
