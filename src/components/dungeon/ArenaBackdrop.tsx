import { useMemo } from "react";
import { motion } from "framer-motion";
import arenaBg from "../../assets/dungeon/arena-bg.png";
import bossArenaBg from "../../assets/dungeon/boss-arena-bg.png";
import fgPillars from "../../assets/dungeon/vfx/arena-fg-pillars.png";

/** Fades the foreground pillar layer's own duplicate scene down to just its left/right edges, letting arenaBg show through the middle. */
const EDGE_MASK =
  "linear-gradient(to right, black 0%, black 12%, transparent 32%, transparent 68%, black 88%, black 100%)";

/** Soft full-screen color wash per active weather — same palette as WeatherParticles, low-opacity so it grades the scene without crushing contrast. */
const WEATHER_TINT: Record<string, string> = {
  deluge: "rgba(59,130,246,0.10)",
  sepulchral_mist: "rgba(148,163,184,0.14)",
  furnace: "rgba(249,115,22,0.12)",
  blizzard: "rgba(191,219,254,0.14)",
  magnetic_storm: "rgba(250,204,21,0.08)",
  blood_eclipse: "rgba(220,38,38,0.16)",
};

/** Hand-drawn jagged crack paths (400×240 viewBox), each revealed once boss HP drops below its threshold. */
const CRACKS: { d: string; threshold: number }[] = [
  { d: "M 60 0 L 68 30 L 55 55 L 72 90 L 58 130", threshold: 80 },
  { d: "M 400 40 L 370 60 L 385 85 L 355 110 L 375 150", threshold: 60 },
  { d: "M 200 0 L 210 25 L 190 45 L 205 70", threshold: 40 },
  { d: "M 0 180 L 35 170 L 25 195 L 60 200", threshold: 20 },
  { d: "M 340 200 L 320 215 L 340 230 L 310 240", threshold: 8 },
];

interface ArenaBackdropProps {
  weatherId: string;
  isBossWave: boolean;
  bossHpPct?: number;
}

/**
 * Two independently-drifting image layers instead of one flat backdrop — a slow Ken Burns zoom on
 * the base scene plus a closer, edge-masked pillar layer panning at a different rate. Neither layer
 * is a real camera move (the arena is a fixed single screen), but the differential motion between
 * them reads as parallax depth rather than a static painting.
 */
export default function ArenaBackdrop({ weatherId, isBossWave, bossHpPct = 100 }: ArenaBackdropProps) {
  const tint = WEATHER_TINT[weatherId];

  const debris = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        left: 10 + Math.random() * 80,
        size: 3 + Math.random() * 4,
        duration: 3 + Math.random() * 3,
        delay: Math.random() * 5,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.img
        key={isBossWave ? "boss" : "normal"}
        src={isBossWave ? bossArenaBg : arenaBg}
        alt=""
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, scale: [1, 1.06, 1] }}
        transition={{ opacity: { duration: 1 }, scale: { duration: 26, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ imageRendering: "pixelated" }}
      />
      <motion.img
        src={fgPillars}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          imageRendering: "pixelated",
          maskImage: EDGE_MASK,
          WebkitMaskImage: EDGE_MASK,
        }}
        animate={{ x: [-3, 3, -3], scale: [1.03, 1.06, 1.03] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      {tint && <div className="absolute inset-0" style={{ background: tint }} />}
      {isBossWave && <div className="absolute inset-0 bg-rose-900/15" />}

      {isBossWave && (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
          {CRACKS.map((c, i) => (
            <motion.path
              key={i}
              d={c.d}
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={1.2}
              animate={{ opacity: bossHpPct <= c.threshold ? 1 : 0 }}
              transition={{ duration: 0.8 }}
            />
          ))}
        </svg>
      )}

      {isBossWave &&
        debris.map((d) => (
          <motion.div
            key={d.id}
            className="absolute top-[-6%] rounded-[1px] bg-stone-500/70"
            style={{ left: `${d.left}%`, width: d.size, height: d.size }}
            animate={{ y: ["0vh", "110vh"], rotate: [0, 180] }}
            transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: "linear" }}
          />
        ))}

      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/75" />
    </div>
  );
}
