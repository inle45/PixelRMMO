import { motion } from "framer-motion";
import { mapIcon } from "../../data/campScene";

interface WorldMapOverlayProps {
  onClose: () => void;
}

/**
 * The destination of the Camp's map button. The interactive world map itself is a module of its
 * own (regions, travel, unlock state) with no spec or art yet, so this ships as the framed shell
 * and the transition into it — deliberately an honest placeholder rather than a fake map, which
 * would have to be thrown away once the real region data exists.
 */
export default function WorldMapOverlay({ onClose }: WorldMapOverlayProps) {
  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-lantern/25 bg-[#12111a]/95 p-6 text-center shadow-[0_25px_60px_rgba(0,0,0,0.6)]"
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 10, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-sm text-white/80 transition-colors hover:bg-black/60 hover:text-white"
        >
          ✕
        </button>

        {mapIcon && (
          <motion.img
            src={mapIcon}
            alt=""
            className="mx-auto h-16 w-16"
            style={{ imageRendering: "pixelated" }}
            animate={{ rotate: [0, 8, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <h2 className="mt-3 text-lg font-bold text-white">Carte du Monde</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          Les routes du royaume s'ouvriront bientôt. Depuis ce campement, tu pourras rejoindre les
          régions, les donjons et les villes marchandes.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-lantern to-lantern-glow px-4 py-2.5 text-xs font-bold text-black transition-opacity hover:opacity-90"
        >
          Retour au Campement
        </button>
      </motion.div>
    </motion.div>
  );
}
