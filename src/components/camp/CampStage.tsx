import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import type { TimeOfDayId } from "../../hooks/useTimeOfDay";
import { CAMP_SCENES, mapIcon, type PeriodLayout, type Placement } from "../../data/campScene";
import { generateStars } from "../background/starfield";
import LoopSprite from "./LoopSprite";
import CampChest, { type ChestVisualState } from "./CampChest";

interface CampStageProps {
  period: TimeOfDayId;
  /** Live layout for this period — the calibrator hands over its in-progress edits, otherwise
   * this is just `CAMP_CONFIG[period]`. */
  layout: PeriodLayout;
  /** Calibrator overlay: centre crosshairs on each placed entity + a ground grid. */
  showGuides?: boolean;
  /** Freezes every frame loop so a sprite can be lined up against the guides. */
  paused?: boolean;
  /** The storage chest's own open/close state machine — owned by CampDayCycle (not this component)
   * since opening it has to show a modal that lives outside this box's own transform, the same
   * reason the World Map button only opens WorldMap from a level above CampStage. Omitted entirely
   * hides the chest (e.g. while the calibrator's guide overlay would otherwise compete for space). */
  chestVisual?: ChestVisualState;
  onChestActivate?: () => void;
  onChestAnimationEnd?: () => void;
}

/** The tent's ground-contact footprint sits in roughly the same spot across all 4 backdrops (they
 * share one prompt skeleton, varying only the lighting) — so unlike hero/props, one placement works
 * for every period rather than needing a per-period entry in campConfig.json. x=25 matches the
 * morning kettle's own x — the scene box overflows the viewport horizontally on a narrow phone (see
 * the SCENE_BOX_STYLE note above), and that prop's x is the documented safe left-side extreme that
 * still stays on screen. */
const CHEST_PLACEMENT: Placement = { x: 28, y: 98, width: 9 };

/** The backdrop's own 16:9 box, pinned to the bottom of the (taller) screen and always spanning the
 * full width. Every sprite coordinate in campConfig.json is a percentage of THIS box, not of the
 * viewport — which is what keeps the calibration valid at any screen aspect: the box and the art
 * inside it scale together, so the hero stays on the log whether it renders 400px or 1900px wide.
 * Two boxes with identical geometry are stacked (one below the ambient-light layer, one above), so
 * the light wash can sit between the backdrop and the hero while both stay in the same space. */
const SCENE_BOX = "pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2";
const SCENE_BOX_STYLE: CSSProperties = {
  aspectRatio: "400 / 224",
  // Width is the larger of "fill the container" and "be tall enough to matter". On a wide desktop
  // the first term wins and the box covers edge to edge, overflowing the top (cropping sky, which
  // is the least important part). On a portrait phone — where 16:9 art in a ~9:18 hole would
  // otherwise shrink to a ~28% strip above a huge flat sky — the second term wins, scaling the
  // scene to ~53% of the height and letting it overflow horizontally instead. 95cqh keeps that
  // horizontal overflow mild enough that the props at x≈24% and x≈78% still stay on screen; going
  // full `object-cover` here would be a ~3x zoom that throws away the tent and half the props.
  width: "max(100cqw, 95cqh)",
};

/** Exactly the gap between the top of the container and the top of the scene box — i.e. how much
 * sky has to be painted in. Deriving it (rather than just spanning the sky layer across the whole
 * container) is what makes the join invisible: a gradient stretched over the full height reaches
 * its final stop at the container's *bottom*, so at the actual seam it is still mid-gradient and
 * lands as a visible horizontal band against the artwork. 0.56 is the art's 224/400 inverse aspect;
 * max(0px, …) keeps it valid on wide screens where the box overflows the top instead. */
const SKY_HEIGHT = "max(0px, calc(100cqh - max(100cqw, 95cqh) * 0.56))";

/** Fixed (not random) so the sky is identical on every render and across reloads. */
const CLOUDS = [
  { top: 8, width: 34, height: 7, blur: 14, duration: 150, delay: 0 },
  { top: 22, width: 26, height: 5, blur: 11, duration: 190, delay: -60 },
  { top: 38, width: 42, height: 8, blur: 18, duration: 230, delay: -140 },
  { top: 54, width: 22, height: 4, blur: 10, duration: 170, delay: -30 },
];

