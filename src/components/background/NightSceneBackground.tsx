import { useMemo } from "react";
import { generateStars } from "./starfield";

interface Lantern {
  x: number;
  y: number;
  delay: number;
}

const LANTERNS: Lantern[] = [
  { x: 120, y: 466, delay: 0 },
  { x: 430, y: 466, delay: 0.6 },
  { x: 980, y: 466, delay: 1.2 },
  { x: 1310, y: 466, delay: 0.3 },
];

const FIREFLIES = [
  { x: 18, dur: 9, delay: 0 },
  { x: 34, dur: 11, delay: 2 },
  { x: 58, dur: 8, delay: 4 },
  { x: 74, dur: 10, delay: 1 },
  { x: 89, dur: 12, delay: 3 },
];

/**
 * Medieval-fantasy pixel-art night skyline with a reflecting pond,
 * built from flat SVG blocks (crispEdges) plus CSS-animated glow/shimmer layers.
 */
export default function NightSceneBackground() {
  const stars = useMemo(() => generateStars(90), []);

  const Skyline = (
    <g shapeRendering="crispEdges">
      {/* Far towers */}
      <rect x="40" y="300" width="60" height="220" fill="#141a2e" />
      <polygon points="40,300 70,250 100,300" fill="#141a2e" />
      <rect x="180" y="340" width="90" height="180" fill="#161c33" />
      <rect x="190" y="300" width="70" height="40" fill="#161c33" />
      <polygon points="190,300 225,255 260,300" fill="#161c33" />

      <rect x="330" y="370" width="130" height="150" fill="#141a2e" />
      <rect x="360" y="330" width="20" height="40" fill="#141a2e" />
      <rect x="410" y="330" width="20" height="40" fill="#141a2e" />

      <rect x="500" y="320" width="80" height="200" fill="#181f38" />
      <polygon points="500,320 540,265 580,320" fill="#181f38" />

      <rect x="610" y="380" width="160" height="140" fill="#141a2e" />
      <rect x="650" y="345" width="24" height="40" fill="#141a2e" />
      <rect x="700" y="345" width="24" height="40" fill="#141a2e" />

      {/* Central grand tower */}
      <rect x="790" y="260" width="100" height="260" fill="#1b2340" />
      <polygon points="790,260 840,190 890,260" fill="#1b2340" />
      <rect x="825" y="215" width="30" height="30" fill="#0b0f1a" />

      <rect x="910" y="360" width="140" height="160" fill="#161c33" />
      <rect x="940" y="330" width="20" height="35" fill="#161c33" />
      <rect x="995" y="330" width="20" height="35" fill="#161c33" />

      <rect x="1070" y="310" width="90" height="210" fill="#181f38" />
      <polygon points="1070,310 1115,255 1160,310" fill="#181f38" />

      <rect x="1180" y="380" width="150" height="140" fill="#141a2e" />
      <rect x="1215" y="345" width="22" height="40" fill="#141a2e" />
      <rect x="1270" y="345" width="22" height="40" fill="#141a2e" />

      <rect x="1350" y="330" width="80" height="190" fill="#161c33" />
      <polygon points="1350,330 1390,280 1430,330" fill="#161c33" />

      <rect x="1450" y="370" width="120" height="150" fill="#141a2e" />
      <rect x="1480" y="335" width="18" height="38" fill="#141a2e" />
      <rect x="1525" y="335" width="18" height="38" fill="#141a2e" />

      {/* Lit windows */}
      {[
        [70, 340], [70, 380], [210, 380], [230, 420], [360, 410], [400, 450],
        [530, 360], [530, 400], [650, 420], [700, 460], [830, 300], [830, 340],
        [830, 380], [950, 400], [1000, 440], [1100, 360], [1100, 400], [1220, 420],
        [1280, 460], [1380, 380], [1500, 420],
      ].map(([wx, wy], i) => (
        <rect
          key={i}
          x={wx}
          y={wy}
          width="8"
          height="10"
          fill="#ffcf6b"
          opacity={0.55 + ((i * 37) % 45) / 100}
        />
      ))}
    </g>
  );

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#0b0f1a]" aria-hidden="true">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#05070f" />
            <stop offset="55%" stopColor="#0e1530" />
            <stop offset="100%" stopColor="#1b2647" />
          </linearGradient>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#173349" />
            <stop offset="100%" stopColor="#060b14" />
          </linearGradient>
          <linearGradient id="lanternReflection" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffcf6b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffcf6b" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff6d8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fff6d8" stopOpacity="0" />
          </radialGradient>
          <clipPath id="waterClip">
            <rect x="0" y="560" width="1600" height="340" />
          </clipPath>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width="1600" height="900" fill="url(#sky)" />

        {/* Moon */}
        <circle cx="1300" cy="120" r="70" fill="url(#moonGlow)" />
        <circle cx="1300" cy="120" r="34" fill="#f4ecd8" shapeRendering="crispEdges" />
        <circle cx="1288" cy="108" r="6" fill="#dcd0b0" shapeRendering="crispEdges" />
        <circle cx="1312" cy="130" r="4" fill="#dcd0b0" shapeRendering="crispEdges" />

        {/* Stars (rendered as CSS-animated foreignObject-free rects below sky, positioned via HTML overlay) */}
        {stars.map((s, i) => (
          <rect
            key={i}
            x={s.x}
            y={s.y}
            width={s.size}
            height={s.size}
            fill="#fdf6e3"
            shapeRendering="crispEdges"
            className="animate-twinkle"
            style={
              {
                "--dur": `${s.dur}s`,
                "--delay": `${s.delay}s`,
                "--star-min": s.min,
                "--star-max": s.max,
                transformOrigin: `${s.x + s.size / 2}px ${s.y + s.size / 2}px`,
              } as React.CSSProperties
            }
          />
        ))}

        {/* Skyline */}
        {Skyline}

        {/* Lampposts (pixel iron poles + lantern housing) */}
        <g shapeRendering="crispEdges">
          {LANTERNS.map((l, i) => (
            <g key={i}>
              <rect x={l.x - 3} y={l.y + 8} width="6" height="86" fill="#241a12" />
              <rect x={l.x - 12} y={l.y} width="24" height="6" fill="#241a12" />
              <rect x={l.x - 9} y={l.y - 16} width="18" height="18" fill="#3a2a1a" />
              <rect x={l.x - 6} y={l.y - 13} width="12" height="12" fill="#ffcf6b" />
            </g>
          ))}
        </g>

        {/* Foreground dock silhouette */}
        <rect x="0" y="520" width="1600" height="60" fill="#0c1122" />

        {/* Water */}
        <rect x="0" y="560" width="1600" height="340" fill="url(#water)" />

        {/* Reflection of skyline, flipped + softened */}
        <g clipPath="url(#waterClip)" opacity="0.4">
          <g transform="translate(0, 1160) scale(1, -1)">{Skyline}</g>
        </g>

        {/* Reflected lantern light columns in the water */}
        <g clipPath="url(#waterClip)">
          {LANTERNS.map((l, i) => (
            <rect
              key={i}
              x={l.x - 16}
              y="560"
              width="32"
              height="180"
              fill="url(#lanternReflection)"
              className="animate-water"
              style={{ animationDelay: `${l.delay}s` }}
            />
          ))}
        </g>

        {/* Shimmer bands over the water */}
        <g clipPath="url(#waterClip)">
          <rect
            x="0"
            y="600"
            width="1600"
            height="10"
            fill="#8fb8d8"
            opacity="0.12"
            className="animate-water"
          />
          <rect
            x="0"
            y="660"
            width="1600"
            height="14"
            fill="#8fb8d8"
            opacity="0.1"
            className="animate-water"
            style={{ animationDelay: "1.2s" }}
          />
          <rect
            x="0"
            y="740"
            width="1600"
            height="18"
            fill="#8fb8d8"
            opacity="0.08"
            className="animate-water"
            style={{ animationDelay: "2.4s" }}
          />
        </g>
      </svg>

      {/* Lantern glows (HTML layer, positioned to match the SVG viewBox in %) */}
      {LANTERNS.map((l, i) => (
        <span
          key={i}
          className="animate-lantern absolute rounded-full bg-lantern"
          style={{
            left: `${(l.x / 1600) * 100}%`,
            top: `${((l.y - 7) / 900) * 100}%`,
            width: 14,
            height: 14,
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
