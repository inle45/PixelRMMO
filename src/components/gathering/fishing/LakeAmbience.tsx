import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { mulberry32 } from "../../../data/seededRandom";

/** Where the water actually is on `crater_lake_bg.png`, as an ellipse in scene-box percentages.
 * Everything ambient is placed inside it — a ripple on the rocky shore or over the dock reads as a
 * bug, not as weather, so nothing is scattered across the whole box. */
const WATER = { cx: 50, cy: 53, rx: 33, ry: 23 };

/** The dark abyss at the middle. Ripples avoid it (still deep water reads as still) and the depth
 * pulse lives there instead. */
const ABYSS_R = 0.42;

const FISH_SPLASH = "/assets/worldmap/fish_splash.png";

/** Point inside the water ellipse, biased to the readable mid-ring: `t` picks the radius band. */
function waterPoint(rand: () => number): { x: number; y: number; r: number } {
  const angle = rand() * Math.PI * 2;
  // sqrt keeps points from clumping at the centre; the floor pushes them out of the abyss.
  const r = ABYSS_R + Math.sqrt(rand()) * (1 - ABYSS_R);
  return { x: WATER.cx + Math.cos(angle) * WATER.rx * r, y: WATER.cy + Math.sin(angle) * WATER.ry * r, r };
}

interface LakeAmbienceProps {
  night: boolean;
}

/**
 * The lake's ambient life.
 *
 * The first version of this screen shipped as a *still painting* with three pulsing circles on it —
 * the ripples and the jumping fish existed only in the cast modal and on the world-map node, i.e.
 * nowhere near the screen the player actually sits on. Called out directly ("ya aucune animation").
 * This layer is the fix: the water surface itself now moves at all times.
 *
 * It is CSS/motion over the painted backdrop rather than an animated water spritesheet, for the
 * reason already settled by the Cité's rebuild — the art *already draws* the water, so making its
 * own light and surface move reads as the scene being alive, while tiling a second water texture on
 * top never blends. The one exception is the jumping fish, which is real sprite art because a fish
 * breaking the surface is a shape CSS cannot fake.
 *
 * Positions are seeded (not `Math.random` at render) so the field is stable across re-renders — the
 * same reason `starfield.ts` exists. Every loop is skipped under `prefers-reduced-motion`.
 */
