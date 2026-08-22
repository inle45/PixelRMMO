import type { TimeOfDayId } from "../hooks/useTimeOfDay";

/**
 * The two new camp panels' scene data — the Lisière Sylvestre (left) and the Domaine d'Élevage
 * (right), either side of the existing Feu de Camp.
 *
 * ONE BACKGROUND PER PANEL, GRADED FOUR WAYS. Each panel ships a single painted backdrop and every
 * time of day is CSS colour grading plus overlay layers on top of it — exactly the call the Cité's
 * rebuild settled on (`town.ts`'s `TIME_GRADE`), and for the same reason: a separately generated
 * night variant puts the barn door, the fence line and every tree trunk somewhere slightly
 * different, so no single set of prop/tree/pen coordinates can stay correct at more than one hour.
 * It was tried here anyway, via img2img off the day art at a high preservation strength, on the
 * theory that starting from the day image would pin the composition — it came back essentially
 * unchanged (and with a stray text artifact baked in), so the two generations were written off and
 * the grading path taken instead. Do not go back to per-period backgrounds.
 *
 * What grading alone cannot do is *add* things the spec asks for at night — stars, lit lanterns,
 * spectral ground mist. Those are overlay layers in `ForestAmbience`/`BarnAmbience`, which the
 * panels needed anyway for their five animated ambience layers each.
 */

export const FOREST_BACKGROUND = "/assets/camp/forest_edge_day_bg.png";
export const BARN_BACKGROUND = "/assets/camp/barn_pasture_day_bg.png";

/** Exact colour of each backdrop's top pixel row, sampled from the PNG with PIL. The sky-extension gradient's final stop and the stage's base background both use it, so the join between painted
 * art and painted-on sky can never flash a seam under sub-pixel rounding. */
export const FOREST_SKY = "#0e2f1c";
export const BARN_SKY = "#5fe0fb";

export interface PanelGrade {
  /** CSS filter applied to the backdrop image itself. */
  filter: string;
  /** Alpha wash laid over the graded image. */
  wash: string;
  /** Gradient painted in the empty band above the scene box; its LAST stop must be `seam`. */
  sky: string;
  /**
   * The backdrop's top pixel row AS RENDERED — i.e. after this period's own `filter` and `wash`.
   *
   * Not the raw sampled colour: the artwork is colour-graded, so matching the raw value leaves a
   * hard band at the join (at night the barn's raw #5fe0fb cyan met a backdrop dimmed to near
   * navy, and the seam read as a bug). These are computed by replaying the CSS filter chain
   * numerically against the sampled top row, then compositing the wash's first stop over it.
   */
  seam: string;
  /** Multiplier on every warm light source in the scene (lanterns, campfire glow, bark glow). */
  glow: number;
}

/** Night is the one period that wraps midnight (21h-06h), which is also exactly the spec's own
 * day/night boundary — so the four `useTimeOfDay` periods already carry it and no second hook is
 * needed, debug override included. */
export const isNightPeriod = (period: TimeOfDayId) => period === "night";

export const FOREST_GRADE: Record<TimeOfDayId, PanelGrade> = {
  morning: {
    filter: "brightness(1.08) saturate(1.05)",
    wash: "linear-gradient(180deg, rgba(255,224,160,0.18) 0%, rgba(255,240,200,0.04) 60%, rgba(0,0,0,0) 100%)",
    sky: `linear-gradient(180deg, #7fb3d5 0%, #b9d9c0 55%, #395235 100%)`,
    seam: "#395235",
    glow: 0.15,
  },
  noon: {
    filter: "brightness(1.15) saturate(1.1) contrast(1.02)",
    wash: "linear-gradient(180deg, rgba(255,250,220,0.12) 0%, rgba(255,255,255,0) 70%)",
    sky: `linear-gradient(180deg, #6ec6f0 0%, #a9d8b8 60%, #284d34 100%)`,
    seam: "#284d34",
    glow: 0,
  },
  sunset: {
    filter: "brightness(0.92) saturate(1.15) sepia(0.18) hue-rotate(-8deg)",
    wash: "linear-gradient(180deg, rgba(255,140,60,0.22) 0%, rgba(120,40,80,0.14) 100%)",
    sky: `linear-gradient(180deg, #f2905a 0%, #a4547a 50%, #45401f 100%)`,
    seam: "#45401f",
    glow: 0.55,
  },
  night: {
    filter: "brightness(0.52) saturate(0.75) contrast(1.08) hue-rotate(-18deg)",
    wash: "linear-gradient(180deg, rgba(14,22,60,0.6) 0%, rgba(6,10,32,0.68) 100%)",
    sky: `linear-gradient(180deg, #05081f 0%, #0a1230 55%, #0a1326 100%)`,
    seam: "#0a1326",
    glow: 1,
  },
};

