import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";

export type ChestVisualState = "closed" | "opening" | "open" | "closing";

/** Lives in /public rather than src/assets, same call as the World Map's continent background —
 * a single-consumer sprite sheet gains nothing from Vite's import.meta.glob/base64-inlining path. */
const CHEST_SPRITESHEET = "/assets/camp/chest_spritesheet.png";
const FRAME_COUNT = 6;
const OPEN_DURATION_MS = 700;

interface CampChestProps {
  visual: ChestVisualState;
  onActivate: () => void;
  /** Fires once the CSS opening/closing animation finishes, handing the state-machine transition
   * (opening -> open, closing -> closed) back to whoever owns `visual`. */
  onAnimationEnd: () => void;
}

/**
 * A floating HUD button, same family as `MapButton` — a pill badge anchored to a screen corner
 * rather than a sprite standing inside the scene. (An earlier version anchored it to a percentage
 * coordinate inside CampStage's own scene box like the hero/props, but that box overflows the
 * viewport horizontally on a narrow phone — see SCENE_BOX_STYLE's own note — and every spot near the
 * tent that stayed on-screen also collided with an existing prop or the hero in at least one time-of-
 * day period. A HUD button sidesteps all of that: it's never inside the scaled/overflowing box.)
 *
 * The lid itself still plays through the same single 6-frame PixelLab sprite sheet via CSS `steps()`
 * on click, exactly as before — only the wrapper changed from a scene placement to a fixed corner.
 */
export default function CampChest({ visual, onActivate, onAnimationEnd }: CampChestProps) {
  const reduceMotion = useReducedMotion();
  const animating = (visual === "opening" || visual === "closing") && !reduceMotion;

  // A CSS animation that's suppressed by the global prefers-reduced-motion kill-switch never fires
  // `animationend`, which would otherwise strand the opening/closing state forever. Skip straight to
  // the target frame and resolve the transition on the next tick instead.
  useEffect(() => {
    if (!reduceMotion) return;
    if (visual !== "opening" && visual !== "closing") return;
    const id = setTimeout(onAnimationEnd, 0);
    return () => clearTimeout(id);
  }, [reduceMotion, visual, onAnimationEnd]);

  // Fully open sits pinned on the last frame; every other state starts the sweep from frame 0 (CSS
  // animation direction handles opening-forward vs closing-in-reverse from there).
  const restingPosition = visual === "open" ? "100% 0%" : "0% 0%";

  return (
    <button
      type="button"
      onClick={visual === "closed" ? onActivate : undefined}
      disabled={visual !== "closed"}
      aria-label="Ouvrir le coffre du campement"
      className="group flex items-center gap-1.5 rounded-full border border-lantern/35 bg-black/45 py-1 pl-1 pr-2.5 backdrop-blur-md transition-colors hover:border-lantern/70 hover:bg-black/65 active:scale-95 disabled:cursor-default disabled:active:scale-100"
    >
      <motion.div
        className="relative h-6 w-6 shrink-0"
        // Continuous idle bounce while closed is what makes this read as an animated button rather
        // than a static icon — the same "tap me" affordance MapNode gives its accessible pins via a
        // pulsing ring, just a bob instead since a pill badge has no room for a ring around it.
        animate={visual === "closed" && !reduceMotion ? { y: [0, -2, 0] } : { y: 0 }}
        transition={visual === "closed" && !reduceMotion ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
      >
        {visual === "closed" && (
          <span className="pointer-events-none absolute -inset-1.5 rounded-full bg-lantern/0 blur-sm transition-colors duration-300 group-hover:bg-lantern/30" />
        )}
        <div
          className="relative h-full w-full bg-no-repeat"
          style={{
            backgroundImage: `url(${CHEST_SPRITESHEET})`,
            backgroundSize: `${FRAME_COUNT * 100}% 100%`,
            backgroundPosition: animating ? undefined : restingPosition,
            imageRendering: "pixelated",
            ...(animating
              ? {
                  animationName: "chest-open-sheet",
                  animationDuration: `${OPEN_DURATION_MS}ms`,
                  // 5 steps across the 6 frames of the sheet, per spec.
                  animationTimingFunction: `steps(${FRAME_COUNT - 1})`,
                  animationFillMode: "forwards",
                  animationDirection: visual === "closing" ? "reverse" : "normal",
                }
              : null),
          }}
          onAnimationEnd={animating ? onAnimationEnd : undefined}
        />
        {visual === "open" && (
          <span
            className="animate-lantern pointer-events-none absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(60% 55% at 50% 60%, rgba(255,199,120,0.6), transparent 72%)" }}
          />
        )}
      </motion.div>
      <span className="text-[10px] font-bold uppercase tracking-wide text-lantern-glow">Coffre</span>
    </button>
  );
}
