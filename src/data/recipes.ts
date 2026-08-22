import { EQUIPMENT_BY_ID } from "./equipment";
import { MATERIAL_BY_ID } from "./materials";
import { getInventory, addOwned, removeOwned, spendEcus } from "./inventory";

export interface MaterialCost {
  materialId: string;
  qty: number;
}

export interface ForgeRecipe {
  /** Same id as the equipment it produces — one recipe per result, no separate id namespace needed. */
  id: string;
  resultItemId: string;
  materials: MaterialCost[];
  ecus: number;
}

export interface EnchantRecipe {
  id: string;
  /** The owned equipment copy consumed as the base — enchanting upgrades a piece you already forged
   * rather than being reachable from raw materials alone. */
  baseItemId: string;
  resultItemId: string;
  materials: MaterialCost[];
  ecus: number;
}

/**
 * Every recipe here consumes only materials that already exist in materials.json (looted from the
 * Crypte du Roi Squelette) and produces only equipment that already exists in equipment.json — the
 * "uncommon" tier had NO acquisition path anywhere in the game before this (the starter loadout is
 * all "common", plus one freebie "reinforced_tracker_boots"), and "rare" had none either. Forge fills
 * the uncommon tier from raw materials; Enchant fills the rare tier by upgrading the matching forged
 * piece with the higher-tier "enchantement"-category materials (shimmering_ether, cold_ectoplasm,
 * shadow_essence, forbidden_grimoire_page) that otherwise have no use anywhere in the app.
 */
export const FORGE_RECIPES: ForgeRecipe[] = [
  { id: "reinforced_bone_helm", resultItemId: "reinforced_bone_helm", materials: [{ materialId: "brittle_bone", qty: 3 }, { materialId: "bone_shard", qty: 2 }], ecus: 40 },
  { id: "reinforced_chitin_plate", resultItemId: "reinforced_chitin_plate", materials: [{ materialId: "chitin_scale", qty: 3 }, { materialId: "scraped_leather", qty: 2 }], ecus: 55 },
  { id: "reinforced_scale_greaves", resultItemId: "reinforced_scale_greaves", materials: [{ materialId: "chitin_scale", qty: 2 }, { materialId: "rusty_scrap", qty: 3 }], ecus: 50 },
  { id: "reinforced_tracker_boots", resultItemId: "reinforced_tracker_boots", materials: [{ materialId: "scraped_leather", qty: 3 }, { materialId: "rusty_scrap", qty: 2 }], ecus: 35 },
  { id: "tempered_steel_sword", resultItemId: "tempered_steel_sword", materials: [{ materialId: "ancient_iron_scrap", qty: 2 }, { materialId: "rusty_scrap", qty: 3 }], ecus: 65 },
  { id: "reinforced_longbow", resultItemId: "reinforced_longbow", materials: [{ materialId: "hardened_bone_shaft", qty: 2 }, { materialId: "scraped_leather", qty: 2 }], ecus: 60 },
  { id: "runic_staff", resultItemId: "runic_staff", materials: [{ materialId: "hardened_bone_shaft", qty: 2 }, { materialId: "ancient_iron_scrap", qty: 1 }], ecus: 60 },
  { id: "reinforced_pavise", resultItemId: "reinforced_pavise", materials: [{ materialId: "chitin_scale", qty: 2 }, { materialId: "ancient_iron_scrap", qty: 2 }], ecus: 45 },
  { id: "arcane_grimoire", resultItemId: "arcane_grimoire", materials: [{ materialId: "membrane_wing", qty: 2 }, { materialId: "scraped_leather", qty: 2 }], ecus: 45 },
];

