import { motion } from "framer-motion";
import { getInventory } from "../../data/inventory";
import { canCraftConsumable, craftConsumable, type ConsumableRecipe } from "../../data/recipes";
import { BATTLE_ITEM_BY_ID } from "../../data/items";
import { MATERIAL_BY_ID } from "../../data/materials";
import { RARITY_BY_ID } from "../../data/rarity";
import ecuIcon from "../../assets/icons/ecu.png";

interface ConsumableRecipeListProps {
  recipes: ConsumableRecipe[];
  /** Bumped by the parent after a craft so the localStorage-backed reads below recompute. */
  onCrafted: () => void;
}

/**
 * Recipe rows for anything that produces a *consumable* rather than an equipment piece — baits and
 * tools at the Forge, meals at the campfire. One component for both so the two stations can't drift
 * apart on how a cost is displayed, the same reason `TownPanel` serves the modal and inline routes.
 */
export default function ConsumableRecipeList({ recipes, onCrafted }: ConsumableRecipeListProps) {
  const inv = getInventory();

  return (
    <div className="space-y-1.5">
      {recipes.map((recipe) => {
        const result = BATTLE_ITEM_BY_ID[recipe.resultItemId];
        if (!result) return null;
        const rarity = RARITY_BY_ID[result.rarity];
        const affordable = canCraftConsumable(recipe);
        const owned = inv.ownedConsumables[result.id] ?? 0;

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
                  {recipe.qty > 1 && <span className="text-[9px] font-bold text-white/45">×{recipe.qty}</span>}
                </div>

                {/* A meal's whole point is its buff, so it goes on the row rather than being
                    hidden behind an item modal the player has no reason to open first. */}
                {result.buff && (
                  <p className="mt-0.5 text-[9px] leading-snug text-emerald-300/85">{result.buff.label}</p>
                )}

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
                  if (craftConsumable(recipe)) onCrafted();
                }}
                className={
                  "shrink-0 rounded-lg px-3 py-2 text-[10px] font-bold transition-colors " +
                  (affordable
                    ? "bg-gradient-to-r from-lantern to-lantern-glow text-black hover:opacity-90"
                    : "border border-white/10 bg-black/30 text-white/25")
                }
              >
                Fabriquer
              </motion.button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
