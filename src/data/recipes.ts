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

/* ============================================================ Bassin du Cratère: baits & cooking */

/** A recipe that produces a *consumable* (bait, tool or meal) rather than an equipment piece.
 * Same shape as ForgeRecipe minus the equipment lookup, so the station UI can render both. */
export interface ConsumableRecipe {
  id: string;
  resultItemId: string;
  qty: number;
  materials: MaterialCost[];
  ecus: number;
  /** Which workbench offers it: the Forge for gear and tools, the campfire for food. */
  station: "forge" | "kitchen";
}

/**
 * Baits gate the fishing zone, and every one of them is paid for in Grotte aux Champignons
 * materials — that is deliberate: it wires the two gathering zones into one economy instead of
 * leaving each a closed loop. "Lingots de Fer" in the spec resolves to the crypt's existing
 * `ancient_iron_scrap` rather than a fourth near-identical ingot material.
 */
export const BAIT_RECIPES: ConsumableRecipe[] = [
  {
    id: "plant_bait",
    resultItemId: "plant_bait",
    qty: 5,
    materials: [{ materialId: "mousse_caverne", qty: 2 }],
    ecus: 5,
    station: "forge",
  },
  {
    id: "glow_bait",
    resultItemId: "glow_bait",
    qty: 3,
    materials: [
      { materialId: "spores_luminescents", qty: 1 },
      { materialId: "mousse_caverne", qty: 1 },
    ],
    ecus: 25,
    station: "forge",
  },
  {
    id: "toxic_harpoon",
    resultItemId: "toxic_harpoon",
    qty: 1,
    materials: [
      { materialId: "fongus_toxique", qty: 1 },
      { materialId: "ancient_iron_scrap", qty: 2 },
    ],
    ecus: 80,
    station: "forge",
  },
];

/** Meals are cooked at the campfire, never at the Forge — each pairs one fish with the mushroom
 * material of the matching tier, so cooking consumes both zones at once. */
export const COOKING_RECIPES: ConsumableRecipe[] = [
  {
    id: "carp_soup",
    resultItemId: "carp_soup",
    qty: 1,
    materials: [
      { materialId: "golden_carp", qty: 1 },
      { materialId: "mousse_caverne", qty: 1 },
    ],
    ecus: 10,
    station: "kitchen",
  },
  {
    id: "flamed_eel",
    resultItemId: "flamed_eel",
    qty: 1,
    materials: [
      { materialId: "spectral_eel", qty: 1 },
      { materialId: "spores_luminescents", qty: 1 },
    ],
    ecus: 30,
    station: "kitchen",
  },
  {
    id: "catfish_feast",
    resultItemId: "catfish_feast",
    qty: 1,
    materials: [
      { materialId: "ancestral_catfish", qty: 1 },
      { materialId: "fongus_toxique", qty: 1 },
    ],
    ecus: 70,
    station: "kitchen",
  },
];

/** Aquatic-loot gear, filling the Forge's roster out with pieces the crypt materials can't make. */
export const AQUATIC_FORGE_RECIPES: ForgeRecipe[] = [
  {
    id: "marsh_leather_plate",
    resultItemId: "marsh_leather_plate",
    materials: [
      { materialId: "raw_hide", qty: 4 },
      { materialId: "slimy_mucus", qty: 2 },
    ],
    ecus: 90,
  },
  {
    id: "mist_hood",
    resultItemId: "mist_hood",
    materials: [
      { materialId: "mist_scale", qty: 3 },
      { materialId: "razor_fin", qty: 1 },
    ],
    ecus: 180,
  },
  {
    id: "leviathan_trident",
    resultItemId: "leviathan_trident",
    materials: [
      { materialId: "primordial_scale", qty: 1 },
      { materialId: "ancient_iron_scrap", qty: 3 },
      { materialId: "shining_pearl", qty: 1 },
    ],
    ecus: 600,
  },
];

export function canCraftConsumable(recipe: ConsumableRecipe): boolean {
  const inv = getInventory();
  if (inv.ecus < recipe.ecus) return false;
  return recipe.materials.every((m) => (inv.materials[m.materialId] ?? 0) >= m.qty);
}

