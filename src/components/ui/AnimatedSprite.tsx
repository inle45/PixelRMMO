import { useEffect, useRef, useState } from "react";

interface AnimatedSpriteProps {
  idleSrc: string;
  idleFrames?: string[];
  attackFrames?: string[];
  playing?: boolean;
  onFinish?: () => void;
  alt: string;
  frameDuration?: number;
  idleFrameDuration?: number;
}

export default function AnimatedSprite({
  idleSrc,
  idleFrames = [],
  attackFrames = [],
  playing = false,
  onFinish,
  alt,
  frameDuration = 90,
  idleFrameDuration = 220,
}: AnimatedSpriteProps) {
  const [attackFrameIndex, setAttackFrameIndex] = useState(-1);
  const [idleTick, setIdleTick] = useState(0);
  const preloaded = useRef(false);

  useEffect(() => {
    if (preloaded.current) return;
    preloaded.current = true;
    [...idleFrames, ...attackFrames].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (idleFrames.length < 2 || playing) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    // A perfectly uniform interval reads as mechanical — occasionally hold a frame a beat longer,
    // like a breath caught, so the loop doesn't feel like a metronome.
    function schedule() {
      const extraPause = Math.random() < 0.15 ? 400 + Math.random() * 300 : 0;
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        setIdleTick((t) => t + 1);
        schedule();
      }, idleFrameDuration + extraPause);
    }
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [idleFrames.length, playing, idleFrameDuration]);

  useEffect(() => {
    if (!playing || attackFrames.length === 0) return;

    let frame = 0;
    setAttackFrameIndex(0);

    const id = setInterval(() => {
      frame += 1;
      if (frame >= attackFrames.length) {
        clearInterval(id);
        setAttackFrameIndex(-1);
        onFinish?.();
      } else {
        setAttackFrameIndex(frame);
      }
    }, frameDuration);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const src =
    attackFrameIndex >= 0
      ? attackFrames[attackFrameIndex]
      : idleFrames.length > 0
        ? idleFrames[idleTick % idleFrames.length]
        : idleSrc;

  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)]"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
