import knightMale from "../assets/characters/knight-male.png";
import knightFemale from "../assets/characters/knight-female.png";
import archerMale from "../assets/characters/archer-male.png";
import archerFemale from "../assets/characters/archer-female.png";
import mageMale from "../assets/characters/mage-male.png";
import mageFemale from "../assets/characters/mage-female.png";
import knightMaleBg from "../assets/characters/profile-bg/knight-male.png";
import knightFemaleBg from "../assets/characters/profile-bg/knight-female.png";
import archerMaleBg from "../assets/characters/profile-bg/archer-male.png";
import archerFemaleBg from "../assets/characters/profile-bg/archer-female.png";
import mageMaleBg from "../assets/characters/profile-bg/mage-male.png";
import mageFemaleBg from "../assets/characters/profile-bg/mage-female.png";
import guardIcon from "../assets/icons/dungeon/guard.png";
import bowIcon from "../assets/icons/items/bow.png";
import staffIcon from "../assets/icons/items/staff.png";

export type Gender = "male" | "female";
export type ClassId = "knight" | "archer" | "mage";

const attackFrameModules = import.meta.glob("../assets/characters/attacks/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

/** Collects the 8 numbered attack frames for a given `{class}-{gender}` sprite prefix, in order. */
function getAttackFrames(prefix: string): string[] {
  const frames: string[] = [];
  for (let i = 1; i <= 8; i++) {
    const entry = Object.entries(attackFrameModules).find(([path]) => path.endsWith(`/${prefix}-${i}.png`));
    if (!entry) break;
    frames.push(entry[1]);
  }
  return frames;
}

const idleFrameModules = import.meta.glob("../assets/characters/idle/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

/** Collects the numbered idle-breathing frames (starting at 0) for a `{class}-{gender}` sprite prefix, in order. */
function getIdleFrames(prefix: string): string[] {
  const frames: string[] = [];
  for (let i = 0; ; i++) {
    const entry = Object.entries(idleFrameModules).find(([path]) => path.endsWith(`/${prefix}-${i}.png`));
    if (!entry) break;
    frames.push(entry[1]);
  }
  return frames;
}

export interface StatBarDef {
  label: string;
  value: number;
  max: number;
  display: string;
  color: string;
}

export interface ClassDefinition {
  id: ClassId;
  /** Sprite path for the role badge — see ROLE_ICON below. Render it as an <img>, never as text. */
  icon: string;
  role: string;
  badge: string;
  names: Record<Gender, string>;
  sprites: Record<Gender, string>;
  profileBackground: Record<Gender, string>;
  idleFrames: Record<Gender, string[]>;
  attackFrames: Record<Gender, string[]>;
  theme: {
    border: string;
    ring: string;
    glow: string;
    badgeBg: string;
    badgeText: string;
    bar: string;
  };
  stats: StatBarDef[];
  infoLine: string;
  passive: {
    name: string;
    description: string;
  };
}

const MAX_HP_SCALE = 220;

/** Role-badge glyphs. Sprites, not emoji (the app's no-emoji rule covers these too) — all three
 * reuse art already drawn for other screens rather than commissioning new icons. */
const ROLE_ICON: Record<ClassId, string> = {
  knight: guardIcon,
  archer: bowIcon,
  mage: staffIcon,
};

export const CLASSES: ClassDefinition[] = [
  {
    id: "knight",
    icon: ROLE_ICON.knight,
    role: "Tank d'Usure & Contre-attaque",
    badge: "TANK",
    names: { male: "Chevalier", female: "Chevalière" },
    sprites: { male: knightMale, female: knightFemale },
    profileBackground: { male: knightMaleBg, female: knightFemaleBg },
    idleFrames: {
      male: getIdleFrames("knight-male"),
      female: getIdleFrames("knight-female"),
    },
    attackFrames: {
      male: getAttackFrames("knight-male"),
      female: getAttackFrames("knight-female"),
    },
    theme: {
      border: "border-blue-400/30",
      ring: "ring-blue-400",
      glow: "shadow-[0_0_35px_rgba(96,165,250,0.45)]",
      badgeBg: "bg-blue-400/15",
      badgeText: "text-blue-300",
      bar: "bg-gradient-to-r from-blue-500 to-blue-300",
    },
    stats: [
      { label: "PV", value: 220, max: MAX_HP_SCALE, display: "220", color: "bg-gradient-to-r from-rose-500 to-rose-300" },
      { label: "Armure", value: 30, max: 100, display: "30%", color: "bg-gradient-to-r from-blue-500 to-blue-300" },
      { label: "Parade", value: 25, max: 100, display: "25%", color: "bg-gradient-to-r from-blue-500 to-blue-300" },
    ],
    infoLine: "Vitesse d'attaque : 0.8 /s",
    passive: {
      name: "Représailles d'Acier",
      description: "Bloquer un coup renvoie 20% des dégâts à l'attaquant.",
    },
  },
  {
    id: "archer",
    icon: ROLE_ICON.archer,
    role: "DPS Rapide & Coups Critiques",
    badge: "DPS",
    names: { male: "Archer", female: "Archère" },
    sprites: { male: archerMale, female: archerFemale },
    profileBackground: { male: archerMaleBg, female: archerFemaleBg },
    idleFrames: {
      male: getIdleFrames("archer-male"),
      female: getIdleFrames("archer-female"),
    },
    attackFrames: {
      male: getAttackFrames("archer-male"),
      female: getAttackFrames("archer-female"),
    },
    theme: {
      border: "border-emerald-400/30",
      ring: "ring-emerald-400",
      glow: "shadow-[0_0_35px_rgba(52,211,153,0.45)]",
      badgeBg: "bg-emerald-400/15",
      badgeText: "text-emerald-300",
      bar: "bg-gradient-to-r from-emerald-500 to-emerald-300",
    },
    stats: [
      { label: "PV", value: 120, max: MAX_HP_SCALE, display: "120", color: "bg-gradient-to-r from-rose-500 to-rose-300" },
      { label: "Critique", value: 30, max: 100, display: "30% (x2 dégâts)", color: "bg-gradient-to-r from-emerald-500 to-emerald-300" },
      { label: "Esquive", value: 20, max: 100, display: "20%", color: "bg-gradient-to-r from-emerald-500 to-emerald-300" },
    ],
    infoLine: "Vitesse d'attaque : 1.6 /s",
    passive: {
      name: "Cible Marquée",
      description: "Chaque coup réussi confère +5% de vitesse d'attaque (max 5 stacks).",
    },
  },
  {
    id: "mage",
    icon: ROLE_ICON.mage,
    role: "Canon Arcanique & Burst",
    badge: "BURST",
    names: { male: "Mage", female: "Magicienne" },
    sprites: { male: mageMale, female: mageFemale },
    profileBackground: { male: mageMaleBg, female: mageFemaleBg },
    idleFrames: {
      male: getIdleFrames("mage-male"),
      female: getIdleFrames("mage-female"),
    },
    attackFrames: {
      male: getAttackFrames("mage-male"),
      female: getAttackFrames("mage-female"),
    },
    theme: {
      border: "border-violet-400/30",
      ring: "ring-violet-400",
      glow: "shadow-[0_0_35px_rgba(167,139,250,0.45)]",
      badgeBg: "bg-violet-400/15",
      badgeText: "text-violet-300",
      bar: "bg-gradient-to-r from-violet-500 to-violet-300",
    },
    stats: [
      { label: "PV", value: 85, max: MAX_HP_SCALE, display: "85", color: "bg-gradient-to-r from-rose-500 to-rose-300" },
      { label: "Mana", value: 100, max: 100, display: "100 (+10/s)", color: "bg-gradient-to-r from-sky-500 to-sky-300" },
      { label: "Pénétration Magique", value: 50, max: 100, display: "50%", color: "bg-gradient-to-r from-violet-500 to-violet-300" },
    ],
    infoLine: "Vitesse d'attaque : 1.0 /s",
    passive: {
      name: "Surcharge Arcanique",
      description: "À 100% de mana, le prochain sort inflige une explosion à +150% de dégâts.",
    },
  },
];
