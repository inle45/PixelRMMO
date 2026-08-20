import { useEffect, useRef, useState } from "react";

interface AnimatedSpriteProps {
  idleSrc: string;
  attackFrames: string[];
  playing: boolean;
  onFinish: () => void;
  alt: string;
  frameDuration?: number;
}

export default function AnimatedSprite({
  idleSrc,
  attackFrames,
  playing,
  onFinish,
  alt,
  frameDuration = 90,
}: AnimatedSpriteProps) {
  const [frameIndex, setFrameIndex] = useState(-1);
  const preloaded = useRef(false);

  useEffect(() => {
    if (preloaded.current || attackFrames.length === 0) return;
    preloaded.current = true;
    attackFrames.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [attackFrames]);

  useEffect(() => {
    if (!playing || attackFrames.length === 0) return;

    let frame = 0;
    setFrameIndex(0);

    const id = setInterval(() => {
      frame += 1;
      if (frame >= attackFrames.length) {
        clearInterval(id);
        setFrameIndex(-1);
        onFinish();
      } else {
        setFrameIndex(frame);
      }
    }, frameDuration);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const src = frameIndex >= 0 ? attackFrames[frameIndex] : idleSrc;

  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)]"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
