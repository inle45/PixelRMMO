import campBg from "../assets/scenes/camp.png";
import dungeonBg from "../assets/scenes/dungeon.png";
import forgeBg from "../assets/scenes/forge.png";
import marketBg from "../assets/scenes/market.png";

export type TabId = "camp" | "dungeon" | "forge" | "market";

export interface TabDef {
  id: TabId;
  label: string;
  icon: string;
  background: string;
}

export const TABS: TabDef[] = [
  { id: "camp", label: "Camp", icon: "🏰", background: campBg },
  { id: "dungeon", label: "Donjon", icon: "⚔️", background: dungeonBg },
  { id: "forge", label: "Forge", icon: "🔨", background: forgeBg },
  { id: "market", label: "Marché C2C", icon: "⚖️", background: marketBg },
];
