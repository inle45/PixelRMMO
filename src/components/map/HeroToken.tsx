import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { heroMarkerIcon } from "../../data/worldMap";

interface HeroTokenProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** True while a travel animation should be playing from `from` to `to`. */
  traveling: boolean;
  onArrive: () => void;
}

/**
 * The hero's position marker. Walking between nodes is a single motion value `t` (0→1) driving
 * both axes at once — `left`/`top` lerp straight toward the destination while a `sin(t·π)` bump
 * lifts the marker at the midpoint, reading as a shallow hop over the terrain rather than a straight
 * slide underneath it.
 */
export default function HeroToken({ from, to, traveling, onArrive }: HeroTokenProps) {
  const t = useMotionValue(traveling ? 0 : 1);
  const left = useTransform(t, (v) => `${from.x + (to.x - from.x) * v}%`);
  const top = useTransform(t, (v) => `${from.y + (to.y - from.y) * v}%`);
  // Anchor (-100%, sitting the marker's tip on its point) and the mid-walk hop bump are both
  // translate-Y concerns, so they're combined into one framer-motion `y` value rather than split
  // between an inline `style.transform` and an animated one — framer-motion owns the `transform`
  // property outright, and a manual translate on the same element would silently lose to it (the
  // same collision documented for the camp diorama's placed sprites).
  const y = useTransform(t, (v) => `calc(-100% + ${-Math.sin(v * Math.PI) * 6}px)`);

  useEffect(() => {
    if (!traveling) {
      t.set(1);
      return;
    }
    t.set(0);
    const controls = animate(t, 1, { duration: 1.3, ease: "easeInOut", onComplete: onArrive });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traveling, to.x, to.y]);

  if (!heroMarkerIcon) return null;

  return (
    <motion.div className="pointer-events-none absolute z-20" style={{ left, top, x: "-50%", y }}>
      <motion.img
        src={heroMarkerIcon}
        alt="Position du héros"
        className="h-8 w-8 drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)]"
        style={{ imageRendering: "pixelated" }}
        animate={traveling ? {} : { scale: [1, 1.08, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}
