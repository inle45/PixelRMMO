import rawMaterials from "./materials.json";
import type { RarityId } from "./rarity";
import forgeCatIcon from "../assets/inventory/filters/equipment.png";
import potionCatIcon from "../assets/inventory/filters/potions.png";
import enchantCatIcon from "../assets/icons/dungeon/skills.png";
import reliqueCatIcon from "../assets/inventory/filters/relics.png";
import pecheCatIcon from "../assets/materials/icons/golden_carp.png";

export type MaterialCategory = "forge" | "alchimie" | "enchantement" | "reliques" | "peche";

interface RawMaterial {
  id: string;
  name: string;
  rarity: RarityId;
  category: MaterialCategory;
  usage: string;
  lore: string;
  /** Absent for a material that is only ever crafted (a smelted ingot, a cut gem) — it has no
   * monster to link to, so the Codex's "voir le monstre" button is simply omitted for it. */
  provenance?: { monsterId: string; dropChance: number };
  /** Base resale value in Écus. */
  value: number;
  /** Listable on the Cité's Marché C2C. Absent = not listable. */
  tradeable?: boolean;
  /** Indicative euro price shown alongside the Écus price on the C2C board. NOTE: the game has no
   * payment backend — nothing here charges or pays real money; this is a displayed valuation only. */
  eurValue?: number;
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
  peche: "Faune Aquatique",
};

/** Sprite paths, not emoji — the app's no-emoji rule applies to the Codex filters too. All four
 * reuse icons already drawn for other screens rather than commissioning near-duplicates. */
export const CATEGORY_ICONS: Record<MaterialCategory, string> = {
  forge: forgeCatIcon,
  alchimie: potionCatIcon,
  enchantement: enchantCatIcon,
  reliques: reliqueCatIcon,
  // Reuses the Carpe Dorée sprite as the category glyph rather than drawing a second fish.
  peche: pecheCatIcon,
};
