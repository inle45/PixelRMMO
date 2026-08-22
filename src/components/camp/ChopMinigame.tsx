import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { TreeDef } from "../../data/woodcutting";
import { treeSprite } from "../../data/woodcutting";

export interface ChopResult {
  felled: boolean;
  /** Every chop landed on the beat. */
  perfect: boolean;
}

interface ChopMinigameProps {
  tree: TreeDef;
  onCancel: () => void;
  onFinish: (result: ChopResult) => void;
}

/**
 * Le rythme de la hache — the forest's mini-game, and deliberately a *third* shape rather than a
 * reskin of the cave's multi-point sequence or the canyon's single decisive tap.
 *
 * A marker sweeps back and forth along a beat bar. Every tap has to land inside the centred window;
 * a hit advances the fell counter, a miss RESETS THE COMBO TO ZERO. That reset is the whole design:
 * the punishment for sloppiness is losing the progress you had banked on this tree, not a resource
 * cost, which is what makes tier 3's eight consecutive chops at a 0.95s sweep genuinely tense
 * rather than merely slow.
 *
 * One rAF loop drives the marker, and the tap's hit-test reads the same `position` the render
 * does — the two can never disagree about where the marker actually was, the same reason the
 * canyon's fracture line and the cave's harvest points are each driven by a single loop.
 */
export default function ChopMinigame({ tree, onCancel, onFinish }: ChopMinigameProps) {
  const [chops, setChops] = useState(0);
  const [flash, setFlash] = useState<"hit" | "miss" | null>(null);
  /** 0-100 along the beat bar. Driven by the rAF loop and read by BOTH the render and the tap
   * hit-test, so the two can never disagree about where the marker actually was. */
  const [position, setPosition] = useState(0);
  const perfectRef = useRef(true);
  const doneRef = useRef(false);
  const chopsRef = useRef(0);

  // Marker sweep. `position` is a 0-100 percentage; the triangle wave (rather than a sine) keeps
  // the marker moving at constant speed right through the extremes — a sine stalls at each end and
  // would make the edges of the bar free real estate, the same trap the lake's tension gauge hit.
  useEffect(() => {
    let raf = 0;
    let start = performance.now();
    const loop = (t: number) => {
      const elapsed = (t - start) / 1000;
      const phase = (elapsed % tree.beatDuration) / tree.beatDuration;
      setPosition(phase < 0.5 ? phase * 200 : 200 - phase * 200);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      start = 0;
    };
  }, [tree.beatDuration]);

  function chop() {
    if (doneRef.current) return;
    const onBeat = Math.abs(position - 50) <= tree.beatWindow;

    if (!onBeat) {
      perfectRef.current = false;
      chopsRef.current = 0;
      setChops(0);
      setFlash("miss");
      setTimeout(() => setFlash(null), 260);
      return;
    }

    chopsRef.current += 1;
    setChops(chopsRef.current);
    setFlash("hit");
    setTimeout(() => setFlash(null), 200);

    if (chopsRef.current >= tree.chopsToFell) {
      doneRef.current = true;
      setTimeout(() => onFinish({ felled: true, perfect: perfectRef.current }), 420);
    }
  }

  const progress = (chops / tree.chopsToFell) * 100;

  return (
    <motion.div
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-black/80 p-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-center">
        <p className="text-sm font-bold text-white">{tree.name}</p>
        <p className="mt-0.5 text-[11px] text-white/50">
          Frappez sur le temps — {tree.chopsToFell} coups d'affilée. Un raté remet le compteur à zéro.
        </p>
      </div>

      <motion.img
        src={treeSprite(tree.tier)}
        alt=""
        className="h-24 w-24 object-contain"
        style={{ imageRendering: "pixelated" }}
        animate={flash === "hit" ? { x: [0, -5, 5, -3, 0], rotate: [0, -2, 2, 0] } : {}}
        transition={{ duration: 0.28 }}
      />

      {/* Fell progress */}
      <div className="w-full max-w-xs">
        <div className="mb-1 flex justify-between text-[10px] font-bold text-white/60">
          <span>Entaille</span>
          <span>
            {chops}/{tree.chopsToFell}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-black/60">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: tree.accent }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </div>

      {/* Beat bar */}
      <div className="relative h-10 w-full max-w-xs overflow-hidden rounded-xl border border-white/15 bg-black/60">
        <div
          className="absolute inset-y-0 rounded-md"
          style={{
            left: `${50 - tree.beatWindow}%`,
            width: `${tree.beatWindow * 2}%`,
            backgroundColor: `${tree.accent}44`,
            borderLeft: `2px solid ${tree.accent}`,
            borderRight: `2px solid ${tree.accent}`,
          }}
        />
        <div
          className="absolute inset-y-1 w-1 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
          style={{ left: `calc(${position}% - 2px)` }}
        />
      </div>

      <div className="h-5">
        {flash === "hit" && <span className="text-sm font-bold text-emerald-300">SUR LE TEMPS !</span>}
        {flash === "miss" && <span className="text-sm font-bold text-rose-400">RATÉ — COMBO PERDU</span>}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={chop}
          className="rounded-xl border-2 px-8 py-3 text-sm font-bold text-white active:scale-95"
          style={{ borderColor: tree.accent, backgroundColor: `${tree.accent}33` }}
        >
          Frapper
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-white/15 bg-black/50 px-5 py-3 text-xs font-bold text-white/60"
        >
          Renoncer
        </button>
      </div>
    </motion.div>
  );
}
