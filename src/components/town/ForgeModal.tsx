import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getInventory } from "../../data/inventory";
import { FORGE_RECIPES, resolveForgeRecipe, canAfford, forgeItem } from "../../data/recipes";
import { RARITY_BY_ID } from "../../data/rarity";
import ecuIcon from "../../assets/icons/ecu.png";
import forgeIcon from "../../assets/icons/dungeon/attack.png";

interface ForgeModalProps {
  onClose: () => void;
}

/**
 * The Grande Forge: every recipe here consumes only Crypte materials the player already loots and
 * produces the "uncommon" equipment tier, which otherwise has no acquisition path anywhere in the
 * game (see recipes.ts). One flat list rather than a grid — 9 recipes read fine as rows, and a row
 * has room for the full cost breakdown (icon + owned/needed count per material) without a details
 * sub-screen.
 */
export default function ForgeModal({ onClose }: ForgeModalProps) {
  const [version, setVersion] = useState(0);
  const [strikeId, setStrikeId] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const inv = useMemo(() => getInventory(), [version]);

  function handleForge(recipe: (typeof FORGE_RECIPES)[number]) {
    if (!forgeItem(recipe)) return;
    setStrikeId(recipe.id);
    setTimeout(() => setStrikeId(null), 420);
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
            <img src={forgeIcon} alt="" className="h-7 w-7" style={{ imageRendering: "pixelated" }} />
            <div>
              <h2 className="text-sm font-bold text-white">Grande Forge</h2>
              <p className="text-[10px] text-white/45">Forgez de l'équipement à partir des matériaux de la Crypte.</p>
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
          {FORGE_RECIPES.map((recipe) => {
            const { result, materials } = resolveForgeRecipe(recipe);
            if (!result) return null;
            const rarity = RARITY_BY_ID[result.rarity];
            const affordable = canAfford(recipe.materials, recipe.ecus);
            const owned = inv.ownedEquipment[result.id] ?? 0;

            return (
              <div key={recipe.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                <div className="flex items-center gap-2.5">
                  <motion.div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 bg-black/25"
                    style={{ borderColor: rarity.color }}
                    animate={strikeId === recipe.id ? { scale: [1, 0.85, 1.08, 1], rotate: [0, -6, 4, 0] } : {}}
                    transition={{ duration: 0.42 }}
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
                      {owned > 0 && <span className="text-[9px] font-bold text-white/35">×{owned} possédé{owned > 1 ? "s" : ""}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleForge(recipe)}
                    disabled={!affordable}
                    className={
                      "shrink-0 rounded-lg px-3 py-2 text-[10px] font-bold transition-opacity " +
                      (affordable ? "bg-gradient-to-r from-lantern to-lantern-glow text-black hover:opacity-90" : "cursor-not-allowed bg-white/10 text-white/35")
                    }
                  >
                    Forger
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
