import { useMemo } from "react";
import { motion } from "framer-motion";

interface ParticleStyle {
  color: string;
  count: number;
  minSize: number;
  maxSize: number;
  minDuration: number;
  maxDuration: number;
  drift: "fall" | "rise" | "drift" | "flicker";
  blur?: number;
  shape?: "streak" | "dot";
}

/** One ambient-particle recipe per weather id — mirrors weather.json's 6 states. */
const WEATHER_STYLE: Record<string, ParticleStyle> = {
  deluge: { color: "#93c5fd", count: 26, minSize: 1, maxSize: 2, minDuration: 0.6, maxDuration: 1.1, drift: "fall", shape: "streak" },
  sepulchral_mist: { color: "#cbd5e1", count: 7, minSize: 60, maxSize: 120, minDuration: 10, maxDuration: 18, drift: "drift", blur: 8 },
  furnace: { color: "#fb923c", count: 14, minSize: 2, maxSize: 4, minDuration: 3, maxDuration: 5.5, drift: "rise", blur: 1 },
  blizzard: { color: "#f0f9ff", count: 20, minSize: 2, maxSize: 4, minDuration: 4, maxDuration: 7, drift: "fall", shape: "dot" },
  magnetic_storm: { color: "#fde047", count: 10, minSize: 2, maxSize: 3, minDuration: 0.8, maxDuration: 1.6, drift: "flicker" },
  blood_eclipse: { color: "#f87171", count: 9, minSize: 3, maxSize: 6, minDuration: 6, maxDuration: 10, drift: "drift", blur: 2 },
};

interface Particle {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
}

function generateParticles(style: ParticleStyle): Particle[] {
  return Array.from({ length: style.count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: style.minSize + Math.random() * (style.maxSize - style.minSize),
    duration: style.minDuration + Math.random() * (style.maxDuration - style.minDuration),
    delay: Math.random() * style.maxDuration,
  }));
}

/** Lightweight ambient particles tying the arena to the active dungeon weather — same "few absolutely-positioned spans" trick as NightSceneBackground's fireflies, no PixelLab sprites needed. */
export default function WeatherParticles({ weatherId }: { weatherId: string }) {
  const style = WEATHER_STYLE[weatherId];
  const particles = useMemo(() => (style ? generateParticles(style) : []), [style]);

  if (!style || particles.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => {
        const common = {
          left: `${p.left}%`,
          width: style.shape === "streak" ? Math.max(1, p.size * 0.5) : p.size,
          height: style.shape === "streak" ? p.size * 9 : p.size,
          borderRadius: style.shape === "streak" ? "9999px" : "50%",
          background: style.color,
          filter: style.blur ? `blur(${style.blur}px)` : undefined,
          opacity: style.drift === "drift" ? 0.35 : 0.7,
        };

        if (style.drift === "fall") {
          return (
            <motion.div
              key={p.id}
              className="absolute top-[-8%]"
              style={common}
              animate={{ y: ["0vh", "112vh"] }}
              transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }}
            />
          );
        }
        if (style.drift === "rise") {
          return (
            <motion.div
              key={p.id}
              className="absolute bottom-[-4%]"
              style={common}
              animate={{ y: ["0vh", "-70vh"], opacity: [0, 0.8, 0] }}
              transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeOut" }}
            />
          );
        }
        if (style.drift === "flicker") {
          return (
            <motion.div
              key={p.id}
              className="absolute top-1/3"
              style={common}
              animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.3, 0.6] }}
              transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
            />
          );
        }
        // drift: slow horizontal wander, used for mist/eclipse motes
        return (
          <motion.div
            key={p.id}
            className="absolute top-1/4"
            style={common}
            animate={{ x: ["-6vw", "6vw", "-6vw"], y: ["0vh", "6vh", "0vh"] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        );
      })}
    </div>
  );
}
