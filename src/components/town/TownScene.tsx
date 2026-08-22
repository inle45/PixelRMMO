import { useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTownTimeOfDay, TOWN_PERIOD_BY_ID, TOWN_TIME_PERIODS } from "../../hooks/useTownTimeOfDay";
import {
  TOWN_ZONES,
  TOWN_BACKGROUND,
  TOWN_ASPECT,
  TIME_GRADE,
  LIGHT_SOURCES,
  SMOKE_SOURCE,
  GUARD_POSTS,
  GUARD_FRAMES,
  type TownZoneId,
  type TownZoneDef,
} from "../../data/town";
import LoopSprite from "../camp/LoopSprite";
import TownZoneMarker from "./TownZoneMarker";
import ForgeStation from "./ForgeStation";
import EnchantStation from "./EnchantStation";
import GuardStation from "./GuardStation";
import MarketStation from "./MarketStation";
import TavernModal from "./TavernModal";

interface TownSceneProps {
  onClose: () => void;
  onOpenMap?: () => void;
  /** Opens straight onto a station (used when arriving from a shortcut rather than the plaza). */
  initialZone?: TownZoneId;
}

/** Fills the viewport height and lets the (portrait) artwork overflow mildly sideways — the reverse
 * of CampStage's width-first rule, and the reason there is no dead sky here any more: a 9:16 image
 * against a 9:16 screen crops ~5% off the sides instead of leaving ~45% of the screen empty above
 * a square one. Every zone sits within x ∈ [20%, 85%], well clear of that crop. */
const SCENE_BOX_STYLE: CSSProperties = { height: "100cqh", aspectRatio: `${TOWN_ASPECT}` };

/** A few rising wisps continuing the plume the artwork already paints on its one chimney. */
const SMOKE_WISPS = [
  { dx: -2, delay: 0, dur: 7, size: 7 },
  { dx: 3, delay: 2.4, dur: 8.5, size: 9 },
  { dx: 0, delay: 4.6, dur: 6.5, size: 6 },
];

