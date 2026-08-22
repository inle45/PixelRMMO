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
  wave: number;
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

/* --------------------------------------------------------------------------------- encounters */

/**
 * What a `TurnBattleArena` mount is fighting.
 *
 * THE RULE: there is exactly ONE combat engine in this game. Any fight anywhere — a dungeon
 * gauntlet, a gathering-zone guardian, whatever comes next — mounts `TurnBattleArena` with a
 * different `EncounterDef`, and differs only in its wave list and its backdrop. Do NOT write a
 * second, "lighter" battle screen for a one-off fight: that is exactly what the cave's original
 * `GuardianEncounter` was, and it was rejected outright ("je veux que ce soit le même moteur de
 * combat que dans les donjons juste avec un autre decor"). If a fight needs something the arena
 * can't express, extend this descriptor — don't fork the screen.
 */
export interface EncounterDef {
  id: string;
  /** Total waves. The "VAGUE n/N" pill hides itself entirely when this is 1. */
  waveCount: number;
  /** Built lazily as each wave starts (1-based), so mid-run rolls (rare events) stay random. */
  buildWave: (wave: number) => WavePlan;
  /** Phase-2 adds, for an encounter whose boss summons them. Omitted = no reinforcements. */
  reinforcements?: () => WaveMonster[];
  /** 1-based wave that swaps in the boss backdrop + cracks/debris layer; null = this fight has none. */
  bossWave: number | null;
  /** Overrides ArenaBackdrop's crypt art. Omitted = the default dungeon arena. */
  background?: string;
  /** Shown on the summary screen so a defeat/victory card names the right fight. */
  label: string;
}

export const CRYPT_ENCOUNTER: EncounterDef = {
  id: "crypte-roi-squelette",
  label: "La Crypte du Roi Squelette",
  waveCount: 3,
  buildWave: (wave) => (wave === 1 ? generateWave1() : wave === 2 ? generateWave2() : generateWave3()),
  reinforcements: generateReinforcements,
  bossWave: 3,
};

/** A single-wave fight against one named bestiary creature, on its own zone's backdrop — what a
 * gathering-zone guardian ambush is. No boss machinery: a guardian has no phase 2 and no revive. */
export function buildSoloEncounter(monsterId: string, opts: { background: string; label: string }): EncounterDef {
  const def = byId(monsterId);
  return {
    id: `solo-${monsterId}`,
    label: opts.label,
    waveCount: 1,
    buildWave: () => ({ wave: 1, monsters: toInstances([def]), isRareEvent: false }),
    bossWave: null,
    background: opts.background,
  };
}
