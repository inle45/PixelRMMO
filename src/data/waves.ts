import { BESTIARY, type MonsterDef } from "./bestiary";

const VERMIN_IDS = ["vampire_bat", "plague_rat", "crypt_beetle", "tomb_spider"];
const TACTICAL_IDS = [
  "skeleton_recruit",
  "shield_skeleton",
  "bone_spearman",
  "bone_archer",
  "will_o_wisp",
  "wailing_spectre",
  "dark_necromancer",
  "creeping_shadow",
];
const RARE_EVENT_IDS = ["treasure_goblin", "crypt_mimic"];
const RARE_EVENT_CHANCE = 0.18;
const BOSS_ID = "skeleton_king_boss";
const BOSS_REINFORCEMENT_IDS = ["skeleton_recruit"];

function byId(id: string): MonsterDef {
  const found = BESTIARY.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown monster id: ${id}`);
  return found;
}

function pickRandom<T>(pool: T[], n: number): T[] {
  const copy = [...pool];
  const picked: T[] = [];
  while (picked.length < n && copy.length > 0) {
    const i = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(i, 1)[0]);
  }
  return picked;
}

export interface WaveMonster {
  instanceId: string;
  def: MonsterDef;
}

function toInstances(defs: MonsterDef[]): WaveMonster[] {
  return defs.map((def, i) => ({
    instanceId: `${def.id}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    def,
  }));
}

export interface WavePlan {
  wave: 1 | 2 | 3;
  monsters: WaveMonster[];
  isRareEvent: boolean;
}

export function generateWave1(): WavePlan {
  const count = Math.random() < 0.5 ? 1 : 2;
  return { wave: 1, monsters: toInstances(pickRandom(VERMIN_IDS.map(byId), count)), isRareEvent: false };
}

export function generateWave2(): WavePlan {
  if (Math.random() < RARE_EVENT_CHANCE) {
    const rare = byId(RARE_EVENT_IDS[Math.floor(Math.random() * RARE_EVENT_IDS.length)]);
    return { wave: 2, monsters: toInstances([rare]), isRareEvent: true };
  }
  return { wave: 2, monsters: toInstances(pickRandom(TACTICAL_IDS.map(byId), 2)), isRareEvent: false };
}

export function generateWave3(): WavePlan {
  return { wave: 3, monsters: toInstances([byId(BOSS_ID)]), isRareEvent: false };
}

/** Adds spawned when the boss crosses into Phase 2 — its own "invocation de renforts". */
export function generateReinforcements(): WaveMonster[] {
  return toInstances(pickRandom(BOSS_REINFORCEMENT_IDS.map(byId), 2));
}
