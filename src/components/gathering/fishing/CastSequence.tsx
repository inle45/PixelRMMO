import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { bobberIcon, type FishingSpotDef } from "../../../data/fishing";

interface CastSequenceProps {
  spot: FishingSpotDef;
  /** `struck` false means the reflex window closed untouched — the fish spat the bait. */
  onFinish: (result: { struck: boolean }) => void;
  onCancel: () => void;
}

type Phase = "waiting" | "bite" | "done";

/**
 * Steps 1-2 of a cast: the bobber sits on the water, then a `!` flashes and the player has
 * `spot.reflexWindow` seconds to strike.
 *
 * The wait before the bite is randomised (1.2s-3.5s) so the strike can't be pre-timed — without
 * that, a fixed delay turns the whole reflex test into muscle memory after three casts.
 */
export default function CastSequence({ spot, onFinish, onCancel }: CastSequenceProps) {
  const [phase, setPhase] = useState<Phase>("waiting");
  const doneRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  useEffect(() => {
    const waitMs = 1200 + Math.random() * 2300;
    const biteTimer = setTimeout(() => {
      if (doneRef.current) return;
      setPhase("bite");
      // Missing the window is a real outcome, not a soft retry: the bait is already spent.
      const missTimer = setTimeout(() => {
        if (doneRef.current) return;
        doneRef.current = true;
        setPhase("done");
        onFinishRef.current({ struck: false });
      }, spot.reflexWindow * 1000);
      timers.push(missTimer);
    }, waitMs);
    const timers: ReturnType<typeof setTimeout>[] = [biteTimer];
    return () => timers.forEach(clearTimeout);
  }, [spot.reflexWindow]);

  function strike() {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase("done");
    // Striking before the bite spooks the fish — same failure as letting the window lapse.
    onFinishRef.current({ struck: phase === "bite" });
  }

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="mb-2 flex w-full max-w-sm items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white">{spot.name}</p>
          <p className="text-[10px] text-white/50">Fenêtre de ferrage : {spot.reflexWindow.toFixed(1)}s</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-[10px] font-bold text-white/70 hover:bg-black/70"
        >
          Abandonner
        </button>
      </div>

      <button
        type="button"
        onClick={strike}
        aria-label="Ferrer"
        className="relative flex h-64 w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border-2 bg-[#071620]"
        style={{ borderColor: spot.accent }}
      >
        {/* Concentric ripples, CSS rather than a sprite — the same call the Cité's light sources
            made: a few animated shapes read better than pasting art over painted water. */}
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute rounded-full border"
            style={{ borderColor: `${spot.accent}55` }}
            initial={{ width: 20, height: 20, opacity: 0.7 }}
            animate={{ width: 190, height: 190, opacity: 0 }}
            transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.85, ease: "easeOut" }}
          />
        ))}

        <motion.img
          src={bobberIcon}
          alt=""
          className="relative h-12 w-12 object-contain"
          style={{ imageRendering: "pixelated" }}
          animate={phase === "bite" ? { y: [0, 14, 2, 12, 0] } : { y: [0, -4, 0] }}
          transition={
            phase === "bite"
              ? { duration: 0.45, repeat: Infinity }
              : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
          }
        />

        {phase === "bite" && (
          <motion.span
            className="absolute -translate-y-16 text-5xl font-black text-white"
            style={{ textShadow: `0 0 18px ${spot.accent}` }}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [1.5, 1], opacity: 1 }}
            transition={{ duration: 0.18 }}
          >
            !
          </motion.span>
        )}

        <span className="absolute bottom-3 text-[10px] font-semibold text-white/45">
          {phase === "bite" ? "FERRE MAINTENANT" : "Attends la touche…"}
        </span>
      </button>
    </motion.div>
  );
}
