import { motion } from "framer-motion";
import { getInventory } from "../../data/inventory";
import { canCraftMaterial, craftMaterial, type MaterialRecipe } from "../../data/recipes";
import { MATERIAL_BY_ID } from "../../data/materials";
import { RARITY_BY_ID } from "../../data/rarity";
import ecuIcon from "../../assets/icons/ecu.png";

interface MaterialRecipeListProps {
  recipes: MaterialRecipe[];
  onCrafted: () => void;
}

/**
 * Recipe rows for the Fonderie — a recipe that smelts raw ore into an intermediate MATERIAL (an
 * ingot, a cut gem) rather than equipment or a consumable. Same layout as `ConsumableRecipeList`,
 * just resolving the result against `MATERIAL_BY_ID` instead of `BATTLE_ITEM_BY_ID`; kept as a
 * separate component rather than a union type since the two output kinds resolve against different
 * catalogs entirely.
 */
export default function MaterialRecipeList({ recipes, onCrafted }: MaterialRecipeListProps) {
  const inv = getInventory();

  return (
    <div className="space-y-1.5">
      {recipes.map((recipe) => {
        const result = MATERIAL_BY_ID[recipe.resultMaterialId];
        if (!result) return null;
        const rarity = RARITY_BY_ID[result.rarity];
        const affordable = canCraftMaterial(recipe);
        const owned = inv.materials[result.id] ?? 0;

        return (
          <div key={recipe.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 bg-black/25"
                style={{ borderColor: rarity.color }}
              >
                <img src={result.icon} alt="" className="h-8 w-8 object-contain" style={{ imageRendering: "pixelated" }} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  <p className="text-xs font-bold leading-tight text-white">{result.name}</p>
                  <span className="text-[9px] font-bold" style={{ color: rarity.color }}>
                    {rarity.label}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {recipe.materials.map((cost) => {
                    const material = MATERIAL_BY_ID[cost.materialId];
                    if (!material) return null;
                    const held = inv.materials[cost.materialId] ?? 0;
                    return (
                      <span
                        key={cost.materialId}
                        title={material.name}
                        className={
                          "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold " +
                          (held >= cost.qty ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300")
                        }
                      >
                        <img src={material.icon} alt="" className="h-3 w-3" style={{ imageRendering: "pixelated" }} />
                        {held}/{cost.qty}
                      </span>
                    );
                  })}
                  <span className="flex items-center gap-1 rounded-full bg-black/25 px-1.5 py-0.5 text-[9px] font-bold text-white/70">
                    <img src={ecuIcon} alt="" className="h-3 w-3" style={{ imageRendering: "pixelated" }} />
                    {recipe.ecus}
                  </span>
                  {owned > 0 && <span className="text-[9px] font-bold text-white/35">×{owned} en sac</span>}
                </div>
              </div>

              <motion.button
                type="button"
                disabled={!affordable}
                whileTap={affordable ? { scale: 0.94 } : undefined}
                onClick={() => {
                  if (craftMaterial(recipe)) onCrafted();
                }}
                className={
                  "shrink-0 rounded-lg px-3 py-2 text-[10px] font-bold transition-colors " +
                  (affordable
                    ? "bg-gradient-to-r from-lantern to-lantern-glow text-black hover:opacity-90"
                    : "border border-white/10 bg-black/30 text-white/25")
                }
              >
                Fondre
              </motion.button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
