import type { TownTimeId } from "../hooks/useTownTimeOfDay";

export type TownZoneId = "forge" | "enchant" | "tavern" | "guard" | "market";

export interface TownZoneDef {
  id: TownZoneId;
  name: string;
  description: string;
  /** Percentage position within the (square) background image — one shared placement across all 4
   * time-of-day variants, same simplification the Camp's storage chest settled on: the 4 backgrounds
   * share a prompt skeleton but aren't pixel-identical compositions, and a precise per-variant
   * calibration tool wasn't asked for here the way CampCalibrator/MapCalibrator were built for their
   * own screens. */
  x: number;
  y: number;
}

export const TOWN_ZONES: TownZoneDef[] = [
  { id: "forge", name: "Grande Forge", description: "Forgez de l'équipement à partir des matériaux de la Crypte.", x: 20, y: 50 },
  { id: "enchant", name: "Atelier d'Enchantement", description: "Améliorez votre équipement forgé avec des matériaux rares.", x: 75, y: 42 },
  { id: "tavern", name: "Auberge du Sanglier Doré", description: "Le coffre de réserve de la cité — partagé avec celui du Campement.", x: 17, y: 28 },
  { id: "guard", name: "Quartier de la Garde", description: "Primes journalières de la garde royale.", x: 85, y: 20 },
  { id: "market", name: "Marché C2C", description: "Achetez et vendez entre mercenaires.", x: 80, y: 58 },
];

export const TOWN_ZONE_BY_ID: Record<TownZoneId, TownZoneDef> = Object.fromEntries(
  TOWN_ZONES.map((z) => [z.id, z])
) as Record<TownZoneId, TownZoneDef>;

/** The fountain sits in the plaza's dead centre in every variant — purely decorative, not a
 * clickable zone, so it isn't part of TOWN_ZONES above. */
export const FOUNTAIN_PLACEMENT = { x: 50, y: 58 };

/** Lives in /public rather than src/assets, same call as the World Map's own continent background
 * and the Camp's storage chest spritesheet — 4 large single-consumer images gain nothing from Vite's
 * import.meta.glob/base64-inlining path. */
export const TOWN_BACKGROUNDS: Record<TownTimeId, string> = {
  dawn: "/assets/town/town_dawn.png",
  day: "/assets/town/town_day.png",
  dusk: "/assets/town/town_dusk.png",
  night: "/assets/town/town_night.png",
};

/* ------------------------------------------------------------------------ animated prop loops */

const animModules = import.meta.glob("../assets/town/animations/*.png", { eager: true, import: "default" }) as Record<
  string,
  string
>;

/** Collects `{prefix}-0.png, {prefix}-1.png, ...` in order, stopping at the first gap — the same
 * glob-by-numbered-suffix convention as classes.ts/bestiary.ts/campScene.ts. */
function getFrames(prefix: string): string[] {
  const frames: string[] = [];
  for (let i = 0; ; i++) {
    const entry = Object.entries(animModules).find(([path]) => path.endsWith(`/${prefix}-${i}.png`));
    if (!entry) break;
    frames.push(entry[1]);
  }
  return frames;
}

export const FORGE_FRAMES = getFrames("forge");
export const FOUNTAIN_FRAMES = getFrames("fountain");
export const BANNER_FRAMES = getFrames("banner");
export const ORB_FRAMES = getFrames("orb");
export const LANTERN_FRAMES = getFrames("lantern");
export const GUARD_FRAMES = getFrames("guard");

/** Which loop decorates each clickable zone's marker — a small reuse map rather than baking the
 * frame array directly into TownZoneDef, since "market" has no animation of its own in the pack and
 * borrows the banner loop (market stalls flying pennants), same "moderate reuse is forgiving at
 * marker scale" call already made for MapNode's Campement/Cité decorations. */
export const ZONE_FRAMES: Record<TownZoneId, string[]> = {
  forge: FORGE_FRAMES,
  enchant: ORB_FRAMES,
  tavern: LANTERN_FRAMES,
  guard: GUARD_FRAMES,
  market: BANNER_FRAMES,
};
