import skullIcon from "../assets/icons/items/skull.png";
import caveIcon from "../assets/gathering/nodes/node-t2.png";
import lakeIcon from "../assets/bestiary/portraits/crater_leviathan.png";
import canyonIcon from "../assets/bestiary/portraits/sandstone_golem.png";

export interface DungeonDef {
  id: string;
  name: string;
  subtitle: string;
  /** PixelLab sprite, not an emoji — same convention as every other game-world icon in the app. */
  icon: string;
}

/** Not only dungeons any more — this is the Bestiaire's section list, so every *location* that owns
 * monsters has to appear here or its creatures are silently filtered out of the Codex entirely
 * (Bestiary.tsx groups `filtered` by `dungeonId` and drops anything with no matching section). */
export const DUNGEONS: DungeonDef[] = [
  { id: "crypte-roi-squelette", name: "Donjon 1", subtitle: "La Crypte du Roi Squelette", icon: skullIcon },
  { id: "grotte-champignons", name: "Zone de Récolte", subtitle: "La Grotte aux Champignons", icon: caveIcon },
  { id: "bassin-cratere", name: "Zone de Pêche", subtitle: "Le Bassin du Cratère", icon: lakeIcon },
  { id: "canyons-ecarlates", name: "Zone de Minage", subtitle: "Les Canyons Écarlates", icon: canyonIcon },
];