export const ENCHANT_RECIPES: EnchantRecipe[] = [
  { id: "sacred_bone_helm", baseItemId: "reinforced_bone_helm", resultItemId: "sacred_bone_helm", materials: [{ materialId: "shimmering_ether", qty: 1 }], ecus: 90 },
  { id: "sacred_chitin_plate", baseItemId: "reinforced_chitin_plate", resultItemId: "sacred_chitin_plate", materials: [{ materialId: "cold_ectoplasm", qty: 1 }], ecus: 110 },
  { id: "sacred_scale_greaves", baseItemId: "reinforced_scale_greaves", resultItemId: "sacred_scale_greaves", materials: [{ materialId: "shimmering_ether", qty: 1 }], ecus: 100 },
  { id: "elite_tracker_boots", baseItemId: "reinforced_tracker_boots", resultItemId: "elite_tracker_boots", materials: [{ materialId: "cold_ectoplasm", qty: 1 }], ecus: 80 },
  { id: "runic_sword", baseItemId: "tempered_steel_sword", resultItemId: "runic_sword", materials: [{ materialId: "shadow_essence", qty: 1 }], ecus: 130 },
  { id: "elven_hunting_bow", baseItemId: "reinforced_longbow", resultItemId: "elven_hunting_bow", materials: [{ materialId: "shadow_essence", qty: 1 }], ecus: 125 },
  { id: "archmage_staff", baseItemId: "runic_staff", resultItemId: "archmage_staff", materials: [{ materialId: "forbidden_grimoire_page", qty: 1 }], ecus: 130 },
  { id: "guardian_pavise", baseItemId: "reinforced_pavise", resultItemId: "guardian_pavise", materials: [{ materialId: "shield_plating", qty: 1 }], ecus: 95 },
  { id: "forbidden_grimoire", baseItemId: "arcane_grimoire", resultItemId: "forbidden_grimoire", materials: [{ materialId: "forbidden_grimoire_page", qty: 1 }], ecus: 95 },
];

export function resolveForgeRecipe(recipe: ForgeRecipe) {
  return { recipe, result: EQUIPMENT_BY_ID[recipe.resultItemId], materials: recipe.materials.map((c) => ({ cost: c, material: MATERIAL_BY_ID[c.materialId] })) };
}

export function resolveEnchantRecipe(recipe: EnchantRecipe) {
  return {
    recipe,
    base: EQUIPMENT_BY_ID[recipe.baseItemId],
    result: EQUIPMENT_BY_ID[recipe.resultItemId],
    materials: recipe.materials.map((c) => ({ cost: c, material: MATERIAL_BY_ID[c.materialId] })),
  };
}

/** True if the bag currently holds enough of every listed material plus enough Écus. */
export function canAfford(materials: MaterialCost[], ecus: number): boolean {
  const inv = getInventory();
  if (inv.ecus < ecus) return false;
  return materials.every((c) => (inv.materials[c.materialId] ?? 0) >= c.qty);
}

/** Forges `recipe`: consumes its materials + Écus, adds one copy of the result to the bag. No-ops
 * (returns false) if the player can't afford it — callers should already have gated the button on
 * `canAfford`, this is the atomic-write guard against a stale snapshot. */
export function forgeItem(recipe: ForgeRecipe): boolean {
  if (!canAfford(recipe.materials, recipe.ecus)) return false;
  for (const c of recipe.materials) removeOwned("material", c.materialId, c.qty);
  spendEcus(recipe.ecus);
  addOwned("equipment", recipe.resultItemId, 1);
  return true;
}

/** Enchants `recipe`: consumes the base item + materials + Écus, adds one copy of the upgraded
 * result. Requires owning at least one copy of `baseItemId` on top of the material/Écus cost. */
export function enchantItem(recipe: EnchantRecipe): boolean {
  const inv = getInventory();
  if ((inv.ownedEquipment[recipe.baseItemId] ?? 0) < 1) return false;
  if (!canAfford(recipe.materials, recipe.ecus)) return false;
  removeOwned("equipment", recipe.baseItemId, 1);
  for (const c of recipe.materials) removeOwned("material", c.materialId, c.qty);
  spendEcus(recipe.ecus);
  addOwned("equipment", recipe.resultItemId, 1);
  return true;
}
