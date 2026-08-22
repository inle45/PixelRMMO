import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LightSource, PanelGrade } from "../../data/campPanels";

/**
 * The shared scene box for the two new camp panels.
 *
 * This is `CampStage`'s own 16:9-art-into-a-9:18-hole solution, pulled out so the Lisière and the
 * Domaine don't each re-derive it: a bottom-anchored box at the art's aspect ratio sized
 * `max(100cqw, 95cqh)`, with the gap above it painted as more sky. The `cq*` units resolve against
 * this component's own root because of `containerType: "size"`, so the scene scales to the space
 * above the nav bar rather than to the viewport.
 *
 * The Feu de Camp panel deliberately keeps using `CampStage` itself rather than being ported onto
 * this: it carries a whole calibrator-editable prop/hero layout system that the other two panels
 * have no equivalent of, and collapsing the two would mean dragging that along for no gain.
 *
 * EVERY CHILD COORDINATE IS A PERCENTAGE OF THE SCENE BOX, never of the viewport — that is what
 * keeps one set of tree/pen positions correct at every screen aspect.
 */

const SCENE_BOX_STYLE: CSSProperties = { aspectRatio: "400 / 224", width: "max(100cqw, 95cqh)" };
/** Exactly the band above the scene box. Deriving it (rather than spanning the sky across the whole
 * container) is what makes the join invisible — see CampStage for the full explanation. */
const SKY_HEIGHT = "max(0px, calc(100cqh - max(100cqw, 95cqh) * 0.56))";

interface PanelStageProps {
  background: string;
  grade: PanelGrade;
  lights: LightSource[];
  night: boolean;
  /** Placed inside the scene box, so children position themselves in scene-box percentages. */
  children?: ReactNode;
  /** Ambience overlay, also inside the box, drawn above the children. */
  ambience?: ReactNode;
}

export default function PanelStage({
  background,
  grade,
  lights,
  night,
  children,
  ambience,
}: PanelStageProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        imageRendering: "pixelated",
        containerType: "size",
        backgroundColor: grade.seam,
        transition: "background-color 1s ease",
      }}
    >
      {/* Layer 0 — sky filling the band above the artwork. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 transition-[background] duration-1000"
        style={{ height: SKY_HEIGHT, background: grade.sky }}
      >
        {night ? <StarField /> : <Clouds />}
      </div>

      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2" style={SCENE_BOX_STYLE}>
        {/* Layer 1 — the one painted backdrop, colour-graded. */}
        <img
          src={background}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full transition-[filter] duration-1000"
          style={{ imageRendering: "pixelated", filter: grade.filter }}
        />
        <div
          className="absolute inset-0 transition-[background] duration-1000"
          style={{ background: grade.wash }}
        />

        {/* Layer 2 — the light the artwork's own lanterns/fungus cast, scaled by the period. */}
        {grade.glow > 0 &&
          lights.map((l, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${l.x}%`,
                top: `${l.y}%`,
                width: `${l.radius * 2}%`,
                aspectRatio: "1",
                transform: "translate(-50%, -50%)",
                background: `radial-gradient(circle, ${l.color} 0%, transparent 70%)`,
                mixBlendMode: "screen",
              }}
              animate={
                reduceMotion
                  ? { opacity: grade.glow * 0.7 }
                  : l.flicker
                    ? { opacity: [grade.glow * 0.5, grade.glow, grade.glow * 0.62, grade.glow * 0.9, grade.glow * 0.5] }
                    : { opacity: [grade.glow * 0.5, grade.glow * 0.95, grade.glow * 0.5] }
              }
              transition={{
                duration: l.flicker ? 1.7 + i * 0.4 : 3.4 + i * 0.6,
                repeat: reduceMotion ? 0 : Infinity,
                ease: "easeInOut",
              }}
            />
          ))}

        {/* Layer 3+ — scene content, then ambience above it. */}
        <div className="pointer-events-auto absolute inset-0">{children}</div>
        {ambience}
      </div>
    </div>
  );
}

/** Fixed positions rather than `Math.random()` at render, so the field doesn't reshuffle on every
 * re-render — the same reason `starfield.ts` exists for the auth screen. */
const STARS = Array.from({ length: 34 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.6789;
  return {
    left: ((a - Math.floor(a)) * 100).toFixed(2),
    top: ((b - Math.floor(b)) * 88).toFixed(2),
    size: i % 5 === 0 ? 2 : 1,
    delay: (i % 7) * 0.45,
  };
});

/** Fixed, not random — same reasoning as STARS. On a portrait phone the sky band is nearly half the
 * screen, so leaving it a flat gradient reads as an unfinished page rather than as sky; slow
 * drifting clouds are what make the painted-in area belong to the scene. */
const CLOUDS = [
  { top: 12, width: 36, height: 8, blur: 13, duration: 170, delay: 0 },
  { top: 30, width: 27, height: 6, blur: 10, duration: 205, delay: -70 },
  { top: 50, width: 44, height: 9, blur: 17, duration: 245, delay: -150 },
  { top: 68, width: 22, height: 5, blur: 9, duration: 190, delay: -30 },
];

function Clouds() {
  return (
    <>
      {CLOUDS.map((c, i) => (
        <motion.span
          key={i}
          className="absolute rounded-[50%] bg-white/45"
          style={{
            top: `${c.top}%`,
            width: `${c.width}%`,
            height: `${c.height}%`,
            filter: `blur(${c.blur}px)`,
          }}
          animate={{ left: ["-45%", "115%"] }}
          transition={{ duration: c.duration, delay: c.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </>
  );
}

function StarField() {
  return (
    <>
      {STARS.map((s, i) => (
        <span
          key={i}
          className="animate-twinkle absolute rounded-full bg-white"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </>
  );
}
