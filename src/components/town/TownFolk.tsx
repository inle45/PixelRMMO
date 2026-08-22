import { motion, useReducedMotion } from "framer-motion";
import LoopSprite from "../camp/LoopSprite";
import { FOLK_FRAMES, FOLK_STANDERS, FOLK_WALKERS, folkWidth } from "../../data/town";

interface TownFolkProps {
  /** The active period's CSS filter, merged into each sprite's own drop shadow so the crowd sits in
   * the same light as the city instead of reading as full-brightness cut-outs on a graded scene. */
  gradeFilter: string;
}

/** Ground contact shadow — the single thing that stops a sprite from looking like it hovers. */
function Shadow() {
  return <span className="absolute bottom-0 left-1/2 h-[7%] w-[70%] -translate-x-1/2 rounded-[50%] bg-black/45 blur-[2px]" />;
}

/**
 * The city's inhabitants. Every position comes from the walkability scan in town.ts — the artwork
 * itself is empty of people, so this layer is what makes the Cité read as inhabited rather than as a
 * diorama, and getting the ground/roof distinction right is the whole job.
 */
export default function TownFolk({ gradeFilter }: TownFolkProps) {
  const reduceMotion = useReducedMotion();

  return (
    <>
      {FOLK_STANDERS.map((p, i) => {
        const frames = FOLK_FRAMES[p.folk];
        if (frames.length === 0) return null;
        const w = folkWidth(p.y);
        return (
          <div
            key={`s${i}`}
            className="pointer-events-none absolute"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${w}%`, transform: "translate(-50%, -100%)" }}
          >
            <Shadow />
            <img
              src={frames[0]}
              alt=""
              className="relative h-auto w-full"
              style={{
                imageRendering: "pixelated",
                transform: p.flip ? "scaleX(-1)" : undefined,
                filter: `drop-shadow(0 2px 3px rgba(0,0,0,0.55)) ${gradeFilter}`,
              }}
              draggable={false}
            />
          </div>
        );
      })}

      {FOLK_WALKERS.map((p, i) => {
        const frames = FOLK_FRAMES[p.folk];
        if (frames.length === 0) return null;
        const w = folkWidth(p.y);
        // The sprite is drawn facing one way, so it's mirrored on the return leg — the flip is
        // keyframed on the same timeline as the movement so the turn lands exactly at each end.
        return (
          <motion.div
            key={`w${i}`}
            className="pointer-events-none absolute"
            style={{ top: `${p.y}%`, width: `${w}%` }}
            initial={{ left: `${p.x}%` }}
            animate={reduceMotion ? { left: `${p.x}%` } : { left: [`${p.x}%`, `${p.toX}%`, `${p.x}%`] }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: p.duration * 2, delay: p.delay, repeat: Infinity, ease: "linear", times: [0, 0.5, 1] }
            }
          >
            <div className="relative" style={{ transform: "translate(-50%, -100%)" }}>
              <Shadow />
              <motion.div
                animate={reduceMotion ? {} : { scaleX: [1, 1, -1, -1, 1] }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: p.duration * 2, delay: p.delay, repeat: Infinity, ease: "linear", times: [0, 0.49, 0.51, 0.99, 1] }
                }
              >
                <LoopSprite
                  frames={frames}
                  frameDuration={190}
                  alt=""
                  className="h-auto w-full"
                  style={{ filter: `drop-shadow(0 2px 3px rgba(0,0,0,0.55)) ${gradeFilter}` }}
                />
              </motion.div>
            </div>
          </motion.div>
        );
      })}
    </>
  );
}
