import { motion } from "framer-motion";
import arenaBg from "../../assets/dungeon/arena-bg.png";
import fgPillars from "../../assets/dungeon/vfx/arena-fg-pillars.png";

/** Fades the foreground pillar layer's own duplicate scene down to just its left/right edges, letting arenaBg show through the middle. */
const EDGE_MASK =
  "linear-gradient(to right, black 0%, black 12%, transparent 32%, transparent 68%, black 88%, black 100%)";

/**
 * Two independently-drifting image layers instead of one flat backdrop — a slow Ken Burns zoom on
 * the base scene plus a closer, edge-masked pillar layer panning at a different rate. Neither layer
 * is a real camera move (the arena is a fixed single screen), but the differential motion between
 * them reads as parallax depth rather than a static painting.
 */
export default function ArenaBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.img
        src={arenaBg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ imageRendering: "pixelated" }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
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
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/75" />
    </div>
  );
}
