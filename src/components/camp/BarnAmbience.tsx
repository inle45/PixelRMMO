import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import LoopSprite from "./LoopSprite";
import { mulberry32 } from "../../data/seededRandom";

const propModules = import.meta.glob("../../assets/camp/props/*.png", { eager: true, import: "default" }) as Record<string, string>;
const vfxModules = import.meta.glob("../../assets/map/vfx/*.png", { eager: true, import: "default" }) as Record<string, string>;

function frames(modules: Record<string, string>, prefix: string): string[] {
  const out: string[] = [];
  for (let i = 0; ; i += 1) {
    const e = Object.entries(modules).find(([p]) => p.endsWith(`/${prefix}-${i}.png`));
    if (!e) break;
    out.push(e[1]);
  }
  return out;
}

const LANTERN_FRAMES = frames(propModules, "lantern");
/** The `butterflies` prop was drawn as a GROUND decoration — butterflies hovering over a tuft of
 * grass — so flying it flew the grass with them. `farmfly-*` is that same loop cropped (locally,
 * with PIL, one shared box across all frames) down to just the butterflies. */
const BUTTERFLY_FRAMES = frames(propModules, "farmfly");
const VANE_FRAMES = frames(propModules, "vane");
const SMOKE_FRAMES = frames(vfxModules, "smoke");

/** Where the barn's roof ridge and chimney actually sit on `barn_pasture_day_bg.png` — measured
 * against the artwork, not guessed, for the same reason the Cité's crowd placement had to be. */
const CHIMNEY = { x: 14, y: 44 };
const ROOF_PEAK = { x: 30, y: 41 };
const LANTERN_HOOK = { x: 41, y: 57 };

/**
 * The Domaine d'Élevage's five ambience layers: a swinging lantern, continuous chimney smoke,
 * drifting hay motes, day butterflies / night moths circling the lanterns, and the rooster
 * weathervane pivoting on the roof.
 *
 * Same reuse-first rule as the forest panel: the lantern, butterfly and smoke loops already existed
 * (camp props and World Map vfx respectively), so the only new generation this layer needed was the
 * weathervane. The lantern's *halo* is not drawn here — it is one of `PanelStage`'s `BARN_LIGHTS`,
 * so it scales with the period's own glow multiplier and is genuinely off at noon.
 */
export default function BarnAmbience({ night }: { night: boolean }) {
  const reduceMotion = useReducedMotion();

  const hay = useMemo(() => {
    const rand = mulberry32(880122);
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: rand() * 100,
      top: 55 + rand() * 40,
      len: 2 + rand() * 4,
      duration: 8 + rand() * 9,
      delay: -rand() * 12,
      rise: 10 + rand() * 22,
    }));
  }, []);

  const insects = useMemo(() => {
    const rand = mulberry32(24680);
    return Array.from({ length: 5 }, (_, i) => ({
      id: i,
      // At night they gravitate to the lantern hook; by day they scatter over the pasture.
      // Over the pasture only (see BarnView's PASTURE) — butterflies drifting across the barn roof
      // or up into open sky read as floating stickers.
      left: 30 + rand() * 42,
      top: 74 + rand() * 16,
      duration: 7 + rand() * 6,
      delay: -rand() * 8,
    }));
  }, []);

  if (reduceMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 2 — chimney smoke, continuous */}
      {SMOKE_FRAMES.length > 0 &&
        [0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: `${CHIMNEY.x}%`, top: `${CHIMNEY.y}%` }}
            animate={{ y: [0, -46], x: [0, 10 + i * 4], opacity: [0, 0.5, 0], scale: [0.5, 1.25] }}
            transition={{ duration: 7, delay: i * 2.3, repeat: Infinity, ease: "easeOut" }}
          >
            <LoopSprite frames={SMOKE_FRAMES} frameDuration={220} alt="" className="h-7 w-7" style={{ opacity: 0.55 }} />
          </motion.div>
        ))}

      {/* 5 — the rooster weathervane pivoting on the roof ridge */}
      {VANE_FRAMES.length > 0 && (
        <motion.div
          className="absolute"
          style={{ left: `${ROOF_PEAK.x}%`, top: `${ROOF_PEAK.y}%`, transform: "translate(-50%, -100%)" }}
          animate={{ scaleX: [1, 1, -1, -1, 1] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", times: [0, 0.35, 0.4, 0.85, 1] }}
        >
          <LoopSprite frames={VANE_FRAMES} frameDuration={300} alt="" className="h-5 w-5" />
        </motion.div>
      )}

      {/* 1 — the hung lantern swinging on its hook */}
      {LANTERN_FRAMES.length > 0 && (
        <motion.div
          className="absolute origin-top"
          style={{ left: `${LANTERN_HOOK.x}%`, top: `${LANTERN_HOOK.y}%`, transform: "translate(-50%, 0)" }}
          animate={{ rotate: [-6, 6, -6] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <LoopSprite
            frames={LANTERN_FRAMES}
            frameDuration={200}
            alt=""
            className="h-6 w-6"
            style={{ opacity: night ? 1 : 0.75 }}
          />
        </motion.div>
      )}

      {/* 3 — straw and hay dust carried on the draught */}
      {hay.map((h) => (
        <motion.span
          key={h.id}
          className="absolute"
          style={{
            left: `${h.left}%`,
            top: `${h.top}%`,
            width: h.len,
            height: 1.5,
            borderRadius: 1,
            background: "rgba(232,200,120,0.75)",
          }}
          animate={{ y: [0, -h.rise, 0], x: [0, 18, 30], rotate: [0, 90, 200], opacity: [0, 0.85, 0] }}
          transition={{ duration: h.duration, delay: h.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}

      {/* 4 — butterflies by day, moths orbiting the lantern by night */}
      {insects.map((b) =>
        night ? (
          <motion.span
            key={b.id}
            className="absolute rounded-full"
            style={{
              left: `${LANTERN_HOOK.x}%`,
              top: `${LANTERN_HOOK.y}%`,
              width: 2.5,
              height: 2.5,
              background: "rgba(226,214,180,0.9)",
            }}
            animate={{
              x: [0, 14, -6, 10, 0],
              y: [0, -10, 8, -4, 0],
              opacity: [0.4, 0.95, 0.5, 0.9, 0.4],
            }}
            transition={{ duration: b.duration * 0.5, delay: b.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : (
          BUTTERFLY_FRAMES.length > 0 && (
            <motion.div
              key={b.id}
              className="absolute"
              style={{ left: `${b.left}%`, top: `${b.top}%` }}
              animate={{ x: [0, 16, -10, 6, 0], y: [0, -9, -2, -12, 0] }}
              transition={{ duration: b.duration, delay: b.delay, repeat: Infinity, ease: "easeInOut" }}
            >
              <LoopSprite frames={BUTTERFLY_FRAMES} frameDuration={160} alt="" className="h-4 w-6 opacity-85" />
            </motion.div>
          )
        )
      )}
    </div>
  );
}
