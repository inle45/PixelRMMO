import { motion } from "framer-motion";
import { RARITY_BY_ID } from "../../data/rarity";
import { CATEGORY_ICONS, CATEGORY_LABELS, type MaterialDef } from "../../data/materials";
import RarityFrame from "./RarityFrame";
import ecuIcon from "../../assets/icons/ecu.png";

interface MaterialModalProps {
  material: MaterialDef;
  monsterName: string;
  onClose: () => void;
  onViewMonster: () => void;
}

export default function MaterialModal({ material, monsterName, onClose, onViewMonster }: MaterialModalProps) {
  const rarity = RARITY_BY_ID[material.rarity];

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/75 p-4 py-8 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
        <RarityFrame rarity={material.rarity} layoutId={`material-card-${material.id}`}>
          <div className="relative rounded-2xl bg-[#12111a]/95 p-5 shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-sm text-white/80 backdrop-blur transition-colors hover:bg-black/60 hover:text-white"
            >
              ✕
            </button>

            <div className="flex items-start justify-between gap-2 pr-8">
              <span className="rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-bold text-white/60">
                {CATEGORY_ICONS[material.category]} {CATEGORY_LABELS[material.category]}
              </span>
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                style={{ color: rarity.color, backgroundColor: `${rarity.color}22`, border: `1px solid ${rarity.color}66` }}
              >
                {rarity.label}
              </span>
            </div>

            <div className="mx-auto mt-3 flex h-28 w-28 items-center justify-center rounded-2xl border border-white/10 bg-black/25">
              <img
                src={material.icon}
                alt={material.name}
                className="h-20 w-20 object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            </div>

            <div className="mt-3 text-center">
              <h2 className="text-lg font-bold text-white">{material.name}</h2>
              <p className="mt-0.5 text-xs text-white/50">{material.usage}</p>
            </div>

            <p className="mt-4 text-xs italic leading-relaxed text-white/60">{material.lore}</p>

            <div className="mt-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-white/60">Provenance</h3>
              <button
                type="button"
                onClick={onViewMonster}
                className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-left text-xs transition-colors hover:border-lantern/40 hover:bg-black/35"
              >
                <span className="text-white/75">{monsterName}</span>
                <span className="font-bold text-lantern-glow">{material.provenance.dropChance}%</span>
              </button>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-black/20 px-3 py-2.5">
              <img src={ecuIcon} alt="" className="h-6 w-6" style={{ imageRendering: "pixelated" }} />
              <span className="text-base font-bold text-white">{material.value} Écus</span>
            </div>
          </div>
        </RarityFrame>
      </div>
    </motion.div>
  );
}
