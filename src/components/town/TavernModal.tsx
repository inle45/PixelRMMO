import { useState } from "react";
import { motion } from "framer-motion";
import StorageModal from "../storage/StorageModal";
import lanternIcon from "../../assets/town/animations/lantern-0.png";

interface TavernModalProps {
  onClose: () => void;
}

const INTRO_SEEN_KEY = "pixelrmmo:tavernIntroSeen";

const GREETING_LINES = [
  "Bienvenue au Sanglier Doré, mercenaire ! Pose ton baluchon, la réserve de la taverne t'est ouverte.",
  "Ce coffre est le même que celui de ton campement — tout ce que tu y déposes t'attend, où que tu ailles.",
];

/**
 * The Auberge: a one-time narrative greeting (per spec's "dialogues narratifs"), then the exact same
 * shared chest as the Camp's own — `useStorageStore`/`campChest.ts` already model one storage that
 * exists everywhere, so this is a straight reuse of `StorageModal`, not a second implementation.
 */
export default function TavernModal({ onClose }: TavernModalProps) {
  const [introSeen, setIntroSeen] = useState(() => {
    try {
      return localStorage.getItem(INTRO_SEEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [lineIndex, setLineIndex] = useState(0);

  if (introSeen) {
    return <StorageModal onClose={onClose} title="Auberge du Sanglier Doré" />;
  }

  function handleAdvance() {
    if (lineIndex < GREETING_LINES.length - 1) {
      setLineIndex((i) => i + 1);
      return;
    }
    try {
      localStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setIntroSeen(true);
  }

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleAdvance}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleAdvance()}
        className="w-full max-w-sm cursor-pointer rounded-2xl border border-lantern/25 bg-[#12111a]/95 p-5 text-left shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
      >
        <div className="flex items-center gap-2">
          <img src={lanternIcon} alt="" className="h-8 w-8" style={{ imageRendering: "pixelated" }} />
          <p className="text-xs font-bold uppercase tracking-wide text-lantern-glow">L'Aubergiste</p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-white/85">{GREETING_LINES[lineIndex]}</p>
        <p className="mt-4 text-right text-[10px] font-bold uppercase tracking-wide text-white/35">
          {lineIndex < GREETING_LINES.length - 1 ? "Toucher pour continuer" : "Toucher pour entrer"}
        </p>
      </div>
    </motion.div>
  );
}