/** Consumes the materials and Écus, then grants the consumable. Refuses atomically — nothing is
 * spent unless the whole recipe can be paid for. */
export function craftConsumable(recipe: ConsumableRecipe): boolean {
  if (!canCraftConsumable(recipe)) return false;
  if (!spendEcus(recipe.ecus)) return false;
  for (const m of recipe.materials) removeOwned("material", m.materialId, m.qty);
  addOwned("consumable", recipe.resultItemId, recipe.qty);
  return true;
}

/* ============================================================= Canyons Écarlates: métallurgie */

/** A recipe that smelts raw ore into an intermediate MATERIAL (an ingot, a cut gem) rather than
 * equipment or a consumable — the Fonderie's own output type, consumed downstream by the Forge's
 * `AQUATIC_FORGE_RECIPES`-style equipment recipes below. */
export interface MaterialRecipe {
  id: string;
  resultMaterialId: string;
  qty: number;
  materials: MaterialCost[];
  ecus: number;
  station: "foundry";
}

/** "Poussière Luminescente" in the spec resolves to the existing `spores_luminescents` — reusing the
 * mushroom cave's own enchantment material rather than inventing a fourth near-identical one, the
 * same call the fishing zone's baits already made for its own ingredients. */
export const FOUNDRY_RECIPES: MaterialRecipe[] = [
  {
    id: "copper_ingot",
    resultMaterialId: "copper_ingot",
    qty: 1,
    materials: [
      { materialId: "copper_ore", qty: 3 },
      { materialId: "coal", qty: 1 },
    ],
    ecus: 8,
    station: "foundry",
  },
  {
    id: "red_iron_ingot",
    resultMaterialId: "red_iron_ingot",
    qty: 1,
    materials: [
      { materialId: "red_iron_ore", qty: 3 },
      { materialId: "coal", qty: 2 },
    ],
    ecus: 20,
    station: "foundry",
  },
  {
    id: "ardent_ruby_cut",
    resultMaterialId: "ardent_ruby_cut",
    qty: 1,
    materials: [
      { materialId: "ardent_ruby_rough", qty: 1 },
      { materialId: "spores_luminescents", qty: 1 },
    ],
    ecus: 50,
    station: "foundry",
  },
];

/** Canyon-loot gear, filling the Forge's roster out with pieces the crypt/cave/lake materials can't
 * make — smelted ingots rather than raw ore, so a piece always costs a Fonderie pass first. */
export const CANYON_FORGE_RECIPES: ForgeRecipe[] = [
  {
    id: "chitin_scale_shield",
    resultItemId: "chitin_scale_shield",
    materials: [
      { materialId: "chitin_carapace", qty: 4 },
      { materialId: "copper_ingot", qty: 2 },
    ],
    ecus: 70,
  },
  {
    id: "raider_pauldrons",
    resultItemId: "raider_pauldrons",
    materials: [
      { materialId: "thick_leather", qty: 3 },
      { materialId: "red_iron_ingot", qty: 2 },
    ],
    ecus: 160,
  },
  {
    id: "scarlet_claymore",
    resultItemId: "scarlet_claymore",
    materials: [
      { materialId: "red_iron_ingot", qty: 4 },
      { materialId: "sandstone_heart", qty: 1 },
      { materialId: "ardent_ruby_cut", qty: 1 },
    ],
    ecus: 700,
  },
];

export function canCraftMaterial(recipe: MaterialRecipe): boolean {
  const inv = getInventory();
  if (inv.ecus < recipe.ecus) return false;
  return recipe.materials.every((m) => (inv.materials[m.materialId] ?? 0) >= m.qty);
}

/** Same atomic all-or-nothing spend as `craftConsumable` — nothing is consumed unless the whole
 * recipe can be paid for. */
export function craftMaterial(recipe: MaterialRecipe): boolean {
  if (!canCraftMaterial(recipe)) return false;
  if (!spendEcus(recipe.ecus)) return false;
  for (const m of recipe.materials) removeOwned("material", m.materialId, m.qty);
  addOwned("material", recipe.resultMaterialId, recipe.qty);
  return true;
}
