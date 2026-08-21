import { motion } from "framer-motion";
import { RARITY_BY_ID } from "../../data/rarity";
import { SLOT_META, type EquipmentStats } from "../../data/equipment";
import { TYPE_BY_ID } from "../../data/typeSystem";
import RarityFrame from "../codex/RarityFrame";
import type { InventoryEntry } from "./InventoryGrid";
import ecuIcon from "../../assets/icons/ecu.png";

interface ItemDetailsModalProps {
  entry: InventoryEntry;
  onClose: () => void;
  onEquip: () => void;
  onConsume: () => void;
  onDiscard: () => void;
}

const STAT_LABELS: Record<keyof EquipmentStats, string> = {
  hp: "PV",
  mana: "Mana",
  atk: "Attaque",
  def: "Défense",
  speed: "Vitesse",
  critChance: "Critique",
  dodgeChance: "Esquive",
  blockChance: "Parade",
  magicPenetration: "Pénétration Magique",
};

const PERCENT_STATS = new Set<keyof EquipmentStats>(["critChance", "dodgeChance", "blockChance", "magicPenetration"]);

export default function ItemDetailsModal({ entry, onClose, onEquip, onConsume, onDiscard }: ItemDetailsModalProps) {
  const rarity = RARITY_BY_ID[entry.rarity];
  const { equipment, material, consumable } = entry;

  const lore = equipment?.lore ?? material?.lore ?? consumable?.description ?? "";
  const sellValue = equipment?.value ?? material?.value ?? consumable?.sellValue ?? 0;
  const levelRequired = equipment?.levelRequired;
  const affinity = equipment?.damageType ? TYPE_BY_ID[equipment.damageType] : undefined;

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
        <RarityFrame rarity={entry.rarity}>
          <div className="relative rounded-2xl bg-[#12111a]/95 p-5 shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-sm text-white/80 backdrop-blur transition-colors hover:bg-black/60 hover:text-white"
            >
              ✕
            </button>

            <div className="flex flex-wrap items-start justify-between gap-2 pr-8">
              {equipment ? (
                <span className="rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-bold text-white/60">
                  Emplacement : {SLOT_META[equipment.slot].label}
                </span>
              ) : (
                <span className="rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-bold text-white/60">
                  {entry.kind === "consumable" ? "Consommable" : material?.category === "reliques" ? "Relique" : "Matériau"}
                </span>
              )}
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                style={{ color: rarity.color, backgroundColor: `${rarity.color}22`, border: `1px solid ${rarity.color}66` }}
              >
                {rarity.emoji} {rarity.label}
              </span>
            </div>

            <div className="mx-auto mt-3 flex h-28 w-28 items-center justify-center rounded-2xl border border-white/10 bg-black/25">
              <img src={entry.icon} alt={entry.name} className="h-20 w-20 object-contain" style={{ imageRendering: "pixelated" }} />
            </div>

            <div className="mt-3 text-center">
              <h2 className="text-lg font-bold text-white">{entry.name}</h2>
              {typeof levelRequired === "number" && (
                <p className="mt-0.5 text-xs text-white/50">Niveau requis : {levelRequired}</p>
              )}
            </div>

            {equipment && (
              <div className="mt-4 grid grid-cols-2 gap-1.5">
                {(Object.entries(equipment.stats) as [keyof EquipmentStats, number | undefined][])
                  .filter(([, v]) => !!v)
                  .map(([key, v]) => (
                    <div key={key} className="rounded-lg bg-black/20 px-2 py-1.5 text-center">
                      <p className="text-[9px] font-medium uppercase tracking-wide text-white/45">{STAT_LABELS[key]}</p>
                      <p className="mt-0.5 text-xs font-bold text-emerald-300">
                        +{PERCENT_STATS.has(key) ? `${Math.round((v ?? 0) * 100)}%` : v}
                      </p>
                    </div>
                  ))}
                {affinity && (
                  <div className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg bg-black/20 px-2 py-1.5">
                    {affinity.icon && <img src={affinity.icon} alt="" className="h-3.5 w-3.5" style={{ imageRendering: "pixelated" }} />}
                    <span className="text-[11px] font-bold" style={{ color: affinity.color }}>
                      Affinité {affinity.name}
                    </span>
                  </div>
                )}
              </div>
            )}

            {lore && <p className="mt-4 text-xs italic leading-relaxed text-white/60">{lore}</p>}

            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-black/20 px-3 py-2.5">
              <img src={ecuIcon} alt="" className="h-6 w-6" style={{ imageRendering: "pixelated" }} />
              <span className="text-base font-bold text-white">{sellValue} Écus</span>
            </div>

            <div className="mt-4 flex gap-2">
              {equipment && (
                <button
                  type="button"
                  onClick={onEquip}
                  className="flex-1 rounded-xl bg-gradient-to-r from-lantern to-lantern-glow px-3 py-2.5 text-xs font-bold text-black transition-opacity hover:opacity-90"
                >
                  Équiper
                </button>
              )}
              {consumable && (
                <button
                  type="button"
                  onClick={onConsume}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-300 px-3 py-2.5 text-xs font-bold text-black transition-opacity hover:opacity-90"
                >
                  Consommer
                </button>
              )}
              <button
                type="button"
                onClick={onDiscard}
                className="flex-1 rounded-xl border border-rose-400/40 bg-rose-950/30 px-3 py-2.5 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-950/50"
              >
                Jeter
              </button>
            </div>
          </div>
        </RarityFrame>
      </div>
    </motion.div>
  );
}
