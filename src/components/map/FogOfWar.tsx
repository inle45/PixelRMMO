import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface Spot {
  x: number;
  y: number;
}

interface FogOfWarProps {
  /** The one big cleared hole over the starting valley (camp/crypt/city cluster). Percentages of
   * the (square) map box. */
  reveal: Spot & { rx: number; ry: number };
  /** Distant points-of-interest that should peek faintly through the mist rather than vanish
   * entirely — the volcano's "repère lointain... masqué". */
  hints?: Spot[];
}

/** Fixed (not random) so the drifting mist texture is identical every render. */
const WISPS = [
  { top: 8, left: 15, size: 34, duration: 46, delay: 0 },
  { top: 22, left: 62, size: 40, duration: 54, delay: -14 },
  { top: 4, left: 78, size: 28, duration: 40, delay: -28 },
  { top: 34, left: 34, size: 30, duration: 50, delay: -6 },
  { top: 16, left: 46, size: 22, duration: 36, delay: -20 },
];

/**
 * A dense fog sheet over the whole map, punched through by one soft-edged hole around the
 * starting valley (and faint hint-holes over distant landmarks). Built as an inline SVG mask
 * rather than a CSS `mask-image` radial-gradient stack: several independent holes composited via
 * CSS's `add` mask-composite union their *opaque* regions, not their transparent ones, so multiple
 * holes fight each other. Painting each hole as its own gradient-filled `<ellipse>` on top of a
 * white base (SVG's default paint order is plain source-over) sidesteps that entirely — every hole
 * just carves its own space, independently.
 */
export default function FogOfWar({ reveal, hints = [] }: FogOfWarProps) {
  const reduceMotion = useReducedMotion();
  const maskId = `fog-mask-${useId()}`;

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id={`${maskId}-hole`}>
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="60%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${maskId}-hint`}>
            <stop offset="0%" stopColor="#fff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id={maskId} maskUnits="objectBoundingBox">
            <rect x="0" y="0" width="100" height="100" fill="#000" />
            <ellipse cx={reveal.x} cy={reveal.y} rx={reveal.rx} ry={reveal.ry} fill={`url(#${maskId}-hole)`} />
            {hints.map((h, i) => (
              <ellipse key={i} cx={h.x} cy={h.y} rx={9} ry={7} fill={`url(#${maskId}-hint)`} />
            ))}
          </mask>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="#140d1f" fillOpacity="0.88" mask={`url(#${maskId})`} />
      </svg>

      {/* Drifting mist texture, confined to roughly the fogged (upper) two-thirds of the map so it
          never dims the already-clear valley below it. */}
      <div className="absolute inset-x-0 top-0 h-2/3 overflow-hidden">
        {WISPS.map((w, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/[0.05]"
            style={{ top: `${w.top}%`, left: `${w.left}%`, width: `${w.size}%`, aspectRatio: "2 / 1", filter: "blur(18px)" }}
            animate={reduceMotion ? { x: "0%" } : { x: ["-8%", "8%", "-8%"] }}
            transition={reduceMotion ? { duration: 0 } : { duration: w.duration, repeat: Infinity, ease: "easeInOut", delay: w.delay }}
          />
        ))}
      </div>
    </div>
  );
}
