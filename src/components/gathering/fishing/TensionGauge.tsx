import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { FishingSpotDef } from "../../../data/fishing";

interface TensionGaugeProps {
  spot: FishingSpotDef;
  onFinish: (result: { landed: boolean; perfect: boolean }) => void;
  onCancel: () => void;
}

/** Tension gained per second while holding, lost per second while released. Holding is the only
 * input, so these two rates ARE the difficulty curve of the tug-of-war. */
const PULL_RATE = 58;
const SLACK_RATE = 46;
/** A landing counts as "perfect" when the marker stayed inside the safe band for at least this
 * share of the fight — the +50 % yield has to be earned by control, not luck. */
const PERFECT_THRESHOLD = 0.85;

/**
 * Step 3 of the cast: the bras de fer.
 *
 * One rAF loop drives everything — the sliding safe zone, the tension marker and the countdown —
 * for the same reason `HarvestMinigame` uses one: two clocks would let the band render somewhere
 * the hit test doesn't agree with. All mutable state lives in refs and is mirrored into a single
 * `frame` state per animation frame, so the loop never reads a stale closure mid-fight.
 */
export default function TensionGauge({ spot, onFinish, onCancel }: TensionGaugeProps) {
  const [frame, setFrame] = useState({ tension: 40, zoneCentre: 50, remaining: spot.fightDuration, inZone: true });
  const holdingRef = useRef(false);
  const doneRef = useRef(false);

  // Latest-value ref: this screen's parent re-renders on its own timer, so a fresh onFinish
  // closure arrives constantly. Depending on it directly would restart the fight every tick —
  // the exact bug the cave's HarvestMinigame had to be fixed for.
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let tension = 40;
    let elapsed = 0;
    let inZoneMs = 0;

    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;

      // The safe band slides as a triangle wave rather than a sine: a constant speed is readable,
      // whereas a sine stalls at the extremes and makes the ends of the gauge free real estate.
      const period = 200 / spot.zoneSpeed;
      const phase = (elapsed % period) / period;
      const centre = 15 + Math.abs(phase * 2 - 1) * 70;

      tension += (holdingRef.current ? PULL_RATE : -SLACK_RATE) * dt;
      tension = Math.max(0, Math.min(100, tension));

      const half = spot.zoneSize / 2;
      const inZone = tension >= centre - half && tension <= centre + half;
      if (inZone) inZoneMs += dt;

      if (!doneRef.current && tension >= 100) {
        doneRef.current = true;
        onFinishRef.current({ landed: false, perfect: false });
        return;
      }
      if (!doneRef.current && elapsed >= spot.fightDuration) {
        doneRef.current = true;
        const ratio = inZoneMs / spot.fightDuration;
        // Losing the band entirely for most of the fight means the fish shook the hook.
        onFinishRef.current({ landed: ratio >= 0.45, perfect: ratio >= PERFECT_THRESHOLD });
        return;
      }

      setFrame({ tension, zoneCentre: centre, remaining: Math.max(0, spot.fightDuration - elapsed), inZone });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spot.fightDuration, spot.zoneSize, spot.zoneSpeed]);

  const half = spot.zoneSize / 2;

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex w-full max-w-sm flex-col items-center">
        <div className="mb-3 flex w-full items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">Ça mord !</p>
            <p className="text-[10px] text-white/50">{spot.name} · {frame.remaining.toFixed(1)}s</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-[10px] font-bold text-white/70 hover:bg-black/70"
          >
            Lâcher
          </button>
        </div>

        <div className="flex items-stretch gap-3">
          {/* The gauge is vertical per the spec — tension climbs, and the line snaps at the top. */}
          <div
            className="relative h-72 w-14 overflow-hidden rounded-full border-2 bg-[#08131a]"
            style={{ borderColor: frame.inZone ? spot.accent : "#f43f5e" }}
          >
            <div
              className="absolute inset-x-0 rounded-md transition-colors"
              style={{
                bottom: `${frame.zoneCentre - half}%`,
                height: `${spot.zoneSize}%`,
                backgroundColor: `${spot.accent}44`,
                borderTop: `2px solid ${spot.accent}`,
                borderBottom: `2px solid ${spot.accent}`,
              }}
            />
            {/* Danger band: the top fifth is where the line gives way. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[12%] bg-rose-600/25" />
            <div
              className="absolute inset-x-1 h-1.5 rounded-full"
              style={{
                bottom: `calc(${frame.tension}% - 3px)`,
                backgroundColor: frame.inZone ? "#ffffff" : "#f43f5e",
                boxShadow: frame.inZone ? `0 0 12px 3px ${spot.accent}` : "0 0 12px 3px #f43f5e",
              }}
            />
          </div>

          <button
            type="button"
            aria-label="Tendre la ligne"
            onPointerDown={() => {
              holdingRef.current = true;
            }}
            onPointerUp={() => {
              holdingRef.current = false;
            }}
            onPointerLeave={() => {
              holdingRef.current = false;
            }}
            className="w-32 select-none rounded-2xl border-2 text-xs font-bold text-white transition-transform active:scale-95"
            style={{ borderColor: spot.accent, backgroundColor: `${spot.accent}22` }}
          >
            MAINTENIR
            <span className="mt-1 block text-[9px] font-normal text-white/50">
              garde le curseur dans la zone
            </span>
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] text-white/45">
          Relâche pour laisser filer, maintiens pour ferrer. Tension au maximum = ligne brisée.
        </p>
      </div>
    </motion.div>
  );
}
