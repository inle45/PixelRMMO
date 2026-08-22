import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getInventory } from "../../data/inventory";
import {
  FORGE_RECIPES,
  AQUATIC_FORGE_RECIPES,
  BAIT_RECIPES,
  resolveForgeRecipe,
  canAfford,
  forgeItem,
} from "../../data/recipes";
import ConsumableRecipeList from "./ConsumableRecipeList";
import { RARITY_BY_ID } from "../../data/rarity";
import TownPanel from "./TownPanel";
import ecuIcon from "../../assets/icons/ecu.png";
import forgeIcon from "../../assets/icons/dungeon/attack.png";

interface ForgeStationProps {
  /** Omitted = inline (Crafting tab). Present = modal (tapped the forge on the plaza). */
  onClose?: () => void;
}

/**
 * The Grande Forge: every recipe consumes only Crypte materials the player already loots and
 * produces the "uncommon" equipment tier, which otherwise has no acquisition path anywhere in the
 * game (see recipes.ts).
 */
export default function ForgeStation({ onClose }: ForgeStationProps) {
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
    <TownPanel
      title="Grande Forge"
      subtitle="Forgez de l'équipement à partir des matériaux de la Crypte."
      icon={forgeIcon}
      onClose={onClose}
      headerExtra={
        <div className="flex items-center gap-1 rounded-full bg-black/30 px-2 py-1">
          <img src={ecuIcon} alt="" className="h-4 w-4" style={{ imageRendering: "pixelated" }} />
          <span className="text-xs font-bold text-white">{inv.ecus}</span>
        </div>
      }
    >
      <div className="mt-3 max-h-[440px] space-y-1.5 overflow-y-auto pr-0.5">
        {[...FORGE_RECIPES, ...AQUATIC_FORGE_RECIPES].map((recipe) => {
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
                  {/* Wraps rather than truncating — "Heaume d'Os Renforcé" cut down to
                      "Heaume d'Os…" made two different recipes indistinguishable. */}
                  <div className="flex flex-wrap items-baseline gap-x-1.5">
                    <p className="text-xs font-bold leading-tight text-white">{result.name}</p>
                    <span className="text-[9px] font-bold" style={{ color: rarity.color }}>
                      {rarity.label}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {materials.map(({ cost, material }) =>
                      material ? (
                        <span
                          key={cost.materialId}
                          title={material.name}
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
                    {owned > 0 && <span className="text-[9px] font-bold text-white/35">×{owned} en sac</span>}
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

        {/* Baits and the harpoon are forged here too — they are tools, not food, and gating the
            fishing zone behind the Forge is what ties the two gathering zones into one economy. */}
        <p className="pt-2 text-[10px] font-bold uppercase tracking-wide text-white/45">Appâts & Outils de Pêche</p>
        <ConsumableRecipeList recipes={BAIT_RECIPES} onCrafted={() => setVersion((v) => v + 1)} />
      </div>
    </TownPanel>
  );
}
