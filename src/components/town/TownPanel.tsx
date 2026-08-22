import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface TownPanelProps {
  title: string;
  subtitle?: string;
  icon: string;
  /** Present = render as a fullscreen modal over the Cité's plaza (a zone marker opened it).
   * Absent = render as a plain inline card, for the Crafting/Marché bottom-nav tabs, which reach the
   * exact same content without teleporting the player into the town scene first. */
  onClose?: () => void;
  /** Écus counter, filter pills… anything the panel wants pinned in its header row. */
  headerExtra?: ReactNode;
  children: ReactNode;
  /** Modal mode only — the Marché needs to be wider than the crafting stations. */
  maxWidth?: string;
}

/**
 * One shell, two presentations. Every Cité station (Forge, Enchantement, Garde, Marché) renders the
 * same body whether it was opened by tapping its building on the plaza or by tapping its bottom-nav
 * tab — this exists so those two entry points can never drift apart, and so a nav tab doesn't have
 * to drop the player into the town scene just to reach a shop counter.
 */
export default function TownPanel({ title, subtitle, icon, onClose, headerExtra, children, maxWidth = "max-w-md" }: TownPanelProps) {
  const header = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <img src={icon} alt="" className="h-7 w-7 shrink-0 object-contain" style={{ imageRendering: "pixelated" }} />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-white">{title}</h2>
          {subtitle && <p className="truncate text-[10px] text-white/45">{subtitle}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {headerExtra}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-sm text-white/80 backdrop-blur transition-colors hover:bg-black/60 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );

  const card = (
    <div className={`w-full ${maxWidth} rounded-2xl border border-white/10 bg-[#12111a]/95 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:p-5`}>
      {header}
      {children}
    </div>
  );

  if (!onClose) return card;

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/75 p-4 py-8 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className={`w-full ${maxWidth}`}>
        {card}
      </div>
    </motion.div>
  );
}
