import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getInventory } from "../../data/inventory";
import { ENCHANT_RECIPES, resolveEnchantRecipe, canAfford, enchantItem } from "../../data/recipes";
import { RARITY_BY_ID } from "../../data/rarity";
import ecuIcon from "../../assets/icons/ecu.png";
import orbFrame0 from "../../assets/town/animations/orb-0.png";

interface EnchantModalProps {
  onClose: () => void;
}

/**
 * The Atelier d'Enchantement: upgrades a forged "uncommon" piece into its "rare" counterpart by
 * consuming the base item plus one of the "enchantement"-category materials (shimmering_ether,
 * cold_ectoplasm, shadow_essence, forbidden_grimoire_page) — materials that otherwise have no use
 * anywhere in the app. A recipe whose base item isn't owned still shows (so the player can see what
 * the Forge needs to produce first), just disabled with that reason called out.
 */
export default function EnchantModal({ onClose }: EnchantModalProps) {
  const [version, setVersion] = useState(0);
  const [glowId, setGlowId] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const inv = useMemo(() => getInventory(), [version]);

  function handleEnchant(recipe: (typeof ENCHANT_RECIPES)[number]) {
    if (!enchantItem(recipe)) return;
    setGlowId(recipe.id);
    setTimeout(() => setGlowId(null), 500);
    setVersion((v) => v + 1);
  }

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/75 p-4 py-8 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-[#12111a]/95 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={orbFrame0} alt="" className="h-7 w-7" style={{ imageRendering: "pixelated" }} />
            <div>
              <h2 className="text-sm font-bold text-white">Atelier d'Enchantement</h2>
              <p className="text-[10px] text-white/45">Améliorez une pièce forgée avec les matériaux les plus rares.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-black/30 px-2 py-1">
              <img src={ecuIcon} alt="" className="h-4 w-4" style={{ imageRendering: "pixelated" }} />
              <span className="text-xs font-bold text-white">{inv.ecus}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-sm text-white/80 backdrop-blur transition-colors hover:bg-black/60 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mt-3 max-h-[440px] space-y-1.5 overflow-y-auto pr-0.5">
          {ENCHANT_RECIPES.map((recipe) => {
            const { base, result, materials } = resolveEnchantRecipe(recipe);
            if (!base || !result) return null;
            const rarity = RARITY_BY_ID[result.rarity];
            const hasBase = (inv.ownedEquipment[recipe.baseItemId] ?? 0) >= 1;
            const affordable = hasBase && canAfford(recipe.materials, recipe.ecus);

            return (
              <div key={recipe.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-black/25 opacity-70">
                    <img src={base.icon} alt="" className="h-6 w-6 object-contain" style={{ imageRendering: "pixelated" }} />
                  </div>
                  <span className="shrink-0 text-white/30">→</span>
                  <motion.div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 bg-black/25"
                    style={{ borderColor: rarity.color }}
                    animate={glowId === recipe.id ? { boxShadow: ["0 0 0px rgba(255,207,107,0)", "0 0 22px 4px rgba(255,207,107,0.8)", "0 0 0px rgba(255,207,107,0)"] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    <img src={result.icon} alt="" className="h-8 w-8 object-contain" style={{ imageRendering: "pixelated" }} />
                  </motion.div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-bold text-white">{result.name}</p>
                      <span className="shrink-0 text-[9px] font-bold" style={{ color: rarity.color }}>
                        {rarity.label}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {!hasBase && (
                        <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-300">
                          {base.name} requis
                        </span>
                      )}
                      {materials.map(({ cost, material }) =>
                        material ? (
                          <span
                            key={cost.materialId}
                            className={
                              "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold " +
                              ((inv.materials[cost.materialId] ?? 0) >= cost.qty ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300")
                            }
                          >
                            <img src={material.icon} alt="" className="h-3 w-3" style={{ imageRendering: "pixelated" }} />
                            {inv.materials[cost.materialId] ?? 0}/{cost.qty}
                          </span>
                        ) : null
                      )}
                      <span className="flex items-center gap-1 rounded-full bg-black/25 px-1.5 py-0.5 text-[9px] font-bold text-white/70">
                        <img src={ecuIcon} alt="" className="h-3 w-3" style={{ imageRendering: "pixelated" }} />
                        {recipe.ecus}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEnchant(recipe)}
                    disabled={!affordable}
                    className={
                      "shrink-0 rounded-lg px-3 py-2 text-[10px] font-bold transition-opacity " +
                      (affordable ? "bg-gradient-to-r from-violet-400 to-fuchsia-300 text-black hover:opacity-90" : "cursor-not-allowed bg-white/10 text-white/35")
                    }
                  >
                    Enchanter
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
