import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import LoopSprite from "../../camp/LoopSprite";
import { DUST_DEVIL_FRAMES, VULTURE_SHADOW_FRAMES, ORE_SPARKLE_FRAMES, ROCK_FALL_FRAMES } from "../../../data/canyonFx";
import { mulberry32 } from "../../../data/seededRandom";

/** Where the cliff walls actually are on `red_canyon_bg.png` (sparkles and rockfall belong here,
 * never on the open plateau floor) versus the open trail floor (where dust devils roam). Same
 * "measure it, don't scatter it everywhere" rule the lake's WATER ellipse already follows. */
const CLIFF_BANDS = [
  { x: 10, y: 22, w: 30, h: 46 },
  { x: 62, y: 14, w: 32, h: 40 },
];
const FLOOR = { y0: 55, y1: 92 };

/**
 * The canyon's ambient life — built THIS TIME with the fishing zone's own lesson already learned:
 * an interior gathering scene has to move on its own, not just the world-map node representing it.
 * Two dust devils drift a sinuous path across the plateau floor, a vulture's shadow sweeps overhead
 * every ~14s, cliff-face sparkles twinkle every ~3s, small rockfalls tumble down the walls every
 * ~10s, and a heat-shimmer distortion sits over the ground during the 06h-21h daytime window. Every
 * sprite here is the SAME pack generated for the world-map overlay (`canyonFx.ts`) — one PixelLab
 * pass serving two contexts rather than commissioning near-duplicates.
 */
export default function MiningAmbience({ daytime }: { daytime: boolean }) {
  const reduceMotion = useReducedMotion();
  const [sparkle, setSparkle] = useState<{ id: number; x: number; y: number } | null>(null);
  const [rockfall, setRockfall] = useState<{ id: number; x: number; y: number } | null>(null);
  const [vultureAt, setVultureAt] = useState(0);

  const dustDevils = useMemo(() => {
    const rand = mulberry32(19830412);
    return Array.from({ length: 2 }, (_, i) => ({
      id: i,
      y: FLOOR.y0 + rand() * (FLOOR.y1 - FLOOR.y0),
      duration: 22 + rand() * 10,
      delay: rand() * 12,
      amplitude: 6 + rand() * 6,
    }));
  }, []);

  function cliffPoint(rand: () => number) {
    const band = CLIFF_BANDS[Math.floor(rand() * CLIFF_BANDS.length)];
    return { x: band.x + rand() * band.w, y: band.y + rand() * band.h };
  }

  useEffect(() => {
    if (reduceMotion) return;
    let hide: ReturnType<typeof setTimeout>;
    let next: ReturnType<typeof setTimeout>;
    let n = 0;
    const schedule = () => {
      next = setTimeout(() => {
        const p = cliffPoint(Math.random);
        setSparkle({ id: n++, ...p });
        hide = setTimeout(() => {
          setSparkle(null);
          schedule();
        }, 900);
      }, 3000);
    };
    schedule();
    return () => {
      clearTimeout(hide);
      clearTimeout(next);
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    let hide: ReturnType<typeof setTimeout>;
    let next: ReturnType<typeof setTimeout>;
    let n = 0;
    const schedule = () => {
      next = setTimeout(() => {
        const p = cliffPoint(Math.random);
        setRockfall({ id: n++, x: p.x, y: p.y });
        hide = setTimeout(() => {
          setRockfall(null);
          schedule();
        }, 1400);
      }, 10000 + Math.random() * 2000);
    };
    schedule();
    return () => {
      clearTimeout(hide);
      clearTimeout(next);
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setVultureAt((v) => v + 1), 14000);
    return () => clearInterval(id);
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Heat shimmer — an SVG feTurbulence/feDisplacementMap distortion over the ground band,
          the same trick real heat-haze CSS effects use rather than a faked opacity pulse; only
          when the sun is actually up. */}
      {daytime && (
        <>
          <svg className="absolute h-0 w-0">
            <filter id="canyon-heat">
              <feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves="2" seed="7" result="noise">
                <animate attributeName="baseFrequency" values="0.012 0.05;0.012 0.09;0.012 0.05" dur="6s" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </svg>
          <div
            className="absolute inset-x-0 bg-gradient-to-t from-orange-200/10 via-orange-100/5 to-transparent"
            style={{ top: `${FLOOR.y0}%`, bottom: 0, filter: "url(#canyon-heat)" }}
          />
        </>
      )}

      {/* Dust devils drifting a sinuous path left-to-right across the open floor. */}
      {dustDevils.map((d) => (
        <motion.div
          key={d.id}
          className="absolute"
          style={{ top: `${d.y}%` }}
          animate={{ left: ["-8%", "108%"], y: [0, -d.amplitude, 0, d.amplitude, 0] }}
          transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: "linear" }}
        >
          <LoopSprite frames={DUST_DEVIL_FRAMES} frameDuration={140} alt="" className="h-10 w-8 opacity-80" />
        </motion.div>
      ))}

      {/* The vulture's shadow sweeping over the gorge, roughly every 14s. */}
      <AnimatePresence>
        <motion.div
          key={vultureAt}
          className="absolute top-[8%]"
          initial={{ left: "-15%", opacity: 0 }}
          animate={{ left: "115%", opacity: [0, 0.55, 0.55, 0] }}
          transition={{ duration: 5, ease: "linear" }}
        >
          <LoopSprite frames={VULTURE_SHADOW_FRAMES} frameDuration={220} alt="" className="h-8 w-11" style={{ mixBlendMode: "multiply" }} />
        </motion.div>
      </AnimatePresence>

      {/* Ore sparkle on the cliff faces. */}
      <AnimatePresence>
        {sparkle && (
          <motion.div
            key={sparkle.id}
            className="absolute h-5 w-5"
            style={{ left: `${sparkle.x}%`, top: `${sparkle.y}%` }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoopSprite frames={ORE_SPARKLE_FRAMES} frameDuration={110} alt="" className="h-full w-full" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Micro-éboulements along the walls. */}
      <AnimatePresence>
        {rockfall && (
          <motion.div
            key={rockfall.id}
            className="absolute h-7 w-7"
            style={{ left: `${rockfall.x}%`, top: `${rockfall.y}%` }}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 4 }}
            exit={{ opacity: 0 }}
          >
            <LoopSprite frames={ROCK_FALL_FRAMES} frameDuration={160} alt="" className="h-full w-full" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