export default function LakeAmbience({ night }: LakeAmbienceProps) {
  const reduceMotion = useReducedMotion();
  const [fish, setFish] = useState<{ id: number; x: number; y: number; flip: boolean } | null>(null);

  const ripples = useMemo(() => {
    const rand = mulberry32(20260822);
    return Array.from({ length: 9 }, (_, i) => {
      const p = waterPoint(rand);
      return {
        id: i,
        x: p.x,
        y: p.y,
        size: 26 + rand() * 46,
        duration: 4.2 + rand() * 3.4,
        delay: rand() * 6,
      };
    });
  }, []);

  const shimmer = useMemo(() => {
    const rand = mulberry32(770315);
    return Array.from({ length: 5 }, (_, i) => {
      const p = waterPoint(rand);
      return {
        id: i,
        x: p.x,
        y: p.y,
        size: 26 + rand() * 22,
        duration: 11 + rand() * 9,
        delay: rand() * 8,
        drift: 4 + rand() * 7,
      };
    });
  }, []);

  const mist = useMemo(() => {
    const rand = mulberry32(4451209);
    return Array.from({ length: 4 }, (_, i) => ({
      id: i,
      y: 30 + rand() * 44,
      height: 8 + rand() * 12,
      duration: 26 + rand() * 18,
      delay: rand() * 12,
      opacity: 0.14 + rand() * 0.16,
    }));
  }, []);

  // A fish breaks the surface every 5-9s at a fresh spot. Self-rescheduling rather than a fixed
  // interval so the rhythm is irregular — a metronomic jump reads as a UI tick, not as wildlife.
  useEffect(() => {
    if (reduceMotion) return;
    let hideTimer: ReturnType<typeof setTimeout>;
    let nextTimer: ReturnType<typeof setTimeout>;
    let n = 0;
    const schedule = () => {
      nextTimer = setTimeout(() => {
        const p = waterPoint(Math.random);
        setFish({ id: n++, x: p.x, y: p.y, flip: Math.random() < 0.5 });
        hideTimer = setTimeout(() => {
          setFish(null);
          schedule();
        }, 900);
      }, 5000 + Math.random() * 4000);
    };
    schedule();
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 1. Surface shimmer — soft light patches sliding over the water on `screen`, so they
             brighten the painted surface instead of sitting on it as grey blobs. */}
      {shimmer.map((s) => (
        <motion.div
          key={`sh-${s.id}`}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}%`,
            height: `${s.size * 0.55}%`,
            transform: "translate(-50%, -50%)",
            background: night
              ? "radial-gradient(ellipse, rgba(150,200,255,0.20), transparent 70%)"
              : "radial-gradient(ellipse, rgba(255,255,255,0.22), transparent 70%)",
            mixBlendMode: "screen",
            filter: "blur(6px)",
          }}
          animate={{
            x: [`-${s.drift}%`, `${s.drift}%`, `-${s.drift}%`],
            opacity: [0.35, 0.85, 0.35],
            scaleY: [1, 1.18, 1],
          }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* 2. Expanding ripple rings across the whole surface — the single strongest "this is water
             and it is moving" cue, and the thing the still version was missing entirely. */}
      {ripples.map((r) => (
        <motion.span
          key={`rp-${r.id}`}
          className="absolute rounded-full border"
          style={{
            left: `${r.x}%`,
            top: `${r.y}%`,
            translateX: "-50%",
            translateY: "-50%",
            borderColor: night ? "rgba(165,220,255,0.45)" : "rgba(255,255,255,0.5)",
          }}
          animate={{ width: [0, r.size], height: [0, r.size * 0.55], opacity: [0, 0.65, 0] }}
          transition={{ duration: r.duration, delay: r.delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}

      {/* 3. The abyss breathes — a slow dark pulse over the central pit, so the deepest part of the
             lake feels like it has something in it rather than being a painted hole. */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: `${WATER.cx}%`,
          top: `${WATER.cy}%`,
          width: `${WATER.rx * 1.15}%`,
          height: `${WATER.ry * 1.5}%`,
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(ellipse, rgba(2,10,30,0.55), transparent 68%)",
          filter: "blur(10px)",
        }}
        animate={{ opacity: [0.45, 0.85, 0.45], scale: [1, 1.06, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 4. Night only: fog banks drifting across the water, which is also the visual promise that
             the Cœur Brumeux is open. */}
      {night &&
        mist.map((m) => (
          <motion.div
            key={`mi-${m.id}`}
            className="absolute left-0 w-[140%]"
            style={{
              top: `${m.y}%`,
              height: `${m.height}%`,
              background:
                "linear-gradient(90deg, transparent, rgba(190,225,255,0.55) 35%, rgba(190,225,255,0.55) 65%, transparent)",
              filter: "blur(9px)",
              opacity: m.opacity,
            }}
            animate={{ x: ["-30%", "0%", "-30%"] }}
            transition={{ duration: m.duration, delay: m.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

      {/* 5. The jumping fish — real sprite art, plus the ring it leaves behind on landing. */}
      <AnimatePresence>
        {fish && (
          <motion.div
            key={fish.id}
            className="absolute"
            style={{ left: `${fish.x}%`, top: `${fish.y}%`, translateX: "-50%", translateY: "-50%" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.img
              src={FISH_SPLASH}
              alt=""
              className="h-9 w-9 object-contain"
              style={{ imageRendering: "pixelated", transform: fish.flip ? "scaleX(-1)" : undefined }}
              initial={{ y: 6, scale: 0.5, opacity: 0 }}
              animate={{ y: [6, -14, 4], scale: [0.5, 1, 0.7], opacity: [0, 1, 0] }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
            <motion.span
              className="absolute left-1/2 top-1/2 rounded-full border border-white/60"
              style={{ translateX: "-50%", translateY: "-50%" }}
              initial={{ width: 4, height: 3, opacity: 0 }}
              animate={{ width: 54, height: 30, opacity: [0, 0.7, 0] }}
              transition={{ duration: 1.1, delay: 0.35, ease: "easeOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
