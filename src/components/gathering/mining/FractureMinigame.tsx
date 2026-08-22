import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { MiningNodeDef } from "../../../data/mining";

interface FractureMinigameProps {
  node: MiningNodeDef;
  onFinish: (result: { outcome: "perfect" | "hit" | "miss" }) => void;
  onCancel: () => void;
}

/**
 * The strike. A marker sweeps back and forth along the fault line at the node's own tier speed;
 * tapping FRAPPER resolves against wherever it currently sits: dead centre (the golden zone) breaks
 * the rock clean for the +50% bonus, a wider band around it still breaks it normally, and outside
 * that band the pickaxe rebounds — a real cost, not just a wasted attempt.
 *
 * One rAF loop drives the marker (same reason HarvestMinigame/TensionGauge use one: a second clock
 * would let the rendered position and the tap's hit-test disagree). Unlike the cave's multi-point
 * sequence or the lake's hold-and-release gauge, this is a single decisive tap — a third distinct
 * mini-game shape for a third zone, not the same loop reskinned.
 */
export default function FractureMinigame({ node, onFinish, onCancel }: FractureMinigameProps) {
  const [pos, setPos] = useState(0);
  const doneRef = useRef(false);
  const posRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      // Ping-pong triangle wave 0-100-0, same technique TensionGauge's sliding band uses — a
      // constant sweep speed reads cleanly, whereas a sine stalls at the ends of the line.
      const phase = (elapsed % node.sweepDuration) / node.sweepDuration;
      const p = Math.abs(phase * 2 - 1) * 100;
      posRef.current = p;
      setPos(p);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [node.sweepDuration]);

  function strike() {
    if (doneRef.current) return;
    doneRef.current = true;
    const offset = Math.abs(posRef.current - 50);
    const outcome = offset <= node.goldZoneSize / 2 ? "perfect" : offset <= node.okZoneSize / 2 ? "hit" : "miss";
    onFinish({ outcome });
  }

  const goldHalf = node.goldZoneSize / 2;
  const okHalf = node.okZoneSize / 2;

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
            <p className="text-sm font-bold text-white">{node.name}</p>
            <p className="text-[10px] text-white/50">Frappe au point de rupture</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-[10px] font-bold text-white/70 hover:bg-black/70"
          >
            Abandonner
          </button>
        </div>

        <div
          className="relative h-14 w-full overflow-hidden rounded-full border-2 bg-[#1a0e08]"
          style={{ borderColor: node.accent }}
        >
          {/* Forgiving band, centred. */}
          <div
            className="absolute inset-y-0 rounded-full"
            style={{ left: `${50 - okHalf}%`, width: `${node.okZoneSize}%`, backgroundColor: `${node.accent}33` }}
          />
          {/* Golden perfect-break zone. */}
          <div
            className="absolute inset-y-0 rounded-full"
            style={{
              left: `${50 - goldHalf}%`,
              width: `${node.goldZoneSize}%`,
              background: "linear-gradient(180deg, #fde68a, #f59e0b)",
              boxShadow: "0 0 14px 2px rgba(250,204,21,0.7)",
            }}
          />
          {/* The oscillating marker. */}
          <motion.div
            className="absolute top-1/2 h-10 w-2 -translate-y-1/2 rounded-full bg-white"
            style={{ left: `${pos}%`, transform: "translate(-50%, -50%)", boxShadow: "0 0 10px 3px rgba(255,255,255,0.85)" }}
          />
        </div>

        <button
          type="button"
          onClick={strike}
          className="mt-5 w-full select-none rounded-2xl border-2 py-4 text-sm font-black text-white transition-transform active:scale-95"
          style={{ borderColor: node.accent, backgroundColor: `${node.accent}22` }}
        >
          FRAPPER
        </button>

        <p className="mt-3 text-center text-[10px] text-white/45">
          Zone dorée = coupe nette (+50% de rendement). En dehors de la zone = rebond, la pioche s'ébrèche.
        </p>
      </div>
    </motion.div>
  );
}