export const BARN_GRADE: Record<TimeOfDayId, PanelGrade> = {
  morning: {
    filter: "brightness(1.05) saturate(1.05) sepia(0.08)",
    wash: "linear-gradient(180deg, rgba(255,214,150,0.16) 0%, rgba(255,240,210,0.04) 70%)",
    sky: `linear-gradient(180deg, #ffb27a 0%, #9fd9f5 55%, #84e9ee 100%)`,
    seam: "#84e9ee",
    glow: 0.2,
  },
  noon: {
    filter: "brightness(1.12) saturate(1.08)",
    wash: "linear-gradient(180deg, rgba(255,255,240,0.1) 0%, rgba(255,255,255,0) 70%)",
    sky: `linear-gradient(180deg, #3fb8f5 0%, #7fd4fb 60%, #71fdfe 100%)`,
    seam: "#71fdfe",
    glow: 0,
  },
  sunset: {
    filter: "brightness(0.95) saturate(1.2) sepia(0.2) hue-rotate(-10deg)",
    wash: "linear-gradient(180deg, rgba(255,130,50,0.24) 0%, rgba(110,40,90,0.16) 100%)",
    sky: `linear-gradient(180deg, #ff9a4d 0%, #b05a86 45%, #89c7b0 100%)`,
    seam: "#89c7b0",
    glow: 0.6,
  },
  night: {
    filter: "brightness(0.42) saturate(0.65) contrast(1.12) hue-rotate(205deg)",
    wash: "linear-gradient(180deg, rgba(10,16,52,0.62) 0%, rgba(5,8,28,0.7) 100%)",
    sky: `linear-gradient(180deg, #04061a 0%, #080f2c 55%, #2c2633 100%)`,
    seam: "#2c2633",
    glow: 1,
  },
};

/**
 * Warm light sources the artwork already paints, given coordinates so their *own glow* can breathe
 * at dusk and night. Same call as the Cité's `LIGHT_SOURCES`: when the backdrop already draws a
 * lantern, animating the light it casts reads as the scene being alive, while pasting a second
 * lantern sprite on top of the painted one never blends no matter how good the sprite is.
 */
export interface LightSource {
  x: number;
  y: number;
  radius: number;
  color: string;
  /** Flames flicker irregularly; steady sources (moonlit water, glowing fungus) pulse smoothly. */
  flicker: boolean;
}

export const FOREST_LIGHTS: LightSource[] = [
  { x: 14, y: 46, radius: 16, color: "rgba(122,255,160,0.55)", flicker: false },
  { x: 33, y: 62, radius: 12, color: "rgba(122,255,160,0.45)", flicker: false },
  { x: 78, y: 40, radius: 15, color: "rgba(140,230,255,0.4)", flicker: false },
];

export const BARN_LIGHTS: LightSource[] = [
  { x: 22, y: 52, radius: 18, color: "rgba(255,178,80,0.7)", flicker: true },
  { x: 37, y: 58, radius: 14, color: "rgba(255,190,110,0.6)", flicker: true },
  { x: 68, y: 62, radius: 13, color: "rgba(255,178,80,0.5)", flicker: true },
];

/* ------------------------------------------------------------------------------ panel identity */

export type CampPanelId = "forest" | "fire" | "barn";

export interface CampPanelDef {
  id: CampPanelId;
  label: string;
  caption: string;
}

/** South-to-north reading order is left → right, and the pager's index order matches this array. */
export const CAMP_PANELS: CampPanelDef[] = [
  { id: "forest", label: "Lisière Sylvestre", caption: "Le bois attend la hache." },
  { id: "fire", label: "Feu de Camp", caption: "" },
  { id: "barn", label: "Domaine d'Élevage", caption: "La grange s'éveille." },
];
