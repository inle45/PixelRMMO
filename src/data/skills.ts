import holyIcon from "../assets/codex/badges/types/holy.png";
import iceIcon from "../assets/codex/badges/types/ice.png";
import natureIcon from "../assets/codex/badges/types/nature.png";
import fireIcon from "../assets/codex/badges/types/fire.png";
import lightningIcon from "../assets/codex/badges/types/lightning.png";
import type { DamageTypeId } from "./typeSystem";
import type { ClassId } from "./classes";

export interface ClassSkill {
  id: string;
  name: string;
  icon: string;
  description: string;
  kind: "damage" | "buff";
  damageType: DamageTypeId;
  powerMultiplier: number;
  manaCost: number;
  inflictsStatus?: string;
}

/**
 * Each class gets a small elemental kit rather than one skill: Chevalier trades an offensive
 * nuke for a pure defensive tool (Bouclier Sacré, a buff — see battleEngine.ts's aegis-shield
 * handling), while Archer/Mage each get two damage skills covering distinct types so every
 * fight has a real type-matchup choice, not just "use the one skill I have".
 */
export const CLASS_SKILLS: Record<ClassId, ClassSkill[]> = {
  knight: [
    {
      id: "sacred_shield",
      name: "Bouclier Sacré",
      icon: holyIcon,
      description: "Invoque une égide sacrée qui absorbe les prochains dégâts subis.",
      kind: "buff",
      damageType: "holy",
      powerMultiplier: 0,
      manaCost: 0,
      inflictsStatus: "aegis",
    },
  ],
  archer: [
    {
      id: "frost_shot",
      name: "Tir Glacial",
      icon: iceIcon,
      description: "Décoche une flèche enchantée de glace qui gèle sa cible.",
      kind: "damage",
      damageType: "ice",
      powerMultiplier: 1.5,
      manaCost: 0,
      inflictsStatus: "freeze",
    },
    {
      id: "poison_arrow",
      name: "Flèche Poison",
      icon: natureIcon,
      description: "Décoche une flèche empoisonnée qui ronge la cible dans la durée.",
      kind: "damage",
      damageType: "nature",
      powerMultiplier: 1.3,
      manaCost: 0,
      inflictsStatus: "poison",
    },
  ],
  mage: [
    {
      id: "fireball",
      name: "Boule de Feu",
      icon: fireIcon,
      description: "Projette une sphère de flammes qui embrase la cible.",
      kind: "damage",
      damageType: "fire",
      powerMultiplier: 1.8,
      manaCost: 20,
      inflictsStatus: "burn",
    },
    {
      id: "lightning_bolt",
      name: "Éclair Foudre",
      icon: lightningIcon,
      description: "Libère une décharge de foudre arcanique depuis le bâton.",
      kind: "damage",
      damageType: "lightning",
      powerMultiplier: 2.2,
      manaCost: 15,
    },
  ],
};
