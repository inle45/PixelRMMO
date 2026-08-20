import holyIcon from "../assets/codex/badges/types/holy.png";
import iceIcon from "../assets/codex/badges/types/ice.png";
import lightningIcon from "../assets/codex/badges/types/lightning.png";
import type { DamageTypeId } from "./typeSystem";
import type { ClassId } from "./classes";

export interface ClassSkill {
  id: string;
  name: string;
  icon: string;
  description: string;
  damageType: DamageTypeId;
  powerMultiplier: number;
  manaCost: number;
  inflictsStatus?: string;
}

/**
 * One signature elemental skill per class — each intentionally covers a different damage type
 * (Sacré/Glace/Foudre) so all three classes can reliably land "Super Efficace" hits against this
 * dungeon's heavily shadow/physical-typed undead roster, unlike their physical basic attack.
 */
export const CLASS_SKILLS: Record<ClassId, ClassSkill> = {
  knight: {
    id: "holy_smite",
    name: "Châtiment Sacré",
    icon: holyIcon,
    description: "Frappe empreinte de lumière sacrée, dévastatrice contre les morts-vivants.",
    damageType: "holy",
    powerMultiplier: 1.6,
    manaCost: 0,
  },
  archer: {
    id: "frost_arrow",
    name: "Flèche de Givre",
    icon: iceIcon,
    description: "Décoche une flèche enchantée de glace qui gèle sa cible.",
    damageType: "ice",
    powerMultiplier: 1.5,
    manaCost: 0,
    inflictsStatus: "freeze",
  },
  mage: {
    id: "arcane_bolt",
    name: "Éclair Arcanique",
    icon: lightningIcon,
    description: "Libère une décharge de foudre arcanique depuis le bâton.",
    damageType: "lightning",
    powerMultiplier: 2.2,
    manaCost: 15,
  },
};
