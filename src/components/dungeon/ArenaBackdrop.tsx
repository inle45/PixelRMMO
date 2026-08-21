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

interface ArenaBackdropProps {
  weatherId: string;
  isBossWave: boolean;
}

/**
 * Two independently-drifting image layers instead of one flat backdrop — a slow Ken Burns zoom on
 * the base scene plus a closer, edge-masked pillar layer panning at a different rate. Neither layer
 * is a real camera move (the arena is a fixed single screen), but the differential motion between
 * them reads as parallax depth rather than a static painting.
 */
export default function ArenaBackdrop({ weatherId, isBossWave }: ArenaBackdropProps) {
  const tint = WEATHER_TINT[weatherId];
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
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/75" />
    </div>
  );
}
