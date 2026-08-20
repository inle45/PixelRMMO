import rawMaterials from "./materials.json";
import type { RarityId } from "./rarity";

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

export const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  forge: "Forge",
  alchimie: "Alchimie",
  enchantement: "Enchantement",
  reliques: "Reliques",
};

export const CATEGORY_ICONS: Record<MaterialCategory, string> = {
  forge: "🔨",
  alchimie: "🧪",
  enchantement: "💎",
  reliques: "👑",
};
