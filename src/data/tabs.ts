import campBg from "../assets/scenes/camp.png";
import dungeonBg from "../assets/scenes/dungeon.png";
import forgeBg from "../assets/scenes/forge.png";
import marketBg from "../assets/scenes/market.png";

import campIcon from "../assets/icons/nav/camp.png";
import dungeonIcon from "../assets/icons/nav/dungeon.png";
import forgeIcon from "../assets/icons/nav/forge.png";
import marketIcon from "../assets/icons/nav/market.png";

export type TabId = "camp" | "dungeon" | "forge" | "market";

export interface TabDef {
  id: TabId;
  label: string;
  icon: string;
  background: string;
}

export const TABS: TabDef[] = [
  { id: "camp", label: "Camp", icon: campIcon, background: campBg },
  { id: "dungeon", label: "Donjon", icon: dungeonIcon, background: dungeonBg },
  { id: "forge", label: "Forge", icon: forgeIcon, background: forgeBg },
  { id: "market", label: "Marché C2C", icon: marketIcon, background: marketBg },
];
