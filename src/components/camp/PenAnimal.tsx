import { motion, useReducedMotion } from "framer-motion";
import LoopSprite from "./LoopSprite";
import { speciesFrames, speciesSprite, type AnimalInstance, type SpeciesDef } from "../../data/livestock";

interface PenAnimalProps {
  animal: AnimalInstance;
  species: SpeciesDef;
  /** Scene-box percentage the animal roams around. */
  homeX: number;
  y: number;
  /** How far either side of `homeX` it wanders, in scene-box percent. */
  range: number;
  duration: number;
  delay: number;
  /** Animals sleep at night rather than pacing the pen in the dark. */
  resting: boolean;
  ready: boolean;
  hungry: boolean;
  onClick: () => void;
}

/**
 * One animal in the pen, with a routine rather than a loop played in place.
 *
 * A *resting* animal renders frame [0] only and does not move — the same call `TownFolk`'s standers
 * made, because a walk cycle played on the spot reads as marching rather than standing. A roaming
 * one plays its full loop while `x` oscillates, with `scaleX` keyframed **on the same timeline** so
 * the turn lands exactly at each end of the walk instead of drifting out of phase with it.
 *
 * A baby renders at 60% scale; the harvest-ready jump-with-a-heart is an overlay on top rather than
 * a separate sprite, since it only needs to last a beat.
 */
export default function PenAnimal({
  animal,
  species,
  homeX,
  y,
  range,
  duration,
  delay,
  resting,
  ready,
  hungry,
  onClick,
}: PenAnimalProps) {
  const reduceMotion = useReducedMotion();
  const frames = speciesFrames(species.id);
  const still = resting || reduceMotion;
  const scale = animal.adult ? 1 : 0.62;

  return (
    <motion.div
      className="absolute"
      style={{ top: `${y}%`, transform: "translate(-50%, -100%)" }}
      initial={{ left: `${homeX}%` }}
      animate={still ? { left: `${homeX}%` } : { left: [`${homeX - range}%`, `${homeX + range}%`, `${homeX - range}%`] }}
      transition={still ? { duration: 0 } : { duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.button
        type="button"
        onClick={onClick}
        aria-label={species.name}
        className="relative block"
        // scaleX rides the same timeline as the `left` oscillation above, so the flip happens at the
        // turn rather than mid-walk. The negative scaleX is folded into the same transform the size
        // scale uses — framer-motion owns `transform` outright, so a second manual one would lose.
        animate={
          still
            ? { scaleX: 1, scaleY: 1 }
            : { scaleX: [-scale, -scale, scale, scale, -scale], scaleY: scale }
        }
        transition={still ? { duration: 0 } : { duration, delay, repeat: Infinity, times: [0, 0.49, 0.5, 0.99, 1] }}
        style={{ transformOrigin: "bottom center" }}
      >
        {frames.length > 0 ? (
          still ? (
            <img
              src={frames[0]}
              alt=""
              className="h-12 w-12 object-contain"
              style={{ imageRendering: "pixelated", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.55))" }}
            />
          ) : (
            <LoopSprite
              frames={frames}
              frameDuration={200}
              alt=""
              className="h-12 w-12"
              style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.55))" }}
            />
          )
        ) : (
          <img
            src={speciesSprite(species.id)}
            alt=""
            className="h-12 w-12 object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        )}
      </motion.button>

      {/* Status badge, counter-flipped out of the sprite's transform by living outside the button. */}
      {resting ? (
        <motion.span
          className="absolute -right-1 -top-1 text-[10px] font-bold text-sky-200"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        >
          z
        </motion.span>
      ) : ready ? (
        <motion.span
          className="absolute -right-1 -top-2 text-[11px]"
          animate={{ y: [0, -5, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          style={{ color: species.accent }}
        >
          ★
        </motion.span>
      ) : hungry ? (
        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
      ) : null}
    </motion.div>
  );
}
