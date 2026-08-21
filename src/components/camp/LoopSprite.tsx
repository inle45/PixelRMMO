import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

interface LoopSpriteProps {
  frames: string[];
  frameDuration?: number;
  alt: string;
  className?: string;
  style?: CSSProperties;
  /** Pauses the loop (used by the calibrator so a frame can be lined up precisely). */
  paused?: boolean;
}

/**
 * A plain continuous frame loop. Deliberately not `AnimatedSprite`: that one hardcodes a
 * `drop-shadow` and randomly holds frames an extra beat — both right for a breathing character
 * portrait and both wrong here, where a campfire has to crackle on a steady beat and the sprite's
 * shadow/lighting is supplied by the stage's own per-period filter instead.
 */
export default function LoopSprite({
  frames,
  frameDuration = 200,
  alt,
  className,
  style,
  paused = false,
}: LoopSpriteProps) {
  const [tick, setTick] = useState(0);
  const preloaded = useRef(false);

  useEffect(() => {
    if (preloaded.current) return;
    preloaded.current = true;
    frames.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (paused || frames.length < 2) return;
    const id = setInterval(() => setTick((t) => t + 1), frameDuration);
    return () => clearInterval(id);
  }, [paused, frames.length, frameDuration]);

  if (frames.length === 0) return null;

  return (
    <img
      src={frames[tick % frames.length]}
      alt={alt}
      className={className}
      style={{ imageRendering: "pixelated", ...style }}
      draggable={false}
    />
  );
}
