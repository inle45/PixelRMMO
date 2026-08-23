import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CAMP_PANELS } from "../../data/campPanels";
import { useTimeOfDay } from "../../hooks/useTimeOfDay";
import CampDayCycle from "./CampDayCycle";
import WoodcuttingScene from "./WoodcuttingScene";
import BarnView from "./BarnView";

interface CampScreenProps {
  onOpenMap: () => void;
}

/**
 * The Camp tab: three side-scrolling tableaux — Lisière Sylvestre / Feu de Camp / Domaine d'Élevage
 * — rather than the single campfire scene it used to be.
 *
 * **Only the active panel is mounted.** Sliding all three through `x: ±100%` while keeping them all
 * alive would leave two off-screen scenes running their full ambience loops (dozens of `motion.div`
 * particle animations each, plus the barn's 1s production tick) forever, which is exactly the kind
 * of always-on offscreen work that showed up as jank in the battle arena's first pass. The slide is
 * an `AnimatePresence` swap with a direction flag instead, so the outgoing panel exits and unmounts.
 * The one real cost — the barn's animals re-derive their pasture positions on re-entry — is free
 * anyway, because those positions are seeded off each animal's uid rather than randomised.
 *
 * `useTimeOfDay` is read HERE and passed down rather than called in each panel: the debug override
 * (keys 1-4) lives in that hook's own state, so three independent calls would give three panels
 * three different overrides and the scenes would disagree about what time it is.
 */
/** Direction-aware slide. Has to go through `variants` rather than function-valued
 * `initial`/`exit` props — framer-motion only threads `custom` into variant resolvers. */
const SLIDE = {
  enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%" }),
  center: { x: 0 },
  exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%" }),
};

export default function CampScreen({ onOpenMap }: CampScreenProps) {
  const [index, setIndex] = useState(1); // start on the campfire, the panel that was there before
  const [direction, setDirection] = useState(0);
  const { period } = useTimeOfDay();

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => {
        const next = Math.min(CAMP_PANELS.length - 1, Math.max(0, i + delta));
        if (next !== i) setDirection(delta);
        return next;
      });
    },
    []
  );

  // Left/right arrows pan between tableaux, matching the existing 1-4 period shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const panel = CAMP_PANELS[index];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={panel.id}
          className="absolute inset-0"
          custom={direction}
          variants={SLIDE}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 260, damping: 32 }}
        >
          {panel.id === "forest" && <WoodcuttingScene period={period} />}
          {panel.id === "fire" && <CampDayCycle onOpenMap={onOpenMap} />}
          {panel.id === "barn" && <BarnView period={period} />}
        </motion.div>
      </AnimatePresence>

      {/* Edge arrows. Semi-transparent, pulsing, and *outside* the AnimatePresence so they don't
          slide away with the panel they belong to. */}
      {index > 0 && <EdgeArrow side="left" label={CAMP_PANELS[index - 1].label} onClick={() => go(-1)} />}
      {index < CAMP_PANELS.length - 1 && (
        <EdgeArrow side="right" label={CAMP_PANELS[index + 1].label} onClick={() => go(1)} />
      )}

      {/* Panel dots + name, bottom centre above the nav bar. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-1.5">
        <p
          className="text-[11px] font-bold uppercase tracking-wide text-white/85"
          style={{ textShadow: "0 2px 6px rgba(0,0,0,0.95)" }}
        >
          {panel.label}
        </p>
        <div className="flex gap-1.5">
          {CAMP_PANELS.map((p, i) => (
            <span
              key={p.id}
              className={
                "h-1.5 rounded-full transition-all duration-300 " +
                (i === index ? "w-5 bg-lantern" : "w-1.5 bg-white/35")
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EdgeArrow({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={`Aller vers ${label}`}
      className={
        "absolute top-1/2 z-30 flex h-11 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-white/30 bg-black/55 text-2xl font-bold leading-none text-white shadow-[0_2px_10px_rgba(0,0,0,0.5)] backdrop-blur-sm " +
        (side === "left" ? "left-2 justify-start pl-1.5" : "right-2 justify-end pr-1.5")
      }
      style={{ textShadow: "0 0 6px rgba(0,0,0,0.9)" }}
      animate={{ opacity: [0.65, 1, 0.65] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      whileTap={{ scale: 0.9 }}
    >
      {/* `←`/`→` are the project's own whitelisted non-emoji glyphs (see CLAUDE.md's "purely
          typographic UI glyphs" list) — a hand-rolled 3px pixel-dot chevron was tried first and was
          too small/low-contrast to notice at all against a bright sky backdrop; a bold glyph at
          real size reads unambiguously as an arrow from across the screen instead. */}
      {side === "left" ? "←" : "→"}
    </motion.button>
  );
}
