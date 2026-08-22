import { useState } from "react";
import { motion } from "framer-motion";
import { COOKING_RECIPES } from "../../data/recipes";
import { BATTLE_ITEM_BY_ID } from "../../data/items";
import { getInventory } from "../../data/inventory";
import { eatMeal, getActiveMeal, getActiveMealBuff, msUntilMealExpires } from "../../data/mealBuffs";
import TownPanel from "./TownPanel";
import ConsumableRecipeList from "./ConsumableRecipeList";
import kitchenIcon from "../../assets/inventory/icons/carp_soup.png";

interface KitchenStationProps {
  onClose?: () => void;
}

function fmt(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  return `${m}m ${(total % 60).toString().padStart(2, "0")}s`;
}

/**
 * La Cuisine du Campement.
 *
 * Unlike the Forge and the Atelier d'Enchantement this one is NOT in the Cité — meals are cooked at
 * the player's own campfire — so it never gets a plaza zone marker. It still reuses `TownPanel`
 * because that component is really "a station body, modal or inline", not a town-specific shell.
 *
 * Only one meal runs at a time (see mealBuffs.ts); the active-buff banner is here rather than in a
 * global HUD so the place you eat is also the place you check what you're running.
 */
export default function KitchenStation({ onClose }: KitchenStationProps) {
  const [version, setVersion] = useState(0);
  void version; // forces the localStorage-backed reads below to recompute after each action

  const active = getActiveMeal();
  const activeItem = active ? BATTLE_ITEM_BY_ID[active.itemId] : null;
  const activeBuff = getActiveMealBuff();
  const inv = getInventory();
  const cooked = COOKING_RECIPES.map((r) => BATTLE_ITEM_BY_ID[r.resultItemId]).filter(Boolean);

  return (
    <TownPanel
      title="Cuisine du Campement"
      subtitle="Plats de buffs à durée limitée"
      icon={kitchenIcon}
      onClose={onClose}
    >
      {activeItem && activeBuff ? (
        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-emerald-400/35 bg-emerald-950/30 p-2.5">
          <img src={activeItem.icon} alt="" className="h-8 w-8 object-contain" style={{ imageRendering: "pixelated" }} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-emerald-200">{activeItem.name}</p>
            <p className="text-[9px] leading-snug text-emerald-300/80">{activeBuff.label}</p>
          </div>
          <span className="shrink-0 font-mono text-[10px] font-bold text-emerald-300">{fmt(msUntilMealExpires())}</span>
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-white/10 bg-black/25 p-2.5 text-[10px] text-white/45">
          Aucun plat en cours. Un seul effet peut être actif à la fois — manger remplace le précédent.
        </p>
      )}

      {/* Eat what's already in the bag, without having to cook again. */}
      {cooked.some((i) => (inv.ownedConsumables[i.id] ?? 0) > 0) && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-white/45">Dans le sac</p>
          <div className="flex flex-wrap gap-1.5">
            {cooked.map((item) => {
              const held = inv.ownedConsumables[item.id] ?? 0;
              if (held <= 0) return null;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    if (eatMeal(item.id)) setVersion((v) => v + 1);
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-950/30 px-2.5 py-1.5 text-[10px] font-bold text-emerald-200 hover:bg-emerald-900/40"
                >
                  <img src={item.icon} alt="" className="h-4 w-4" style={{ imageRendering: "pixelated" }} />
                  Manger ×{held}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 max-h-[380px] overflow-y-auto pr-0.5">
        <ConsumableRecipeList recipes={COOKING_RECIPES} onCrafted={() => setVersion((v) => v + 1)} />
      </div>
    </TownPanel>
  );
}
