import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import type { TimeOfDayId } from "../../hooks/useTimeOfDay";
import { CAMP_SCENES, mapIcon, type PeriodLayout, type Placement } from "../../data/campScene";
import LoopSprite from "./LoopSprite";

interface CampStageProps {
  period: TimeOfDayId;
  /** Live layout for this period — the calibrator hands over its in-progress edits, otherwise
   * this is just `CAMP_CONFIG[period]`. */
  layout: PeriodLayout;
  /** Calibrator overlay: centre crosshairs on each placed entity + a ground grid. */
  showGuides?: boolean;
  /** Freezes every frame loop so a sprite can be lined up against the guides. */
  paused?: boolean;
  onOpenMap?: () => void;
}

/** Anchors a sprite bottom-centre at its (x, y) stage percentage — so `y` is literally the line
 * where the sprite meets the ground, which is the only coordinate that stays meaningful when the
 * stage is responsive and the art is not a fixed pixel canvas.
 *
 * This has to live on a plain wrapper div with the entrance animation on a *child* motion.div:
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

export default function CampStage({ period, layout, showGuides = false, paused = false, onOpenMap }: CampStageProps) {
  const scene = CAMP_SCENES[period];
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_18px_45px_rgba(0,0,0,0.5)]"
      style={{ imageRendering: "pixelated" }}
    >
      {/* ---------------------------------------------------- Layer 0 — backdrop */}
      {/* mode="sync" (the default) is what makes this a true cross-fade: both the outgoing and
          incoming image animate at once, instead of fade-out-then-fade-in. Same call as
          DynamicBackground. */}
      <AnimatePresence>
        <motion.img
          key={period}
          src={scene.background}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ imageRendering: "pixelated" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          draggable={false}
        />
      </AnimatePresence>

      {/* ------------------------------------- Layer 1 — this period's animated props */}
      {scene.props.map((prop) => {
        const placement = layout.props[prop.id];
        if (!placement || prop.frames.length === 0) return null;
        return (
          <div key={`${period}-${prop.id}`} className="absolute" style={placementStyle(placement)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
              <LoopSprite
                frames={prop.frames}
                frameDuration={prop.frameDuration}
                alt={prop.label}
                paused={paused}
                className="h-auto w-full"
                style={{ filter: scene.spriteFilter }}
              />
            </motion.div>
            {showGuides && <Crosshair label={prop.id} />}
          </div>
        );
      })}

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

      {/* ---------------------------------------------- Layer 3 — hero contact shadow */}
      <div
        className="pointer-events-none absolute rounded-[50%] bg-black blur-[3px]"
        style={{
          left: `${layout.shadow.x}%`,
          top: `${layout.shadow.y}%`,
          width: `${layout.shadow.width}%`,
          height: `${layout.shadow.height}%`,
          opacity: layout.shadow.opacity,
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* ------------------------------------------------------- Layer 4 — hero sprite */}
      <div key={`hero-${period}`} className="absolute" style={placementStyle(layout.hero)}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.15 }}>
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

      {/* ------------------------------------------------------ Layer 5 — colour grade */}
      <motion.div
        key={`grade-${period}`}
        className="pointer-events-none absolute inset-0"
        style={{ background: scene.grading }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />
      {/* A soft vignette keeps the overlaid UI legible against the brighter daytime scenes. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_50%,transparent_45%,rgba(0,0,0,0.45)_100%)]" />

      {/* ------------------------------------------------- Map access (top right) */}
      {onOpenMap && (
        <button
          type="button"
          onClick={onOpenMap}
          aria-label="Ouvrir la carte du monde"
          className="group absolute right-2 top-2 flex items-center gap-1.5 rounded-full border border-lantern/35 bg-black/45 py-1 pl-1 pr-2.5 backdrop-blur-md transition-colors hover:border-lantern/70 hover:bg-black/65 active:scale-95"
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
      )}

      {/* ------------------------------------------------------ Calibrator guides */}
      {showGuides && (
        <div className="pointer-events-none absolute inset-0">
          {[25, 50, 75].map((pct) => (
            <div key={`v${pct}`} className="absolute top-0 h-full w-px bg-cyan-300/25" style={{ left: `${pct}%` }} />
          ))}
          {[25, 50, 75, 85, 92].map((pct) => (
            <div key={`h${pct}`} className="absolute left-0 h-px w-full bg-cyan-300/25" style={{ top: `${pct}%` }} />
          ))}
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
