import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import LoopSprite from "./LoopSprite";
import { mulberry32 } from "../../data/seededRandom";

const birdModules = import.meta.glob("../../assets/camp/props/bird-*.png", { eager: true, import: "default" }) as Record<string, string>;
const fireflyModules = import.meta.glob("../../assets/camp/props/fireflies-*.png", { eager: true, import: "default" }) as Record<string, string>;
const batModules = import.meta.glob("../../assets/map/vfx/bat-*.png", { eager: true, import: "default" }) as Record<string, string>;

function frames(modules: Record<string, string>, prefix: string): string[] {
  const out: string[] = [];
  for (let i = 0; ; i += 1) {
    const e = Object.entries(modules).find(([p]) => p.endsWith(`/${prefix}-${i}.png`));
    if (!e) break;
    out.push(e[1]);
  }
  return out;
}

const BIRD_FRAMES = frames(birdModules, "bird");
const FIREFLY_FRAMES = frames(fireflyModules, "fireflies");
const BAT_FRAMES = frames(batModules, "bat");

/**
 * The Lisière Sylvestre's five ambience layers.
 *
 * Only ONE of the five is a sprite overlay (the periodic bird/bat flight) — everything else is
 * CSS/framer-motion shapes, and the phosphorescent bark fungus is handled a layer down by
 * `PanelStage`'s `FOREST_LIGHTS` glow rather than here. That split follows the rule the Cité's
 * rebuild established: commission art for shapes CSS genuinely cannot fake (a bird in flight), and
 * animate light or blurred particles for everything else, because a 48px sprite of a falling leaf
 * reads as a blurry sticker at this scale while a drifting div does not.
 *
 * All five also had precedent to reuse: the bird, firefly and bat loops already existed for the
 * campfire scene and the World Map, so this layer commissions no new PixelLab art at all.
 */
export default function ForestAmbience({ night }: { night: boolean }) {
  const reduceMotion = useReducedMotion();
  const [critterAt, setCritterAt] = useState(0);

  // Layer 4 — a bird (day) or a bat (night) crosses the frame every ~12s, per spec.
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setCritterAt((v) => v + 1), 12000);
    return () => clearInterval(id);
  }, [reduceMotion]);

  // Seeded so the field is identical across re-renders — same reason `starfield.ts` exists.
  const leaves = useMemo(() => {
    const rand = mulberry32(70414);
    return Array.from({ length: 16 }, (_, i) => ({
      id: i,
      left: rand() * 100,
      size: 2 + rand() * 3,
      duration: 9 + rand() * 8,
      delay: -rand() * 14,
      drift: 8 + rand() * 16,
      needle: rand() > 0.45,
    }));
  }, []);

  const motes = useMemo(() => {
    const rand = mulberry32(31337);
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: rand() * 100,
      top: 25 + rand() * 60,
      size: 1.5 + rand() * 2.5,
      duration: 6 + rand() * 7,
      delay: -rand() * 10,
    }));
  }, []);

  // Layer 3 — the canopy band swaying. Blurred dark-green blobs across the top of the frame moving
  // slightly out of phase reads as treetops shifting in the wind; a sprite here would have to match
  // the painted treeline pixel for pixel to not look pasted on.
  const canopy = useMemo(
    () => [
      { left: -5, width: 38, delay: 0, duration: 7.5 },
      { left: 26, width: 34, delay: -2.4, duration: 9 },
      { left: 58, width: 36, delay: -4.8, duration: 8.2 },
      { left: 84, width: 30, delay: -1.2, duration: 10 },
    ],
    []
  );

  if (reduceMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 3 — swaying treetops */}
      {canopy.map((c, i) => (
        <motion.div
          key={i}
          className="absolute -top-2 h-[22%] rounded-[50%] blur-[6px]"
          style={{
            left: `${c.left}%`,
            width: `${c.width}%`,
            background: "radial-gradient(ellipse at 50% 30%, rgba(24,64,36,0.55) 0%, rgba(12,38,22,0) 72%)",
          }}
          animate={{ x: [-6, 6, -6], rotate: [-0.7, 0.7, -0.7] }}
          transition={{ duration: c.duration, delay: c.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* 1 — pine needles and dead leaves falling continuously */}
      {leaves.map((l) => (
        <motion.span
          key={l.id}
          className="absolute top-0"
          style={{
            left: `${l.left}%`,
            width: l.needle ? 1.5 : l.size,
            height: l.needle ? l.size * 2.4 : l.size,
            borderRadius: l.needle ? 1 : "50% 0 50% 0",
            background: l.needle ? "rgba(96,128,72,0.75)" : "rgba(168,124,58,0.8)",
          }}
          animate={{ y: ["-5%", "105%"], x: [0, l.drift, -l.drift, 0], rotate: [0, 180, 360] }}
          transition={{ duration: l.duration, delay: l.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}

      {/* 2 — fireflies at night, golden dust motes by day */}
      {night
        ? FIREFLY_FRAMES.length > 0 && (
            <>
              {motes.slice(0, 7).map((m) => (
                <motion.div
                  key={m.id}
                  className="absolute"
                  style={{ left: `${m.left}%`, top: `${m.top}%` }}
                  animate={{ x: [0, 14, -10, 0], y: [0, -12, 6, 0], opacity: [0.2, 1, 0.35, 0.2] }}
                  transition={{ duration: m.duration + 4, delay: m.delay, repeat: Infinity, ease: "easeInOut" }}
                >
                  <LoopSprite frames={FIREFLY_FRAMES} frameDuration={180} alt="" className="h-6 w-6 opacity-80" />
                </motion.div>
              ))}
            </>
          )
        : motes.map((m) => (
            <motion.span
              key={m.id}
              className="absolute rounded-full"
              style={{
                left: `${m.left}%`,
                top: `${m.top}%`,
                width: m.size,
                height: m.size,
                background: "rgba(255,236,170,0.9)",
                boxShadow: "0 0 4px rgba(255,225,140,0.8)",
              }}
              animate={{ y: [0, -16, 0], x: [0, 9, 0], opacity: [0.15, 0.8, 0.15] }}
              transition={{ duration: m.duration, delay: m.delay, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}

      {/* 4 — periodic wildlife crossing: birds by day, bats by night */}
      <AnimatePresence>
        <motion.div
          key={critterAt}
          className="absolute"
          style={{ top: night ? "14%" : "20%" }}
          initial={{ left: "-12%", opacity: 0 }}
          animate={{ left: "112%", opacity: [0, 1, 1, 0], y: night ? [0, -14, 10, -6, 0] : [0, -8, 4, 0] }}
          transition={{ duration: night ? 6 : 4.5, ease: "linear" }}
        >
          <LoopSprite
            frames={night ? BAT_FRAMES : BIRD_FRAMES}
            frameDuration={night ? 120 : 150}
            alt=""
            className="h-6 w-6"
            style={night ? { filter: "brightness(0.5)" } : undefined}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
