import campBg from "../assets/scenes/camp.png";
import dungeonBg from "../assets/scenes/dungeon.png";
import craftingBg from "../assets/scenes/crafting.png";
import marketBg from "../assets/scenes/market.png";
import bestiaryBg from "../assets/scenes/bestiary.png";
import inventoryBg from "../assets/scenes/inventory.png";

export type TabId = "camp" | "inventory" | "dungeon" | "crafting" | "market" | "bestiary";

export interface TabDef {
  id: TabId;
  label: string;
  /** Looping idle-animation frames for the nav icon, in order (index 0 = base pose). */
  frames: string[];
  background: string;
}

const navFrameModules = import.meta.glob("../assets/icons/nav/anim/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

/** Collects the numbered idle-loop frames for a nav icon prefix, e.g. "camp" -> [camp-0.png, camp-1.png, ...]. */
function getNavFrames(prefix: string): string[] {
  const frames: string[] = [];
  for (let i = 0; ; i++) {
    const entry = Object.entries(navFrameModules).find(([path]) => path.endsWith(`/${prefix}-${i}.png`));
    if (!entry) break;
    frames.push(entry[1]);
  }
  return frames;
}

export const TABS: TabDef[] = [
  { id: "camp", label: "Camp", frames: getNavFrames("camp"), background: campBg },
  { id: "inventory", label: "Inventaire", frames: getNavFrames("inventory"), background: inventoryBg },
  { id: "dungeon", label: "Donjon", frames: getNavFrames("dungeon"), background: dungeonBg },
  { id: "bestiary", label: "Bestiaire", frames: getNavFrames("bestiary"), background: bestiaryBg },
  { id: "crafting", label: "Crafting", frames: getNavFrames("crafting"), background: craftingBg },
  { id: "market", label: "Marché C2C", frames: getNavFrames("market"), background: marketBg },
];
