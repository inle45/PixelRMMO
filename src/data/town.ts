import type { TownTimeId } from "../hooks/useTownTimeOfDay";

export type TownZoneId = "forge" | "enchant" | "tavern" | "guard" | "market";

export interface TownZoneDef {
  id: TownZoneId;
  /** Short label rendered under the pin. The full name lives in the panel's own header — long
   * labels on a 390px-wide screen collide with each other, which is exactly what happened when
   * these read "Auberge du Sanglier Doré" / "Atelier d'Enchantement" in full. */
  label: string;
  name: string;
  /** Percentage position of the pin's CENTRE within the background image. Every one of these was
   * measured against the artwork (hot-pixel clustering for the fires/crystal/water, visual crops for
   * the doors and stalls) rather than eyeballed — see the note on TOWN_BACKGROUND below for why
   * that's now possible at all. */
  x: number;
  y: number;
}

export const TOWN_ZONES: TownZoneDef[] = [
  { id: "guard", label: "Garde", name: "Quartier de la Garde", x: 57, y: 9 },
  { id: "market", label: "Marché", name: "Marché C2C", x: 20, y: 19 },
  { id: "enchant", label: "Enchantement", name: "Atelier d'Enchantement", x: 57.5, y: 37 },
  { id: "forge", label: "Forge", name: "Grande Forge", x: 24, y: 41 },
  { id: "tavern", label: "Auberge", name: "Auberge du Sanglier Doré", x: 79, y: 73 },
];

export const TOWN_ZONE_BY_ID: Record<TownZoneId, TownZoneDef> = Object.fromEntries(
  TOWN_ZONES.map((z) => [z.id, z])
) as Record<TownZoneId, TownZoneDef>;

/**
 * ONE background, not four.
 *
 * The first version generated a separate 512x512 image per time of day, which produced four
 * genuinely *different cities* — the forge, tavern and towers each landed somewhere else in every
 * variant — so no single set of zone coordinates could ever be correct, and every overlaid prop
 * ended up floating over a roof or in the sky. The fix is structural: generate the city once, and
 * express the day cycle purely as CSS colour grading on top (TIME_GRADE below), exactly the way
 * CampStage already layers ambientLight/grading over its own backdrop. One composition means the
 * measured coordinates above stay true at every hour, and it costs one generation instead of four.
 *
 * Portrait (384x680, ~9:16) rather than square, which is what removes the dead sky the square
 * version left above the artwork on a phone: a 9:16 image fills a 9:16 screen with no gap at all.
 * Lives in /public for the same single-large-consumer reason as the World Map's continent art.
 */
export const TOWN_BACKGROUND = "/assets/town/town.png";
export const TOWN_ASPECT = 384 / 680;

export interface TimeGrade {
  /** CSS filter applied to the backdrop image itself. The source art is painted at a fairly dusky
   * neutral, so daytime brightens rather than the other way round. */
  filter: string;
  /** Colour wash laid over the backdrop (plain alpha, not screen — this tints, it doesn't glow). */
  wash: string;
  /** 0-1 multiplier on every light source's glow: invisible at noon, full blast at night. */
  glow: number;
  caption: string;
}

export const TIME_GRADE: Record<TownTimeId, TimeGrade> = {
  dawn: {
    filter: "brightness(1.12) saturate(0.95) contrast(0.98)",
    wash: "linear-gradient(180deg, rgba(255,168,138,0.30) 0%, rgba(255,205,155,0.12) 60%, rgba(255,225,190,0.06) 100%)",
    glow: 0.45,
    caption: "L'aube se lève sur la Cité Royale.",
  },
  day: {
    filter: "brightness(1.28) saturate(1.1) contrast(1.02)",
    wash: "linear-gradient(180deg, rgba(190,225,255,0.12) 0%, rgba(255,250,230,0.05) 100%)",
    glow: 0.12,
    caption: "La Cité Royale grouille de vie en plein jour.",
  },
  dusk: {
    filter: "brightness(0.98) saturate(1.14) contrast(1.02)",
    wash: "linear-gradient(180deg, rgba(255,118,48,0.26) 0%, rgba(150,60,110,0.22) 55%, rgba(70,35,105,0.30) 100%)",
    glow: 0.8,
    caption: "Le crépuscule embrase les toits de la Cité.",
  },
  night: {
    filter: "brightness(0.5) saturate(0.7) contrast(1.06)",
    wash: "linear-gradient(180deg, rgba(14,24,72,0.58) 0%, rgba(10,16,52,0.62) 100%)",
    glow: 1,
    caption: "La Cité dort sous les lanternes.",
  },
};

/**
 * Ambient light sources, anchored to the artwork's *own* painted fires, crystal and lanterns.
 *
 * These are CSS radial gradients on a `screen` blend, not sprites. That is deliberate and is the
 * other half of the fix above: the background already draws a forge fire, a hearth, an arcane
 * crystal, a lantern and a fountain, so pasting 64x64 sprites of those same objects on top could
 * only ever look like a sticker on a painting — which is what it did. Making the light that is
 * already there breathe reads as the scene being alive; adding a second copy of the object does not.
 */
export interface LightSource {
  x: number;
  y: number;
  /** Radius as a percentage of the scene box's width. */
  size: number;
  color: string;
  /** Flame-like sources flicker irregularly; a crystal or water pulses smoothly. */
  kind: "flame" | "pulse";
}

export const LIGHT_SOURCES: LightSource[] = [
  { x: 24.5, y: 41, size: 26, color: "255,150,60", kind: "flame" }, // forge furnace
  { x: 24, y: 76.5, size: 24, color: "255,150,60", kind: "flame" }, // tavern hearth
  { x: 57.5, y: 36, size: 22, color: "150,110,255", kind: "pulse" }, // enchanting crystal
  { x: 85, y: 72, size: 14, color: "255,190,110", kind: "flame" }, // tavern door lantern
  { x: 53, y: 90, size: 18, color: "110,220,255", kind: "pulse" }, // fountain
];

/** The one chimney the artwork already draws smoke from — the animated wisps continue that plume
 * instead of inventing a new one somewhere the art has no chimney. */
export const SMOKE_SOURCE = { x: 32.5, y: 23 };

/** Two guards on patrol in the lower plaza. This is the *only* overlaid sprite kept, because it's
 * the one thing the new artwork genuinely lacks: it has no people in it at all. Both spots were
 * verified against a zoomed crop to be open cobblestone, not a roof or a wall. */
export const GUARD_POSTS = [
  { x: 36, y: 93, flip: false },
  { x: 70, y: 94, flip: true },
];

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

export const GUARD_FRAMES = getFrames("guard");
