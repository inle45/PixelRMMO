import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { GatheringNodeDef } from "../../data/gathering";
import { nodeSprite } from "../../data/gathering";

interface HarvestMinigameProps {
  node: GatheringNodeDef;
  /** `perfect` is true only when every vital point was struck in time. */
  onFinish: (result: { success: boolean; perfect: boolean; hits: number }) => void;
  onCancel: () => void;
}

interface Point {
  x: number;
  y: number;
  /** Drift phase, so T3's points don't all oscillate in sync. */
  phase: number;
}

/** Wrapped so the purity lint can see the clock read happens outside the render body. */
function nowMs() {
  return performance.now();
}

/** Seeded per attempt rather than fixed, so the same node isn't muscle-memory after two tries. */
function makePoints(count: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < count; i++) {
    // Spread around a ring with jitter — guarantees they never stack on top of each other, which a
    // purely random scatter does often enough to feel unfair at 5 points.
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const radius = 26 + Math.random() * 10;
    pts.push({
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius * 0.9,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return pts;
}

/**
 * The cut. One vital point lights up at a time and must be struck before its window closes; the
 * window, the point count and whether the points drift all come from the node's own tier, so T1 is
 * a generous 3-point tap and T3 is five small moving targets on a 1.6s clock.
 *
 * Missing a point ends the attempt immediately (the mushroom is ruined) — hitting every one is a
 * "perfect" and pays the +50% yield / double XP bonus.
 */
export default function HarvestMinigame({ node, onFinish, onCancel }: HarvestMinigameProps) {
  const points = useMemo(() => makePoints(node.points), [node.points]);
  const [index, setIndex] = useState(0);
  const [struck, setStruck] = useState<number[]>([]);
  const [t, setT] = useState(0);
  const doneRef = useRef(false);
  const startRef = useRef(0);

  // Latest-value refs so the timer effect below can depend on `index` ALONE.
  //
  // This is load-bearing, not tidiness: the cave screen re-renders every second (the asphyxia
  // gauge ticks), which hands down a fresh `onFinish` closure each time. With `onFinish` in the
  // dep array the effect re-ran once a second and reset `startRef`, so the reaction window never
  // actually elapsed and a missed cut could never fail — the T3 window in particular is shorter
  // than the parent's own tick, so it was unfailable.
  // Written in an effect rather than during render; the rAF loop only reads them on a later frame,
  // so it always sees the committed values.
  const onFinishRef = useRef(onFinish);
  const struckRef = useRef(struck);
  useEffect(() => {
    onFinishRef.current = onFinish;
    struckRef.current = struck;
  });

  // One rAF loop drives both the countdown ring and (for T3) the points' drift, rather than a
  // timer per point plus a separate animation — they have to agree on the same clock or a drifting
  // target can visually sit somewhere the hit test doesn't.
  useEffect(() => {
    startRef.current = nowMs();
    let raf = 0;
    const tick = () => {
      const elapsed = (nowMs() - startRef.current) / 1000;
      setT(elapsed);
      if (elapsed >= node.reactionWindow && !doneRef.current) {
        doneRef.current = true;
        onFinishRef.current({ success: false, perfect: false, hits: struckRef.current.length });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index, node.reactionWindow]);

  function hit(i: number) {
    if (doneRef.current || i !== index) return;
    const nextStruck = [...struck, i];
    setStruck(nextStruck);
    if (nextStruck.length >= node.points) {
      doneRef.current = true;
      onFinish({ success: true, perfect: true, hits: nextStruck.length });
      return;
    }
    setIndex(i + 1);
    startRef.current = nowMs();
    setT(0);
  }

  const remaining = Math.max(0, 1 - t / node.reactionWindow);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">{node.name}</p>
            <p className="text-[10px] text-white/50">
              Point {Math.min(index + 1, node.points)}/{node.points} · {node.reactionWindow.toFixed(1)}s
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-[10px] font-bold text-white/70 hover:bg-black/70"
          >
            Abandonner
          </button>
        </div>

        {/* Timer bar for the point currently lit. */}
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-black/50">
          <div
            className="h-full rounded-full transition-none"
            style={{ width: `${remaining * 100}%`, backgroundColor: node.accent }}
          />
        </div>

        <div
          className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 bg-[#0b1410]"
          style={{ borderColor: node.accent }}
        >
          <img
            src={nodeSprite(node.tier)}
            alt=""
            className="absolute left-1/2 top-1/2 h-3/5 w-3/5 -translate-x-1/2 -translate-y-1/2 object-contain opacity-90"
            style={{ imageRendering: "pixelated" }}
          />

          {points.map((p, i) => {
            const done = struck.includes(i);
            const active = i === index && !done;
            // T3's points oscillate; the same `t` that drives the timer drives the wobble, so what
            // you see is exactly what you can hit.
            const drift = node.drifting ? Math.sin(t * 2.2 + p.phase) * 6 : 0;
            const driftY = node.drifting ? Math.cos(t * 1.7 + p.phase) * 5 : 0;
            // Points shrink as the tier rises: 3 generous targets at T1, 5 small ones at T3.
            const size = 24 - (node.tier - 1) * 4;
            return (
              <button
                key={i}
                type="button"
                onClick={() => hit(i)}
                disabled={!active}
                aria-label={`Point vital ${i + 1}`}
                className="absolute rounded-full border-2 disabled:cursor-default"
                style={{
                  left: `calc(${p.x + drift}% - ${size / 2}px)`,
                  top: `calc(${p.y + driftY}% - ${size / 2}px)`,
                  width: size,
                  height: size,
                  borderColor: done ? "#34d399" : active ? node.accent : "rgba(255,255,255,0.18)",
                  backgroundColor: done ? "rgba(52,211,153,0.35)" : active ? `${node.accent}55` : "rgba(0,0,0,0.35)",
                  boxShadow: active ? `0 0 14px 3px ${node.accent}` : undefined,
                }}
              >
                {active && (
                  <motion.span
                    className="absolute -inset-2 rounded-full border-2"
                    style={{ borderColor: node.accent }}
                    animate={{ scale: [1.6, 1], opacity: [0.9, 0] }}
                    transition={{ duration: node.reactionWindow, ease: "linear" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-2 text-center text-[10px] text-white/45">
          Frappez chaque point vital avant que le cercle ne se referme.
        </p>
      </div>
    </motion.div>
  );
}
