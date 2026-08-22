import rawMaterials from "./materials.json";
import type { RarityId } from "./rarity";
import forgeCatIcon from "../assets/inventory/filters/equipment.png";
import potionCatIcon from "../assets/inventory/filters/potions.png";
import enchantCatIcon from "../assets/icons/dungeon/skills.png";
import reliqueCatIcon from "../assets/inventory/filters/relics.png";

export type MaterialCategory = "forge" | "alchimie" | "enchantement" | "reliques";

interface RawMaterial {
  id: string;
  name: string;
  rarity: RarityId;
  category: MaterialCategory;
  usage: string;
  lore: string;
  provenance: { monsterId: string; dropChance: number };
  value: number;
}

export interface MaterialDef extends RawMaterial {
  icon: string;
}

const iconModules = import.meta.glob("../assets/materials/icons/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function getIcon(id: string): string {
  const entry = Object.entries(iconModules).find(([path]) => path.endsWith(`/${id}.png`));
  return entry?.[1] ?? "";
}

export const MATERIALS: MaterialDef[] = (rawMaterials as RawMaterial[]).map((m) => ({
  ...m,
  icon: getIcon(m.id),
}));

export const MATERIAL_BY_ID: Record<string, MaterialDef> = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));

export const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  forge: "Forge",
  alchimie: "Alchimie",
  enchantement: "Enchantement",
  reliques: "Reliques",
};

/** Sprite paths, not emoji — the app's no-emoji rule applies to the Codex filters too. All four
 * reuse icons already drawn for other screens rather than commissioning near-duplicates. */
export const CATEGORY_ICONS: Record<MaterialCategory, string> = {
  forge: forgeCatIcon,
  alchimie: potionCatIcon,
  enchantement: enchantCatIcon,
  reliques: reliqueCatIcon,
};
