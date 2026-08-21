import skullIcon from "../assets/icons/items/skull.png";

export interface DungeonDef {
  id: string;
  name: string;
  subtitle: string;
  /** PixelLab sprite, not an emoji — same convention as every other game-world icon in the app. */
  icon: string;
}

export const DUNGEONS: DungeonDef[] = [
  { id: "crypte-roi-squelette", name: "Donjon 1", subtitle: "La Crypte du Roi Squelette", icon: skullIcon },
];
