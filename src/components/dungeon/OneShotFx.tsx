import { useEffect, useState, type CSSProperties } from "react";

interface OneShotFxProps {
  frames: string[];
  onDone?: () => void;
  frameDuration?: number;
  className?: string;
  style?: CSSProperties;
}

/** Plays a frame sequence exactly once and calls onDone — the impact/death VFX equivalent of AnimatedSprite's attack loop. */
export default function OneShotFx({ frames, onDone, frameDuration = 60, className, style }: OneShotFxProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (frames.length === 0) {
      onDone?.();
      return;
    }
    let frame = 0;
    const id = setInterval(() => {
      frame += 1;
      if (frame >= frames.length) {
        clearInterval(id);
        onDone?.();
      } else {
        setIndex(frame);
      }
    }, frameDuration);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (frames.length === 0) return null;

  return <img src={frames[index]} alt="" className={className} style={{ imageRendering: "pixelated", ...style }} />;
}
