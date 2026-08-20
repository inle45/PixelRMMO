import { useMemo } from "react";
import { generateStars } from "./starfield";
import towerImg from "../../assets/scene/tower-1.png";
import houseImg from "../../assets/scene/house-wide.png";
import twinTowersImg from "../../assets/scene/twin-towers.png";
import castleImg from "../../assets/scene/castle.png";
import lamppostImg from "../../assets/scene/lamppost.png";

/** Height (in vh) of the water zone, measured from the bottom of the viewport. */
const GROUND = 38;

interface Building {
  src: string;
  left: number; // % of scene width
  heightVh: number;
  flip?: boolean;
}

const SKYLINE: Building[] = [
  { src: castleImg, left: -2, heightVh: 30 },
  { src: houseImg, left: 12, heightVh: 20, flip: true },
  { src: twinTowersImg, left: 27, heightVh: 27 },
  { src: towerImg, left: 45, heightVh: 36 },
  { src: houseImg, left: 63, heightVh: 21 },
  { src: twinTowersImg, left: 76, heightVh: 25, flip: true },
  { src: castleImg, left: 89, heightVh: 29, flip: true },
];

interface Lantern {
  left: number;
  delay: number;
}

const LANTERNS: Lantern[] = [
  { left: 8, delay: 0 },
  { left: 34, delay: 0.6 },
  { left: 58, delay: 1.2 },
  { left: 84, delay: 0.3 },
];

const FIREFLIES = [
  { x: 18, dur: 9, delay: 0 },
  { x: 34, dur: 11, delay: 2 },
  { x: 58, dur: 8, delay: 4 },
  { x: 74, dur: 10, delay: 1 },
  { x: 89, dur: 12, delay: 3 },
];

const imgStyle: React.CSSProperties = { imageRendering: "pixelated" };

/**
 * Medieval-fantasy pixel-art night skyline with a reflecting pond, built from
 * PixelLab-generated building/lamppost sprites layered with CSS-animated glow/shimmer.
 */
export default function NightSceneBackground() {
  const stars = useMemo(() => generateStars(90), []);

  const buildingSprite = (b: Building, i: number, mode: "normal" | "reflection") => {
    const scaleX = b.flip ? -1 : 1;
    return (
      <img
        key={i}
        src={b.src}
        alt=""
        style={{
          ...imgStyle,
          position: "absolute",
          left: `${b.left}%`,
          height: `${b.heightVh}vh`,
          width: "auto",
          ...(mode === "normal" ? { bottom: 0 } : { top: 0 }),
          transform: `scaleX(${scaleX}) scaleY(${mode === "reflection" ? -1 : 1})`,
        }}
      />
    );
  };

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#05070f]" aria-hidden="true">
      {/* Sky */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, #05070f 0%, #0e1530 55%, #1b2647 100%)" }}
      />

      {/* Moon */}
      <div className="absolute" style={{ left: "78%", top: "9%", width: 90, height: 90 }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,246,216,0.55), transparent 70%)" }}
        />
        <div
          className="absolute rounded-full bg-[#f4ecd8]"
          style={{ left: "25%", top: "25%", width: "50%", height: "50%", boxShadow: "inset -6px -4px 0 rgba(220,208,176,0.6)" }}
        />
      </div>

      {/* Stars */}
      {stars.map((s, i) => (
        <span
          key={i}
          className="animate-twinkle absolute bg-[#fdf6e3]"
          style={
            {
              left: `${(s.x / 1600) * 100}%`,
              top: `${(s.y / 900) * 100}%`,
              width: s.size,
              height: s.size,
              "--dur": `${s.dur}s`,
              "--delay": `${s.delay}s`,
              "--star-min": s.min,
              "--star-max": s.max,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Skyline */}
      <div className="absolute inset-x-0" style={{ bottom: `${GROUND}%`, height: 0 }}>
        {SKYLINE.map((b, i) => buildingSprite(b, i, "normal"))}
      </div>

      {/* Lampposts */}
      {LANTERNS.map((l, i) => (
        <img
          key={i}
          src={lamppostImg}
          alt=""
          style={{
            ...imgStyle,
            position: "absolute",
            left: `${l.left}%`,
            bottom: `${GROUND}%`,
            height: "13vh",
            width: "auto",
            zIndex: 5,
          }}
        />
      ))}

      {/* Foreground dock silhouette band */}
      <div className="absolute inset-x-0" style={{ bottom: `${GROUND - 2}%`, height: "2%", background: "#0c1122" }} />

      {/* Water */}
      <div
        className="absolute inset-x-0 bottom-0 overflow-hidden"
        style={{ top: `${100 - GROUND}%`, background: "linear-gradient(to bottom, #173349, #060b14)" }}
      >
        {/* Reflection of skyline, flipped + softened */}
        <div
          className="absolute inset-x-0 top-0"
          style={{
            opacity: 0.35,
            height: "70%",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
            maskImage: "linear-gradient(to bottom, black, transparent)",
          }}
        >
          {SKYLINE.map((b, i) => buildingSprite(b, i, "reflection"))}
        </div>

        {/* Reflected lantern light columns */}
        {LANTERNS.map((l, i) => (
          <div
            key={i}
            className="animate-water absolute top-0"
            style={{
              left: `${l.left}%`,
              width: "3%",
              height: "45%",
              transform: "translateX(-40%)",
              background: "linear-gradient(to bottom, rgba(255,207,107,0.5), transparent)",
              animationDelay: `${l.delay}s`,
            }}
          />
        ))}

        {/* Shimmer bands over the water */}
        <div className="animate-water absolute inset-x-0" style={{ top: "12%", height: "3%", background: "#8fb8d8", opacity: 0.12 }} />
        <div
          className="animate-water absolute inset-x-0"
          style={{ top: "32%", height: "4%", background: "#8fb8d8", opacity: 0.1, animationDelay: "1.2s" }}
        />
        <div
          className="animate-water absolute inset-x-0"
          style={{ top: "56%", height: "5%", background: "#8fb8d8", opacity: 0.08, animationDelay: "2.4s" }}
        />
      </div>

      {/* Lantern glows (HTML layer) */}
      {LANTERNS.map((l, i) => (
        <span
          key={i}
          className="animate-lantern absolute rounded-full bg-lantern"
          style={{
            left: `${l.left}%`,
            bottom: `${GROUND + 9}%`,
            width: 12,
            height: 12,
            transform: "translate(-50%, -50%)",
            animationDelay: `${l.delay}s`,
          }}
        />
      ))}

      {/* Fireflies / embers drifting upward */}
      {FIREFLIES.map((f, i) => (
        <span
          key={i}
          className="animate-float-up absolute h-1 w-1 rounded-full bg-ember"
          style={{
            left: `${f.x}%`,
            bottom: "20%",
            boxShadow: "0 0 6px 2px rgba(255,122,69,0.6)",
            ["--dur" as string]: `${f.dur}s`,
            ["--delay" as string]: `${f.delay}s`,
          }}
        />
      ))}

      {/* Vignette so the glass card reads clearly on top */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(5,7,15,0.55)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-black/25" />
    </div>
  );
}
