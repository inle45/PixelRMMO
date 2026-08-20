import type { CSSProperties, ReactNode } from "react";
import { motion } from "framer-motion";
import { RARITY_BY_ID, type RarityId } from "../../data/rarity";

interface RarityFrameProps {
  rarity: RarityId;
  radius?: string;
  className?: string;
  children: ReactNode;
  /** When set, the bordered wrapper becomes a clickable motion.button sharing this layoutId with its FLIP twin. */
  layoutId?: string;
  onClick?: () => void;
}

const PULSE_DURATION: Partial<Record<RarityId, string>> = {
  uncommon: "3s",
  rare: "2.2s",
  epic: "1.7s",
  legendary: "2.6s",
};

const SPARKLE_SPOTS = [
  { top: "6%", left: "10%", dur: "2.4s", delay: "0s" },
  { top: "14%", left: "84%", dur: "3.1s", delay: "0.6s" },
  { top: "80%", left: "16%", dur: "2.7s", delay: "1.1s" },
  { top: "88%", left: "78%", dur: "3.4s", delay: "0.3s" },
  { top: "46%", left: "94%", dur: "2.9s", delay: "0.9s" },
];

/** Wraps card/icon content with the visual treatment for its rarity tier — border color always,
 * escalating from a static tint (poor/common) through a pulsing glow (uncommon-legendary, gold pulsing
 * slower/richer than the rest) and a flame-like flicker (mythic), to a multi-color layered halo plus
 * twinkling sparkles at the transcendent tier. */
export default function RarityFrame({
  rarity,
  radius = "rounded-2xl",
  className = "",
  children,
  layoutId,
  onClick,
}: RarityFrameProps) {
  const def = RARITY_BY_ID[rarity];
  const tier = def.tier;
  const isPrismatic = tier === 8;

  let glowClassName = "";
  let glowStyle: CSSProperties = {};
  if (isPrismatic) {
    glowClassName = "animate-rarity-prismatic";
  } else if (tier === 6) {
    glowClassName = "animate-rarity-flicker";
    glowStyle = { "--glow-color": def.color } as CSSProperties;
  } else if (tier >= 3) {
    glowClassName = "animate-rarity-pulse";
    glowStyle = { "--glow-color": def.color, "--dur": PULSE_DURATION[def.id] ?? "2s" } as CSSProperties;
  } else if (tier === 2) {
    glowStyle = { boxShadow: `0 0 8px 0 ${def.color}55` };
  }

  const borderStyle = { borderColor: def.color, ...glowStyle };
  const borderClassName = `relative w-full ${radius} border-2 text-left ${glowClassName}`;

  return (
    <div className={`relative ${className}`}>
      {onClick ? (
        <motion.button
          type="button"
          layoutId={layoutId}
          onClick={onClick}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className={borderClassName}
          style={borderStyle}
        >
          {children}
        </motion.button>
      ) : (
        <motion.div layoutId={layoutId} transition={{ type: "spring", stiffness: 260, damping: 28 }} className={borderClassName} style={borderStyle}>
          {children}
        </motion.div>
      )}
      {isPrismatic &&
        SPARKLE_SPOTS.map((s, i) => (
          <span
            key={i}
            className="animate-twinkle pointer-events-none absolute h-1 w-1 rounded-full bg-white"
            style={
              {
                top: s.top,
                left: s.left,
                "--dur": s.dur,
                "--delay": s.delay,
                "--star-min": "0.2",
                "--star-max": "1",
              } as CSSProperties
            }
            aria-hidden
          />
        ))}
    </div>
  );
}