/** Anchors a sprite bottom-centre at its (x, y) percentage of the scene box — so `y` is literally
 * the line where the sprite meets the ground.
 *
 * This has to live on a plain wrapper div with any entrance animation on a *child* motion.div:
 * framer-motion drives the `transform` property itself, so animating `y` on the same element would
 * silently overwrite this translate and leave every sprite hanging from its top edge instead of
 * standing on its feet. (Same collision as a Tailwind `drop-shadow-[...]` class losing to an inline
 * `style.filter` — one CSS property, one owner.) */
function placementStyle(p: Placement): CSSProperties {
  return {
    left: `${p.x}%`,
    top: `${p.y}%`,
    width: `${p.width}%`,
    transform: "translate(-50%, -100%)",
  };
}

export default function CampStage({
  period,
  layout,
  showGuides = false,
  paused = false,
  chestVisual,
  onChestActivate,
  onChestAnimationEnd,
}: CampStageProps) {
  const scene = CAMP_SCENES[period];
  const reduceMotion = useReducedMotion();
  // Seeded so the field is stable across re-renders, same as NightSceneBackground's starfield.
  const stars = useMemo(() => generateStars(60, 90210), []);

  return (
    // `containerType: "size"` is what makes the cqw/cqh units in SCENE_BOX_STYLE resolve against
    // this box rather than the viewport — the scene has to scale to the space above the nav bar,
    // not to the whole screen.
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        imageRendering: "pixelated",
        containerType: "size",
        // Base fill in the join colour, so sub-pixel rounding at the seam can never flash black.
        backgroundColor: scene.skySeamColor,
        transition: "background-color 1s ease",
      }}
    >
      {/* --------------------------------- Layer 0a — sky filling the space above the art */}
      <AnimatePresence>
        <motion.div
          key={`sky-${period}`}
          className="absolute inset-x-0 top-0"
          style={{ height: SKY_HEIGHT, background: scene.skyExtension }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        />
      </AnimatePresence>

      {/* Slow drifting clouds keep the daytime sky extension from reading as a flat colour fill.
          Plain blurred divs rather than sprites — the same "a few absolutely-positioned shapes"
          call already made for WeatherParticles and NightSceneBackground's fireflies. */}
      {(period === "morning" || period === "noon") && (
        <div className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden" style={{ height: SKY_HEIGHT }}>
          {CLOUDS.map((cloud, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                top: `${cloud.top}%`,
                width: `${cloud.width}%`,
                height: `${cloud.height}%`,
                background: period === "noon" ? "rgba(255,255,255,0.6)" : "rgba(255,246,238,0.45)",
                filter: `blur(${cloud.blur}px)`,
              }}
              animate={reduceMotion ? { x: "0%" } : { x: ["-30%", "130%"] }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: cloud.duration, repeat: Infinity, ease: "linear", delay: cloud.delay }
              }
            />
          ))}
        </div>
      )}

      {/* Stars only exist in the extended night sky — the backdrop art already draws its own. */}
      {period === "night" && (
        <div className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden" style={{ height: SKY_HEIGHT }}>
          {stars.map((star, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-white animate-twinkle"
              style={
                {
                  left: `${(star.x / 1600) * 100}%`,
                  top: `${(star.y / 460) * 100}%`,
                  width: star.size,
                  height: star.size,
                  "--dur": `${star.dur}s`,
                  "--delay": `${star.delay}s`,
                  opacity: star.min,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}

      {/* ------------------------------------- Layer 0b/1 — backdrop + this period's props */}
      {/* mode="sync" (the default) is what makes this a true cross-fade: both the outgoing and
          incoming image animate at once, instead of fade-out-then-fade-in. */}
      <AnimatePresence>
        <motion.div
          key={`scene-${period}`}
          className={SCENE_BOX}
          style={SCENE_BOX_STYLE}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <img
            src={scene.background}
            alt=""
            className="absolute inset-0 h-full w-full"
            style={{ imageRendering: "pixelated" }}
            draggable={false}
          />
          {scene.props.map((prop) => {
            const placement = layout.props[prop.id];
            if (!placement || prop.frames.length === 0) return null;
            return (
              <div key={prop.id} className="absolute" style={placementStyle(placement)}>
                <LoopSprite
                  frames={prop.frames}
                  frameDuration={prop.frameDuration}
                  alt={prop.label}
                  paused={paused}
                  className="h-auto w-full"
                  style={{ filter: scene.spriteFilter }}
                />
                {showGuides && <Crosshair label={prop.id} />}
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* ------------------------------------------- Layer 2 — ambient light + flicker */}
      <motion.div
        key={`ambient-${period}`}
        className="pointer-events-none absolute inset-0"
        style={{ background: scene.ambientLight, mixBlendMode: "screen" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />
      {scene.flickerLight && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ background: scene.flickerLight, mixBlendMode: "screen" }}
          animate={reduceMotion ? { opacity: 0.85 } : { opacity: [0.72, 1, 0.8, 0.95, 0.75] }}
          transition={reduceMotion ? { duration: 0 } : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* ---------------------------- Layers 3/4 — contact shadow + hero, above the light */}
      <div className={SCENE_BOX} style={SCENE_BOX_STYLE}>
        <div
          className="absolute rounded-[50%] bg-black blur-[3px]"
          style={{
            left: `${layout.shadow.x}%`,
            top: `${layout.shadow.y}%`,
            width: `${layout.shadow.width}%`,
            height: `${layout.shadow.height}%`,
            opacity: layout.shadow.opacity,
            transform: "translate(-50%, -50%)",
          }}
        />
        <div className="absolute" style={placementStyle(layout.hero)}>
          <motion.div key={period} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7 }}>
            <LoopSprite
              frames={scene.heroFrames}
              frameDuration={scene.heroFrameDuration}
              alt={scene.caption}
              paused={paused}
              className="h-auto w-full"
              style={{ filter: scene.spriteFilter }}
            />
          </motion.div>
          {showGuides && <Crosshair label="hero" accent />}
        </div>

        {chestVisual && onChestActivate && onChestAnimationEnd && (
          <CampChest
            visual={chestVisual}
            placement={CHEST_PLACEMENT}
            spriteFilter={scene.spriteFilter}
            onActivate={onChestActivate}
            onAnimationEnd={onChestAnimationEnd}
            paused={paused}
          />
        )}
      </div>

      {/* ------------------------------------------------------ Layer 5 — colour grade */}
      <motion.div
        key={`grade-${period}`}
        className="pointer-events-none absolute inset-0"
        style={{ background: scene.grading }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />
      {/* Vignette, plus a bottom scrim so the floating caption stays legible over bright scenes. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(125%_105%_at_50%_45%,transparent_50%,rgba(0,0,0,0.5)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />

      {/* ------------------------------------------------------ Calibrator guides */}
      {showGuides && (
        <div className={SCENE_BOX} style={SCENE_BOX_STYLE}>
          {[25, 50, 75].map((pct) => (
            <div key={`v${pct}`} className="absolute top-0 h-full w-px bg-cyan-300/25" style={{ left: `${pct}%` }} />
          ))}
          {[25, 50, 75, 85, 92].map((pct) => (
            <div key={`h${pct}`} className="absolute left-0 h-px w-full bg-cyan-300/25" style={{ top: `${pct}%` }} />
          ))}
          <div className="absolute inset-0 border border-cyan-300/40" />
        </div>
      )}
    </div>
  );
}

/** Marks a placed sprite's exact anchor point (bottom-centre) while calibrating. */
function Crosshair({ label, accent = false }: { label: string; accent?: boolean }) {
  const color = accent ? "bg-lantern" : "bg-cyan-300";
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className={`absolute bottom-0 left-1/2 h-3 w-px -translate-x-1/2 ${color}`} />
      <div className={`absolute bottom-0 left-1/2 h-px w-6 -translate-x-1/2 ${color}`} />
      <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1 text-[7px] font-bold text-white">
        {label}
      </span>
    </div>
  );
}

/** The map access button. Lives outside CampStage so the fullscreen shell can float it over the
 * scene without the stage having to know about navigation. */
export function MapButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ouvrir la carte du monde"
      className="group flex items-center gap-1.5 rounded-full border border-lantern/35 bg-black/45 py-1 pl-1 pr-2.5 backdrop-blur-md transition-colors hover:border-lantern/70 hover:bg-black/65 active:scale-95"
    >
      {mapIcon ? (
        <img
          src={mapIcon}
          alt=""
          className="h-6 w-6 transition-transform group-hover:rotate-12"
          style={{ imageRendering: "pixelated" }}
        />
      ) : (
        <span className="h-6 w-6" />
      )}
      <span className="text-[10px] font-bold uppercase tracking-wide text-lantern-glow">Carte</span>
    </button>
  );
}