export default function TownScene({ onClose, onOpenMap, initialZone }: TownSceneProps) {
  const { period, clockPeriod, override, setOverride, debugEnabled } = useTownTimeOfDay();
  const [activeZone, setActiveZone] = useState<TownZoneDef | null>(
    () => TOWN_ZONES.find((z) => z.id === initialZone) ?? null
  );
  const reduceMotion = useReducedMotion();
  const grade = TIME_GRADE[period];
  const periodDef = TOWN_PERIOD_BY_ID[period];

  const guards = useMemo(() => GUARD_POSTS, []);

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-[#0a0c14]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative h-full w-full overflow-hidden" style={{ containerType: "size", imageRendering: "pixelated" }}>
        {/* Blurred copy of the same art fills the side gutters on a wide desktop viewport, where a
            portrait image can't reach the edges. Invisible on a phone, where the box overflows. */}
        <img
          src={TOWN_BACKGROUND}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
          style={{ filter: grade.filter, transition: "filter 1s ease" }}
        />

        <div className="absolute left-1/2 top-0 -translate-x-1/2" style={SCENE_BOX_STYLE}>
          {/* ---------------------------------------------------------------- the city itself */}
          <img
            src={TOWN_BACKGROUND}
            alt=""
            className="absolute inset-0 h-full w-full"
            style={{ imageRendering: "pixelated", filter: grade.filter, transition: "filter 1s ease" }}
            draggable={false}
          />

          {/* Time-of-day colour wash. Plain alpha (it tints), unlike the light layer below. */}
          <div
            className="pointer-events-none absolute inset-0 transition-[background] duration-1000"
            style={{ background: grade.wash }}
          />

          {/* ------------------------------------------- light sources, anchored to painted fires */}
          {LIGHT_SOURCES.map((light, i) => (
            <motion.div
              key={i}
              className="pointer-events-none absolute rounded-full"
              style={{
                left: `${light.x}%`,
                top: `${light.y}%`,
                width: `${light.size}%`,
                aspectRatio: "1",
                transform: "translate(-50%, -50%)",
                background: `radial-gradient(circle, rgba(${light.color},0.75) 0%, rgba(${light.color},0.28) 42%, transparent 72%)`,
                mixBlendMode: "screen",
                filter: "blur(3px)",
              }}
              animate={
                reduceMotion
                  ? { opacity: grade.glow * 0.8 }
                  : light.kind === "flame"
                    ? { opacity: [grade.glow * 0.62, grade.glow, grade.glow * 0.74, grade.glow * 0.95, grade.glow * 0.66] }
                    : { opacity: [grade.glow * 0.55, grade.glow, grade.glow * 0.55], scale: [1, 1.08, 1] }
              }
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: light.kind === "flame" ? 3.2 + i * 0.4 : 4.5, repeat: Infinity, ease: "easeInOut" }
              }
            />
          ))}

          {/* ------------------------------------------------------------ chimney smoke */}
          {!reduceMotion &&
            SMOKE_WISPS.map((w, i) => (
              <motion.div
                key={i}
                className="pointer-events-none absolute rounded-full bg-slate-300/25"
                style={{
                  left: `${SMOKE_SOURCE.x}%`,
                  top: `${SMOKE_SOURCE.y}%`,
                  width: `${w.size}%`,
                  aspectRatio: "1",
                  filter: "blur(4px)",
                }}
                animate={{ y: ["0%", "-320%"], x: [`0%`, `${w.dx * 40}%`], opacity: [0, 0.5, 0], scale: [0.6, 1.5] }}
                transition={{ duration: w.dur, delay: w.delay, repeat: Infinity, ease: "easeOut" }}
              />
            ))}

          {/* --------------------------------------------------- patrolling guards (only sprite kept) */}
          {GUARD_FRAMES.length > 0 &&
            guards.map((post, i) => (
              <div
                key={i}
                className="pointer-events-none absolute"
                style={{ left: `${post.x}%`, top: `${post.y}%`, width: "6%", transform: "translate(-50%, -100%)" }}
              >
                <LoopSprite
                  frames={GUARD_FRAMES}
                  frameDuration={230 + i * 70}
                  alt=""
                  className="h-auto w-full"
                  style={{
                    transform: post.flip ? "scaleX(-1)" : undefined,
                    // Same merged-filter trick as the battle arena's sprite integration: a drop
                    // shadow to sit them on the cobbles, plus the period's own brightness so they
                    // don't read as full-brightness cutouts on a graded scene.
                    filter: `drop-shadow(0 2px 3px rgba(0,0,0,0.6)) ${grade.filter}`,
                  }}
                />
              </div>
            ))}

          {/* ------------------------------------------------------------------ district hotspots */}
          {TOWN_ZONES.map((zone) => (
            <TownZoneMarker key={zone.id} zone={zone} onSelect={setActiveZone} />
          ))}

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(125%_105%_at_50%_45%,transparent_58%,rgba(0,0,0,0.5)_100%)]" />
        </div>

        {/* ------------------------------------------------------------------------- floating HUD */}
        <button
          type="button"
          onClick={onClose}
          className="absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-30 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-xs font-bold text-white/85 backdrop-blur-md transition-colors hover:border-white/35 hover:bg-black/75"
        >
          ✕ Quitter
        </button>

        {onOpenMap && (
          <button
            type="button"
            onClick={onOpenMap}
            className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-30 flex items-center gap-1.5 rounded-full border border-lantern/35 bg-black/60 px-3 py-1.5 text-xs font-bold text-lantern-glow backdrop-blur-md transition-colors hover:border-lantern/70 hover:bg-black/75"
          >
            Carte du Monde
          </button>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-1 px-6">
          <span className="rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-lantern-glow backdrop-blur-sm">
            {periodDef.label} · {periodDef.range}
          </span>
          <p
            className="text-center text-xs italic leading-snug text-white/80"
            style={{ textShadow: "0 2px 6px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)" }}
          >
            {grade.caption}
          </p>
        </div>

        {/* Stacked under "Quitter" rather than along the bottom edge: the bottom strip already holds
            the period pill and the caption, and a second row there overlapped both. */}
        {debugEnabled && (
          <div className="absolute left-3 top-[calc(3.25rem+env(safe-area-inset-top))] z-30 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setOverride(null)}
              title={`Horloge réelle (${TOWN_PERIOD_BY_ID[clockPeriod].label})`}
              className={
                "rounded-full border px-2 py-1 text-[10px] font-bold backdrop-blur-md transition-colors " +
                (!override ? "border-lantern/50 bg-lantern/20 text-lantern-glow" : "border-white/15 bg-black/45 text-white/60")
              }
            >
              Auto
            </button>
            {TOWN_TIME_PERIODS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setOverride(p.id)}
                title={p.label}
                className={
                  "rounded-full border px-2 py-1 text-[10px] font-bold backdrop-blur-md transition-colors " +
                  (override === p.id ? "border-cyan-400/60 bg-cyan-400/20 text-cyan-200" : "border-white/15 bg-black/45 text-white/60")
                }
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {activeZone?.id === "forge" && <ForgeStation onClose={() => setActiveZone(null)} />}
        {activeZone?.id === "enchant" && <EnchantStation onClose={() => setActiveZone(null)} />}
        {activeZone?.id === "tavern" && <TavernModal onClose={() => setActiveZone(null)} />}
        {activeZone?.id === "guard" && <GuardStation onClose={() => setActiveZone(null)} />}
        {activeZone?.id === "market" && <MarketStation onClose={() => setActiveZone(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}
