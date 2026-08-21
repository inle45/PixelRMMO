import { useState } from "react";
import { motion } from "framer-motion";
import { getDialoguePortrait, type DialogueDef } from "../../data/worldMap";

interface DialogueBoxProps {
  dialogue: DialogueDef;
  onClose: () => void;
}

/** Bottom-anchored pixel-art dialogue panel: portrait, NPC name, one line at a time. Tapping the
 * panel (or the "Suivant" button) advances; the last line's tap closes it instead. */
export default function DialogueBox({ dialogue, onClose }: DialogueBoxProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const portrait = getDialoguePortrait(dialogue.id);
  const isLast = lineIndex >= dialogue.lines.length - 1;

  function advance() {
    if (isLast) onClose();
    else setLineIndex((i) => i + 1);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="pointer-events-auto absolute inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md sm:inset-x-0"
    >
      <div className="flex items-stretch gap-3 rounded-2xl border border-lantern/30 bg-[#12111a]/95 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        {portrait && (
          <img
            src={portrait}
            alt=""
            className="h-16 w-16 flex-none rounded-xl border border-white/15 object-cover"
            style={{ imageRendering: "pixelated" }}
          />
        )}
        {/* A `<div role="button">`, not a real `<button>`: the ✕ close control below has to be an
            actual nested button for its own click target, and a <button> can never contain another
            interactive control (invalid HTML — React 19 flags it as a hydration error). */}
        <div
          role="button"
          tabIndex={0}
          onClick={advance}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") advance();
          }}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-lantern-glow">{dialogue.npcName}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Fermer"
              className="flex h-5 w-5 flex-none items-center justify-center rounded-full border border-white/15 bg-black/40 text-[10px] text-white/70 hover:text-white"
            >
              ✕
            </button>
          </div>
          <motion.p
            key={lineIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-1 text-sm leading-snug text-white/90"
          >
            {dialogue.lines[lineIndex]}
          </motion.p>
          <p className="mt-1.5 text-right text-[10px] font-bold text-white/40">
            {isLast ? "Toucher pour fermer" : `Suivant ▸ (${lineIndex + 1}/${dialogue.lines.length})`}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
