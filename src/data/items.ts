import potionIcon from "../assets/icons/items/potion.png";
import remedyIcon from "../assets/dungeon/remedy.png";

export type ItemEffect = "heal" | "cure_status";

export interface BattleItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  effect: ItemEffect;
  value: number;
}

export const BATTLE_ITEMS: BattleItem[] = [
  {
    id: "heal_potion",
    name: "Potion de Soin",
    icon: potionIcon,
    description: "Restaure 50 PV instantanément.",
    effect: "heal",
    value: 50,
  },
  {
    id: "remedy",
    name: "Remède",
    icon: remedyIcon,
    description: "Retire toutes les altérations d'état négatives.",
    effect: "cure_status",
    value: 0,
  },
];

export const BATTLE_ITEM_BY_ID: Record<string, BattleItem> = Object.fromEntries(
  BATTLE_ITEMS.map((i) => [i.id, i])
);

/** Starting consumable loadout for a dungeon run. */
export const STARTING_ITEM_COUNTS: Record<string, number> = {
  heal_potion: 3,
  remedy: 1,
};
