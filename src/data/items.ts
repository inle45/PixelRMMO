import potionIcon from "../assets/icons/items/potion.png";
import remedyIcon from "../assets/dungeon/remedy.png";
import type { RarityId } from "./rarity";
import plantBaitIcon from "../assets/inventory/icons/plant_bait.png";
import glowBaitIcon from "../assets/inventory/icons/glow_bait.png";
import harpoonIcon from "../assets/inventory/icons/toxic_harpoon.png";
import soupIcon from "../assets/inventory/icons/carp_soup.png";
import eelDishIcon from "../assets/inventory/icons/flamed_eel.png";
import feastIcon from "../assets/inventory/icons/catfish_feast.png";

export type ItemEffect = "heal" | "cure_status" | "bait" | "meal";

/** Where an item is usable. Only "battle" items are offered by the arena's Sac; baits are spent by
 * casting a line and meals are eaten at the campfire, so neither belongs in a fight. */
export type ItemCategory = "battle" | "bait" | "meal";

/** A meal's timed effect. `stats` is the slice the combat engine can actually honour today
 * (see mealBuffs.ts); `label` is the full human-readable promise, including the parts that are
 * still flavour. */
export interface MealBuff {
  label: string;
  durationMin: number;
  stats?: { maxHpPct?: number; critChance?: number; regenPerTurn?: number };
  /** Statuses this meal makes the hero immune to for its duration. */
  immuneTo?: string[];
}

export interface BattleItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  effect: ItemEffect;
  /** Effect magnitude — heal amount for "heal", unused for "cure_status". */
  value: number;
  rarity: RarityId;
  /** Écus resale value shown in the Inventaire item modal — a separate concept from `value`. */
  sellValue: number;
  /** Defaults to "battle" when absent, so the two original potions need no migration. */
  category?: ItemCategory;
  /** Baits only: which fishing tier this bait can be cast with. */
  baitTier?: 1 | 2 | 3;
  /** Meals only. */
  buff?: MealBuff;
  /** Listable on the Cité's Marché C2C. */
  tradeable?: boolean;
  /** Indicative euro valuation displayed on the C2C board. The game has NO payment backend —
   * nothing here moves real money; see marketListings.ts. */
  eurValue?: number;
}

export const BATTLE_ITEMS: BattleItem[] = [
  {
    id: "heal_potion",
    name: "Potion de Soin",
    icon: potionIcon,
    description: "Restaure 50 PV instantanément.",
    effect: "heal",
    value: 50,
    rarity: "common",
    sellValue: 12,
  },
  {
    id: "remedy",
    name: "Remède",
    icon: remedyIcon,
    description: "Retire toutes les altérations d'état négatives.",
    effect: "cure_status",
    value: 0,
    rarity: "uncommon",
    sellValue: 20,
  },
];

/* ------------------------------------------------------- Bassin du Cratère: baits, tools, meals */

export const FISHING_ITEMS: BattleItem[] = [
  {
    id: "plant_bait",
    name: "Amorce Végétale",
    icon: plantBaitIcon,
    description: "Une boulette de mousse pressée. Suffit à tromper les carpes des Eaux de Rive.",
    effect: "bait",
    value: 0,
    rarity: "common",
    sellValue: 4,
    category: "bait",
    baitTier: 1,
    tradeable: true,
  },
  {
    id: "glow_bait",
    name: "Appât Phosphorescent",
    icon: glowBaitIcon,
    description: "Sa lueur froide perce la brume nocturne. Indispensable pour pêcher entre 21h et 06h.",
    effect: "bait",
    value: 0,
    rarity: "rare",
    sellValue: 22,
    category: "bait",
    baitTier: 2,
    tradeable: true,
  },
  {
    id: "toxic_harpoon",
    name: "Harpon Toxique",
    icon: harpoonIcon,
    description: "Sonde la Fosse Abyssale et réduit de 40 % l'attaque des créatures marines réveillées.",
    effect: "bait",
    value: 0,
    rarity: "epic",
    sellValue: 70,
    category: "bait",
    baitTier: 3,
    tradeable: true,
  },
];

export const MEAL_ITEMS: BattleItem[] = [
  {
    id: "carp_soup",
    name: "Soupe de Carpe des Rives",
    icon: soupIcon,
    description: "Un bouillon épais qui tient au corps bien après la dernière cuillerée.",
    effect: "meal",
    value: 0,
    rarity: "common",
    sellValue: 18,
    category: "meal",
    tradeable: true,
    buff: { label: "Régénération de 5 PV/sec pendant 20 min", durationMin: 20, stats: { regenPerTurn: 12 } },
  },
  {
    id: "flamed_eel",
    name: "Filet d'Anguille Flambé",
    icon: eelDishIcon,
    description: "La chair garde sa phosphorescence : on y voit clair jusqu'au fond des cryptes.",
    effect: "meal",
    value: 0,
    rarity: "rare",
    sellValue: 48,
    category: "meal",
    tradeable: true,
    eurValue: 3.5,
    buff: { label: "+15 % Dégâts critiques et vision nocturne pendant 30 min", durationMin: 30, stats: { critChance: 0.15 } },
  },
  {
    id: "catfish_feast",
    name: "Festin de Silure Ancestral",
    icon: feastIcon,
    description: "Un plat de veille de bataille. Le venin royal qui l'assaisonne finit par vous immuniser.",
    effect: "meal",
    value: 0,
    rarity: "epic",
    sellValue: 120,
    category: "meal",
    tradeable: true,
    eurValue: 9,
    buff: {
      label: "+25 % PV Max et Immunité au poison pendant 45 min",
      durationMin: 45,
      stats: { maxHpPct: 0.25 },
      immuneTo: ["poison"],
    },
  },
];

/** Every consumable the inventory can hold, battle or not — this is what the bag, the chest and the
 * Marché all resolve ids against, so a bait or a meal shows up there exactly like a potion. */
export const ALL_CONSUMABLES: BattleItem[] = [...BATTLE_ITEMS, ...FISHING_ITEMS, ...MEAL_ITEMS];

export const BATTLE_ITEM_BY_ID: Record<string, BattleItem> = Object.fromEntries(
  ALL_CONSUMABLES.map((i) => [i.id, i])
);

/** Starting consumable loadout for a dungeon run. */
export const STARTING_ITEM_COUNTS: Record<string, number> = {
  heal_potion: 3,
  remedy: 1,
};
