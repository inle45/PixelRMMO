import { useEffect, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import type { Placement } from "../../data/campScene";

export type ChestVisualState = "closed" | "opening" | "open" | "closing";

/** Lives in /public rather than src/assets, same call as the World Map's continent background —
 * a single-consumer sprite sheet gains nothing from Vite's import.meta.glob/base64-inlining path. */
const CHEST_SPRITESHEET = "/assets/camp/chest_spritesheet.png";
const FRAME_COUNT = 6;
const OPEN_DURATION_MS = 700;

interface CampChestProps {
  visual: ChestVisualState;
  placement: Placement;
  /** The active period's own sprite filter (brightness/saturate/sepia/hue-rotate) — reused as-is so
   * the chest sits in the same light as the hero and props instead of reading as a flat cutout. */
  spriteFilter: string;
  onActivate: () => void;
  /** Fires once the CSS opening/closing animation finishes, handing the state-machine transition
   * (opening -> open, closing -> closed) back to whoever owns `visual`. */
  onAnimationEnd: () => void;
  paused?: boolean;
}

/**
 * The camp's storage chest: a static object standing near the tent, its lid animation driven by a
 * single 6-frame horizontal sprite sheet stepped through with CSS `steps()` rather than the app's
 * usual per-frame-file `import.meta.glob` loop — a plain background-position sweep is the simpler
 * mechanism for a one-shot open/close rather than a continuous idle loop, and it's what keeps the
 * whole animation to one asset instead of six.
 */
export default function CampChest({ visual, placement, spriteFilter, onActivate, onAnimationEnd, paused }: CampChestProps) {
  const reduceMotion = useReducedMotion();
  const animating = (visual === "opening" || visual === "closing") && !paused && !reduceMotion;

  // A CSS animation that's suppressed by the global prefers-reduced-motion kill-switch never fires
  // `animationend`, which would otherwise strand the opening/closing state forever. Skip straight to
  // the target frame and resolve the transition on the next tick instead.
  useEffect(() => {
    if (!reduceMotion || paused) return;
    if (visual !== "opening" && visual !== "closing") return;
    const id = setTimeout(onAnimationEnd, 0);
    return () => clearTimeout(id);
  }, [reduceMotion, paused, visual, onAnimationEnd]);

  const wrapperStyle: CSSProperties = {
    left: `${placement.x}%`,
    top: `${placement.y}%`,
    width: `${placement.width}%`,
    transform: "translate(-50%, -100%)",
  };

  // Fully open sits pinned on the last frame; every other state starts the sweep from frame 0 (CSS
  // animation direction handles opening-forward vs closing-in-reverse from there).
  const restingPosition = visual === "open" ? "100% 0%" : "0% 0%";

  return (
    <div className="pointer-events-auto absolute" style={wrapperStyle}>
      {/* Ground contact shadow, same blurred-ellipse technique as the hero's own. */}
      <div
        className="absolute left-1/2 top-[92%] h-[18%] w-[85%] -translate-x-1/2 rounded-[50%] bg-black/45 blur-[3px]"
        aria-hidden
      />

      <button
        type="button"
        onClick={visual === "closed" ? onActivate : undefined}
        disabled={visual !== "closed"}
        aria-label="Ouvrir le coffre du campement"
        className="group relative block w-full disabled:cursor-default"
      >
        {visual === "closed" && (
          <span className="pointer-events-none absolute -inset-3 rounded-full bg-lantern/0 blur-md transition-colors duration-300 group-hover:bg-lantern/25 group-focus-visible:bg-lantern/25" />
        )}

        <div
          className="relative aspect-square w-full bg-no-repeat"
          style={{
            backgroundImage: `url(${CHEST_SPRITESHEET})`,
            backgroundSize: `${FRAME_COUNT * 100}% 100%`,
            backgroundPosition: animating ? undefined : restingPosition,
            filter: spriteFilter,
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
            style={{ background: "radial-gradient(60% 55% at 50% 60%, rgba(255,199,120,0.55), transparent 72%)" }}
          />
        )}

        {visual === "closed" && (
          <span className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-bold text-white/0 backdrop-blur-sm transition-opacity duration-200 group-hover:text-white/85 group-focus-visible:text-white/85">
            Ouvrir
          </span>
        )}
      </button>
    </div>
  );
}
