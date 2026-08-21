import rawConfig from "../config/campConfig.json";
import type { TimeOfDayId } from "../hooks/useTimeOfDay";

/** A placed entity's stage coordinates. x/y are percentages of the stage box; the sprite is anchored
 * bottom-center at (x, y) via `translate(-50%, -100%)`, so y is where its feet touch the ground.
 * `width` is the sprite's rendered width, also as a percentage of stage width, which is what keeps
 * everything scaling together when the stage is responsive rather than a fixed pixel canvas. */
export interface Placement {
  x: number;
  y: number;
  width: number;
}

export interface ShadowPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}

export interface PeriodLayout {
  hero: Placement;
  shadow: ShadowPlacement;
  props: Record<string, Placement>;
}

export type CampConfig = Record<TimeOfDayId, PeriodLayout>;

export const CAMP_CONFIG = rawConfig as CampConfig;

/* ------------------------------------------------------------------ assets */

const bgModules = import.meta.glob("../assets/camp/bg/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const heroModules = import.meta.glob("../assets/camp/hero/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const propModules = import.meta.glob("../assets/camp/props/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const uiModules = import.meta.glob("../assets/camp/ui/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function getSingle(modules: Record<string, string>, name: string): string {
  const entry = Object.entries(modules).find(([path]) => path.endsWith(`/${name}.png`));
  return entry?.[1] ?? "";
}

/** Collects `{prefix}-0.png, {prefix}-1.png, ...` in numeric order, stopping at the first gap —
 * the same glob-by-numbered-suffix convention as classes.ts/bestiary.ts. Numbered from 0 because
 * animate_image's frame 0 IS the original static sprite, so the static and the loop's first frame
 * are the same file rather than a duplicated asset. */
function getFrames(modules: Record<string, string>, prefix: string): string[] {
  const frames: string[] = [];
  for (let i = 0; ; i += 1) {
    const entry = Object.entries(modules).find(([path]) => path.endsWith(`/${prefix}-${i}.png`));
    if (!entry) break;
    frames.push(entry[1]);
  }
  return frames;
}

export const mapIcon = getSingle(uiModules, "map-compass");

/* ------------------------------------------------------------------- props */

export interface CampProp {
  id: string;
  /** Alt text / calibrator label. */
  label: string;
  frames: string[];
  /** ms per frame — a campfire needs to crackle faster than a flag ripples. */
  frameDuration: number;
}

const PROP_LABELS: Record<string, string> = {
  kettle: "Bouilloire fumante",
  bird: "Oiseau sur le piquet",
  butterflies: "Papillons",
  banner: "Oriflamme",
  lantern: "Lanterne suspendue",
  fireflies: "Lucioles",
  campfire: "Feu de camp",
  torch: "Torche murale",
};

const PROP_FRAME_DURATION: Record<string, number> = {
  kettle: 260,
  bird: 200,
  butterflies: 160,
  banner: 180,
  lantern: 240,
  fireflies: 280,
  campfire: 130,
  torch: 130,
};

/** Which two animated props belong to each period. The stage renders only the active period's
 * pair, so a campfire never shows up at noon. */
export const PERIOD_PROP_IDS: Record<TimeOfDayId, string[]> = {
  morning: ["kettle", "bird"],
  noon: ["butterflies", "banner"],
  sunset: ["lantern", "fireflies"],
  night: ["campfire", "torch"],
};

function buildProp(id: string): CampProp {
  return {
    id,
    label: PROP_LABELS[id] ?? id,
    frames: getFrames(propModules, id),
    frameDuration: PROP_FRAME_DURATION[id] ?? 200,
  };
}

export const PROP_BY_ID: Record<string, CampProp> = Object.fromEntries(
  Object.values(PERIOD_PROP_IDS)
    .flat()
    .map((id) => [id, buildProp(id)])
);

/* ------------------------------------------------------------------ scenes */

export interface CampScene {
  id: TimeOfDayId;
  background: string;
  /** Fills the screen above the backdrop when the viewport is taller than the art's 16:9 box.
   * The bottom stop is sampled from the backdrop's own top row so the join is seamless. */
  skyExtension: string;
  /** That same sampled top-row colour on its own, painted as the stage's base background so any
   * sub-pixel rounding at the join shows the right colour instead of a dark sliver. */
  skySeamColor: string;
  heroFrames: string[];
  /** ms per frame for the hero routine — sleeping breathes slower than sharpening a blade. */
  heroFrameDuration: number;
  props: CampProp[];
  /** Layer 2: the ambient light wash, as a CSS background value (radial/linear gradients). */
  ambientLight: string;
  /** Layer 2b: an extra warm halo that pulses, for the periods with a live flame. Empty = none. */
  flickerLight: string;
  /** Layer 5: the colour-grading pass that harmonises sprite lighting with the backdrop. */
  grading: string;
  /** Extra CSS filter applied to the hero + props so they sit in the same light as the scene. */
  spriteFilter: string;
  /** Short caption shown under the stage describing what the hero is up to. */
  caption: string;
}

const HERO_FRAME_DURATION: Record<TimeOfDayId, number> = {
  morning: 260,
  noon: 200,
  sunset: 240,
  night: 400,
};

const HERO_CAPTION: Record<TimeOfDayId, string> = {
  morning: "Le héros sirote une boisson chaude au lever du jour.",
  noon: "Le héros aiguise sa lame en plein soleil.",
  sunset: "Le héros prépare le repas du soir.",
  night: "Le héros dort à la belle étoile.",
};

/** A phone held upright is roughly 9:18; the backdrops are 16:9. Rather than crop the scene down
 * to its centre third (object-cover on that aspect gap is a ~3x zoom that throws away the tent and
 * half the props) or letterbox it, the backdrop fills the full width anchored to the bottom and the
 * leftover space above is painted as more sky. Each gradient's *last* stop is the exact colour of
 * that backdrop's top pixel row (sampled from the PNG), so there is no visible seam at the join —
 * it reads as open sky above the camp, not as a bar. */
const SKY_SEAM_COLOR: Record<TimeOfDayId, string> = {
  morning: "#e7dccd",
  noon: "#1ad4f8",
  sunset: "#35034e",
  night: "#040421",
};

const SKY_EXTENSION: Record<TimeOfDayId, string> = {
  morning: "linear-gradient(180deg, #b9aab4 0%, #d2c4c4 45%, #e7dccd 100%)",
  noon: "linear-gradient(180deg, #0763c4 0%, #0f9fe4 50%, #1ad4f8 100%)",
  sunset: "linear-gradient(180deg, #150120 0%, #250236 50%, #35034e 100%)",
  night: "linear-gradient(180deg, #01010a 0%, #020317 55%, #040421 100%)",
};

/** Ambient light per period. Morning is a soft low sun from the left, noon a hard white zenith
 * flare, sunset a warm horizon glow, night a cold moon wash the campfire then fights against. */
const AMBIENT_LIGHT: Record<TimeOfDayId, string> = {
  morning:
    "radial-gradient(120% 90% at 68% 22%, rgba(255,214,170,0.34) 0%, rgba(255,196,180,0.14) 38%, transparent 70%)",
  noon:
    "radial-gradient(90% 70% at 50% 0%, rgba(255,252,214,0.42) 0%, rgba(255,247,196,0.16) 40%, transparent 72%)",
  sunset:
    "radial-gradient(110% 80% at 62% 42%, rgba(255,150,74,0.36) 0%, rgba(184,72,120,0.18) 42%, transparent 76%)",
  night:
    "radial-gradient(120% 100% at 50% 8%, rgba(150,180,255,0.16) 0%, rgba(40,58,120,0.12) 45%, transparent 78%)",
};

/** The pulsing half of the lighting — only the two periods with an actual flame in frame get one,
 * anchored roughly over that flame's prop coordinates so the glow reads as coming from the fire. */
const FLICKER_LIGHT: Record<TimeOfDayId, string> = {
  morning: "",
  noon: "",
  sunset:
    "radial-gradient(28% 34% at 36% 74%, rgba(255,178,88,0.5) 0%, rgba(255,150,60,0.2) 45%, transparent 72%)",
  night:
    "radial-gradient(42% 46% at 34% 84%, rgba(255,158,64,0.62) 0%, rgba(255,120,40,0.26) 42%, transparent 74%)",
};

const GRADING: Record<TimeOfDayId, string> = {
  morning: "linear-gradient(180deg, rgba(255,208,178,0.16) 0%, rgba(206,150,168,0.12) 100%)",
  noon: "linear-gradient(180deg, rgba(255,250,225,0.10) 0%, rgba(150,215,255,0.08) 100%)",
  sunset: "linear-gradient(180deg, rgba(255,124,64,0.14) 0%, rgba(78,26,80,0.22) 100%)",
  night: "linear-gradient(180deg, rgba(40,58,130,0.30) 0%, rgba(10,14,40,0.38) 100%)",
};

/** Sprites are drawn at full brightness on a transparent canvas; without this they read as flat
 * cutouts pasted onto a graded scene. Same lesson as the battle arena's sprite-integration pass. */
const SPRITE_FILTER: Record<TimeOfDayId, string> = {
  morning: "drop-shadow(0 3px 5px rgba(0,0,0,0.45)) brightness(1.02) saturate(0.96)",
  noon: "drop-shadow(0 3px 5px rgba(0,0,0,0.5)) brightness(1.06) contrast(1.04) saturate(1.02)",
  sunset: "drop-shadow(0 3px 5px rgba(0,0,0,0.5)) brightness(0.92) sepia(0.18) saturate(1.05)",
  night: "drop-shadow(0 3px 6px rgba(0,0,0,0.6)) brightness(0.7) saturate(0.72) hue-rotate(-8deg)",
};

function buildScene(id: TimeOfDayId): CampScene {
  return {
    id,
    background: getSingle(bgModules, id),
    skyExtension: SKY_EXTENSION[id],
    skySeamColor: SKY_SEAM_COLOR[id],
    heroFrames: getFrames(heroModules, id),
    heroFrameDuration: HERO_FRAME_DURATION[id],
    props: PERIOD_PROP_IDS[id].map((propId) => PROP_BY_ID[propId]),
    ambientLight: AMBIENT_LIGHT[id],
    flickerLight: FLICKER_LIGHT[id],
    grading: GRADING[id],
    spriteFilter: SPRITE_FILTER[id],
    caption: HERO_CAPTION[id],
  };
}

export const CAMP_SCENES: Record<TimeOfDayId, CampScene> = {
  morning: buildScene("morning"),
  noon: buildScene("noon"),
  sunset: buildScene("sunset"),
  night: buildScene("night"),
};
