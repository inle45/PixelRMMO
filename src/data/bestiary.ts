import rawBestiary from "./bestiary.json";

export type MonsterFamily = "vermin" | "skeleton" | "spectre" | "guardian" | "boss";
export type MonsterRarity = "normal" | "rare" | "miniboss" | "boss";
export type DamageType = "physical" | "magic";

export interface MonsterExtraStat {
  label: string;
  value: number;
  display: string;
}

export interface MonsterDrop {
  name: string;
  chance: number;
  currency?: boolean;
  min?: number;
  max?: number;
  /** Present when this drop is one of the 20 Livre des Matériaux entries — links to materials.ts's MaterialDef.id. */
  materialId?: string;
}

export interface MonsterSkill {
  name: string;
  /** A damage-type or status-effect badge id (`types/*.png` or `statuses/*.png`), NOT an asset path
   * and NOT an emoji — these were emoji until the no-emoji rule caught up with them. A skill's icon
   * and the element/effect it applies are the same concept, so this reuses the badges the Types &
   * Météo matrix already ships rather than commissioning 23 more sprites. Resolved to `skillIcon`. */
  iconId: string;
  description: string;
}

export interface CombatWeakness {
  type: string;
  multiplier: number;
  note?: string;
}

export interface CombatResistance {
  type: string;
  percent?: number;
  note?: string;
}

export interface CombatInflict {
  status: string;
  note?: string;
}

export interface MonsterCombat {
  /** Flavor label shown as-is, e.g. "Ombre / Bête" — not necessarily 1:1 with canonical damage types. */
  typeLabel: string;
  /** The monster's own canonical type(s) — used by the Types & Météo matrix to group/filter monsters. */
  combatTypes: string[];
  weaknesses: CombatWeakness[];
  resistances: CombatResistance[];
  /** Type or status ids this monster takes no damage/effect from. */
  immunities: string[];
  inflicts: CombatInflict[];
  /** Freeform note for anything that doesn't fit the structured fields (special abilities, unique behavior). */
  note?: string;
}

interface RawMonster {
  id: string;
  dungeonId: string;
  name: string;
  family: MonsterFamily;
  level: string;
  rarity: MonsterRarity;
  damageType: DamageType;
  stats: { hp: number; atk: number; def: number; speedLabel: string; speedValue: number };
  extraStats: MonsterExtraStat[];
  traits: string[];
  skill: MonsterSkill;
  lore: string;
  drops: MonsterDrop[];
  combat: MonsterCombat;
}

export interface MonsterDef extends RawMonster {
  portrait: string;
  idleFrames: string[];
  attackFrames: string[];
  /** Sprite resolved from `skill.iconId` against the Codex's type/status badges. */
  skillIcon: string;
}

/** Relative power caps used to scale every card's PV/ATK/DEF/Vitesse gauges on the same axis. */
export const STAT_SCALE = { hp: 600, atk: 36, def: 24, speed: 5 };

const portraitModules = import.meta.glob("../assets/bestiary/portraits/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const idleFrameModules = import.meta.glob("../assets/bestiary/idle/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const attackFrameModules = import.meta.glob("../assets/bestiary/attack/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function getPortrait(id: string): string {
  const entry = Object.entries(portraitModules).find(([path]) => path.endsWith(`/${id}.png`));
  return entry?.[1] ?? "";
}

/** Collects the numbered animation frames (starting at 0) for a monster id, in order, stopping at the first gap. */
function getFrames(modules: Record<string, string>, id: string): string[] {
  const frames: string[] = [];
  for (let i = 0; ; i++) {
    const entry = Object.entries(modules).find(([path]) => path.endsWith(`/${id}-${i}.png`));
    if (!entry) break;
    frames.push(entry[1]);
  }
  return frames;
}

/** Both badge folders in one lookup — a skill id resolves against types/ first, then statuses/,
 * which is unambiguous because the two sets share no filenames. */
const skillBadgeModules = {
  ...(import.meta.glob("../assets/codex/badges/types/*.png", { eager: true, import: "default" }) as Record<
    string,
    string
  >),
  ...(import.meta.glob("../assets/codex/badges/statuses/*.png", { eager: true, import: "default" }) as Record<
    string,
    string
  >),
};

function getSkillIcon(iconId: string): string {
  const entry = Object.entries(skillBadgeModules).find(([path]) => path.endsWith(`/${iconId}.png`));
  return entry?.[1] ?? "";
}

export const BESTIARY: MonsterDef[] = (rawBestiary as RawMonster[]).map((m) => ({
  ...m,
  portrait: getPortrait(m.id),
  idleFrames: getFrames(idleFrameModules, m.id),
  attackFrames: getFrames(attackFrameModules, m.id),
  skillIcon: getSkillIcon(m.skill.iconId),
}));

export const MONSTER_BY_ID: Record<string, MonsterDef> = Object.fromEntries(BESTIARY.map((m) => [m.id, m]));

export const FAMILY_LABELS: Record<MonsterFamily, string> = {
  vermin: "Vermines",
  skeleton: "Squelettes",
  spectre: "Spectres",
  guardian: "Gardiens & Rares",
  boss: "Boss & Élites",
};

export const RARITY_LABELS: Record<MonsterRarity, string> = {
  normal: "Normal",
  rare: "Rare",
  miniboss: "Mini-Boss",
  boss: "Boss",
};
