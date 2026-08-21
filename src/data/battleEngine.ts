import type { ClassDefinition, ClassId, Gender } from "./classes";
import { getBattlePortrait, getBattleIdleFrames, getBattleAttackFrames } from "./battlePortraits";
import type { MonsterCombat, MonsterDef, MonsterSkill } from "./bestiary";
import type { WaveMonster } from "./waves";
import type { ClassSkill } from "./skills";
import type { BattleItem } from "./items";
import { STATUS_BY_ID, TYPE_BY_ID, type DamageTypeId, type WeatherDef } from "./typeSystem";

export type Effectiveness = "weak" | "resist" | "immune" | "normal";

export interface ActiveStatus {
  id: string;
  turnsLeft: number;
  stacks: number;
  /** Remaining absorption pool — aegis only. */
  shieldHp?: number;
}

export interface Combatant {
  instanceId: string;
  side: "hero" | "enemy";
  name: string;
  portrait: string;
  idleFrames: string[];
  attackFrames: string[];
  level: number;
  maxHp: number;
  hp: number;
  maxMana: number;
  mana: number;
  atk: number;
  def: number;
  speed: number;
  damageType: DamageTypeId;
  critChance: number;
  dodgeChance: number;
  blockChance: number;
  magicPenetration?: number;
  guarding: boolean;
  alive: boolean;
  statuses: ActiveStatus[];
  combat?: MonsterCombat;
  skill?: MonsterSkill;
  isBoss?: boolean;
  bossPhase?: 1 | 2;
  hasRevived?: boolean;
  /** Original bestiary entry — carried on enemy combatants so loot/XP can be resolved after KO. */
  sourceDef?: MonsterDef;
}

/**
 * Invented ATK/DEF/Vitesse per class — classes.ts's own `stats` array is display-only
 * (PV/Armure/Parade for Knight, PV/Critique/Esquive for Archer, PV/Mana/Pénétration for Mage)
 * and has no numeric combat triad. Tuned (and simulated headlessly — see CLAUDE.md) against the
 * boss's own DEF 24: an initial pass around ATK 16-24 left every basic attack floored to 1 damage
 * against it, making the fight unwinnable even with potions/guard/weakness-targeting. These values
 * keep basic attacks meaningful into DEF 24 while preserving each class's Tank/DPS/Burst identity.
 */
const HERO_BASE_COMBAT: Record<ClassId, { atk: number; def: number; speed: number }> = {
  knight: { atk: 50, def: 21, speed: 3 },
  archer: { atk: 34, def: 8, speed: 4 },
  mage: { atk: 40, def: 18, speed: 3 },
};

/** Statuses reinterpreted from statuses.json's per-second formulas into discrete turn ticks. */
const STATUS_DURATIONS: Record<string, number> = {
  burn: 3,
  poison: 3,
  bleed: 2,
  shock: 2,
  freeze: 1,
  stun: 1,
  blind: 2,
  aegis: 3,
};
export const STATUS_MAX_STACKS: Record<string, number> = { burn: 2, poison: 5 };

function pct(classDef: ClassDefinition, label: string): number {
  const s = classDef.stats.find((stat) => stat.label === label);
  return s ? s.value / 100 : 0;
}
function abs(classDef: ClassDefinition, label: string): number {
  const s = classDef.stats.find((stat) => stat.label === label);
  return s ? s.value : 0;
}

export function buildHeroCombatant(
  classDef: ClassDefinition,
  gender: Gender,
  level: number,
  carryover?: { hp: number; mana: number }
): Combatant {
  const base = HERO_BASE_COMBAT[classDef.id];
  const maxHp = abs(classDef, "PV") + (level - 1) * 15;
  const maxMana = abs(classDef, "Mana");
  return {
    instanceId: "hero",
    side: "hero",
    name: classDef.names[gender],
    portrait: getBattlePortrait(classDef.id, gender),
    idleFrames: getBattleIdleFrames(classDef.id, gender),
    attackFrames: getBattleAttackFrames(classDef.id, gender),
    level,
    maxHp,
    hp: carryover ? Math.min(carryover.hp, maxHp) : maxHp,
    maxMana,
    mana: carryover ? Math.min(carryover.mana, maxMana) : maxMana,
    atk: base.atk + (level - 1) * 2,
    def: base.def + (level - 1) * 1,
    speed: base.speed,
    damageType: "physical",
    critChance: pct(classDef, "Critique") || 0.1,
    // Mage has neither an Esquive nor Parade display stat (unlike Knight/Archer), leaving it with
    // zero damage-negation — a small innate "arcane evasion" keeps it from being purely deterministic.
    dodgeChance: pct(classDef, "Esquive") || (classDef.id === "mage" ? 0.2 : 0),
    blockChance: pct(classDef, "Parade"),
    magicPenetration: pct(classDef, "Pénétration Magique"),
    guarding: false,
    alive: true,
    statuses: [],
  };
}

export function buildEnemyCombatant(wm: WaveMonster): Combatant {
  const m = wm.def;
  return {
    instanceId: wm.instanceId,
    side: "enemy",
    name: m.name,
    portrait: m.portrait,
    idleFrames: m.idleFrames,
    attackFrames: m.attackFrames,
    level: 1,
    maxHp: m.stats.hp,
    hp: m.stats.hp,
    maxMana: 0,
    mana: 0,
    atk: m.stats.atk,
    def: m.stats.def,
    speed: m.stats.speedValue,
    damageType: (m.combat.combatTypes[0] as DamageTypeId) ?? "physical",
    critChance: 0.08,
    dodgeChance: 0,
    blockChance: 0,
    guarding: false,
    alive: true,
    statuses: [],
    combat: m.combat,
    skill: m.skill,
    isBoss: m.id === "skeleton_king_boss",
    bossPhase: m.id === "skeleton_king_boss" ? 1 : undefined,
    sourceDef: m,
  };
}

export function getTypeEffectiveness(
  damageType: DamageTypeId,
  target: MonsterCombat | undefined
): { mult: number; effectiveness: Effectiveness } {
  if (!target) return { mult: 1, effectiveness: "normal" };
  if (target.immunities.includes(damageType)) return { mult: 0, effectiveness: "immune" };
  const weakness = target.weaknesses.find((w) => w.type === damageType);
  if (weakness) return { mult: weakness.multiplier, effectiveness: "weak" };
  const resistance = target.resistances.find((r) => r.type === damageType);
  if (resistance) return { mult: resistance.percent ? 1 - resistance.percent / 100 : 0.5, effectiveness: "resist" };
  return { mult: 1, effectiveness: "normal" };
}

export function previewEffectiveness(damageType: DamageTypeId, target: Combatant): Effectiveness {
  return getTypeEffectiveness(damageType, target.combat).effectiveness;
}

const WEATHER_LABEL_TO_TYPE: Record<string, DamageTypeId> = {
  Foudre: "lightning",
  Feu: "fire",
  Glace: "ice",
  Physique: "physical",
  Ombre: "shadow",
};

function parseModifierPercent(value: string): number {
  const n = Number.parseFloat(value.replace("%", ""));
  return Number.isFinite(n) ? n / 100 : 0;
}

export function getWeatherDamageMultiplier(weather: WeatherDef, damageType: DamageTypeId): number {
  let mult = 1;
  for (const mod of weather.modifiers) {
    if (WEATHER_LABEL_TO_TYPE[mod.label] === damageType) mult *= 1 + parseModifierPercent(mod.value);
  }
  return Math.max(0, mult);
}

export function canInflictStatus(target: Combatant, statusId: string): boolean {
  return !target.combat?.immunities.includes(statusId);
}

export function inflictStatus(combatant: Combatant, statusId: string, maxStacks = 1): Combatant {
  const duration = STATUS_DURATIONS[statusId] ?? 2;
  // Recasting aegis always resets the shield to a fresh 25%-of-max-HP pool rather than stacking.
  const shieldHp = statusId === "aegis" ? Math.round(combatant.maxHp * 0.25) : undefined;
  const existing = combatant.statuses.find((s) => s.id === statusId);
  if (existing) {
    return {
      ...combatant,
      statuses: combatant.statuses.map((s) =>
        s.id === statusId
          ? { id: statusId, turnsLeft: duration, stacks: Math.min(maxStacks, s.stacks + 1), shieldHp: shieldHp ?? s.shieldHp }
          : s
      ),
    };
  }
  return { ...combatant, statuses: [...combatant.statuses, { id: statusId, turnsLeft: duration, stacks: 1, shieldHp }] };
}

export interface DamageResult {
  amount: number;
  crit: boolean;
  effectiveness: Effectiveness;
  dodged: boolean;
  blocked: boolean;
}

export function computeDamage(params: {
  attacker: Combatant;
  defender: Combatant;
  damageType: DamageTypeId;
  powerMultiplier: number;
  weather: WeatherDef;
  bonusPenetrationPct?: number;
}): DamageResult {
  const { attacker, defender, damageType, powerMultiplier, weather, bonusPenetrationPct = 0 } = params;

  const blinded = attacker.statuses.some((s) => s.id === "blind");

  if (Math.random() < defender.dodgeChance + (blinded ? 0.4 : 0)) {
    return { amount: 0, crit: false, effectiveness: "normal", dodged: true, blocked: false };
  }
  if (Math.random() < defender.blockChance) {
    return { amount: 0, crit: false, effectiveness: "normal", dodged: false, blocked: true };
  }

  const effectiveDef = Math.max(0, defender.def * (1 - bonusPenetrationPct));
  const base = Math.max(1, attacker.atk * powerMultiplier - effectiveDef);

  const { mult: typeMult, effectiveness } = getTypeEffectiveness(damageType, defender.combat);
  const weatherMult = getWeatherDamageMultiplier(weather, damageType);
  const crit = effectiveness !== "immune" && Math.random() < attacker.critChance * (blinded ? 0.5 : 1);

  let amount = Math.round(base * typeMult * weatherMult * (crit ? 2 : 1));
  if (defender.guarding) amount = Math.round(amount * 0.5);
  amount = effectiveness === "immune" ? 0 : Math.max(1, amount);

  return { amount, crit, effectiveness, dodged: false, blocked: false };
}

export type BattleEvent =
  | { type: "log"; text: string }
  | { type: "damage"; actorId: string; targetId: string; amount: number; crit: boolean; effectiveness: Effectiveness }
  | { type: "heal"; targetId: string; amount: number }
  | { type: "shield"; targetId: string; amount: number }
  | { type: "dodge"; targetId: string }
  | { type: "block"; targetId: string }
  | { type: "immune"; targetId: string }
  | { type: "status_applied"; targetId: string; statusId: string }
  | { type: "status_tick"; targetId: string; statusId: string; amount: number }
  | { type: "status_expired"; targetId: string; statusId: string }
  | { type: "ko"; targetId: string }
  | { type: "revive"; targetId: string };

interface StepResult {
  combatants: Combatant[];
  events: BattleEvent[];
}

function applyDamageResult(
  combatants: Combatant[],
  actor: Combatant,
  target: Combatant,
  result: DamageResult,
  logText: string
): StepResult {
  const events: BattleEvent[] = [{ type: "log", text: logText }];
  if (result.dodged) {
    events.push({ type: "dodge", targetId: target.instanceId });
    return { combatants, events };
  }
  if (result.blocked) {
    events.push({ type: "block", targetId: target.instanceId });
    return { combatants, events };
  }
  if (result.effectiveness === "immune") {
    events.push({ type: "immune", targetId: target.instanceId });
    return { combatants, events };
  }

  let amount = result.amount;
  let workingStatuses = target.statuses;
  const aegis = target.statuses.find((s) => s.id === "aegis" && (s.shieldHp ?? 0) > 0);
  if (aegis) {
    const absorbed = Math.min(aegis.shieldHp!, amount);
    const remainingShield = aegis.shieldHp! - absorbed;
    amount -= absorbed;
    events.push({ type: "shield", targetId: target.instanceId, amount: absorbed });
    workingStatuses =
      remainingShield > 0
        ? target.statuses.map((s) => (s.id === "aegis" ? { ...s, shieldHp: remainingShield } : s))
        : target.statuses.filter((s) => s.id !== "aegis");
  }

  const newHp = Math.max(0, target.hp - amount);
  const alive = newHp > 0;
  if (amount > 0) {
    events.push({
      type: "damage",
      actorId: actor.instanceId,
      targetId: target.instanceId,
      amount,
      crit: result.crit,
      effectiveness: result.effectiveness,
    });
  }
  if (!alive) events.push({ type: "ko", targetId: target.instanceId });
  return {
    combatants: combatants.map((c) =>
      c.instanceId === target.instanceId ? { ...c, hp: newHp, alive, statuses: workingStatuses } : c
    ),
    events,
  };
}

export function performBasicAttack(combatants: Combatant[], actorId: string, targetId: string, weather: WeatherDef): StepResult {
  const actor = combatants.find((c) => c.instanceId === actorId)!;
  const target = combatants.find((c) => c.instanceId === targetId)!;
  const damageType: DamageTypeId = actor.side === "hero" ? "physical" : actor.damageType;
  const result = computeDamage({ attacker: actor, defender: target, damageType, powerMultiplier: 1, weather });
  return applyDamageResult(combatants, actor, target, result, `${actor.name} attaque ${target.name}.`);
}

export function performSkill(
  combatants: Combatant[],
  actorId: string,
  targetId: string,
  skill: ClassSkill,
  weather: WeatherDef
): StepResult {
  const actor = combatants.find((c) => c.instanceId === actorId)!;
  const target = combatants.find((c) => c.instanceId === targetId)!;
  const result = computeDamage({
    attacker: actor,
    defender: target,
    damageType: skill.damageType,
    powerMultiplier: skill.powerMultiplier,
    weather,
    bonusPenetrationPct: actor.magicPenetration ?? 0,
  });
  let { combatants: next, events } = applyDamageResult(combatants, actor, target, result, `${actor.name} utilise ${skill.name} !`);

  if (skill.inflictsStatus && !result.dodged && !result.blocked && result.effectiveness !== "immune") {
    const targetNow = next.find((c) => c.instanceId === targetId)!;
    if (targetNow.alive && canInflictStatus(targetNow, skill.inflictsStatus)) {
      next = next.map((c) =>
        c.instanceId === targetId ? inflictStatus(c, skill.inflictsStatus!, STATUS_MAX_STACKS[skill.inflictsStatus!] ?? 1) : c
      );
      events = [...events, { type: "status_applied", targetId, statusId: skill.inflictsStatus }];
    }
  }

  if (actor.side === "hero") {
    next = next.map((c) => (c.instanceId === actorId ? { ...c, mana: Math.max(0, c.mana - skill.manaCost) } : c));
  }

  return { combatants: next, events };
}

/** Self-targeted buff skills (e.g. Bouclier Sacré) skip damage/dodge/block rolls entirely — a buff never misses. */
export function performBuffSkill(combatants: Combatant[], actorId: string, skill: ClassSkill): StepResult {
  const actor = combatants.find((c) => c.instanceId === actorId)!;
  let next = combatants;
  const events: BattleEvent[] = [{ type: "log", text: `${actor.name} utilise ${skill.name} !` }];

  if (skill.inflictsStatus) {
    next = next.map((c) =>
      c.instanceId === actorId ? inflictStatus(c, skill.inflictsStatus!, STATUS_MAX_STACKS[skill.inflictsStatus!] ?? 1) : c
    );
    events.push({ type: "status_applied", targetId: actorId, statusId: skill.inflictsStatus });
  }

  if (actor.side === "hero" && skill.manaCost > 0) {
    next = next.map((c) => (c.instanceId === actorId ? { ...c, mana: Math.max(0, c.mana - skill.manaCost) } : c));
  }

  return { combatants: next, events };
}

export function performEnemySkill(combatants: Combatant[], actorId: string, targetId: string, weather: WeatherDef): StepResult {
  const actor = combatants.find((c) => c.instanceId === actorId)!;
  const target = combatants.find((c) => c.instanceId === targetId)!;
  const result = computeDamage({ attacker: actor, defender: target, damageType: actor.damageType, powerMultiplier: 1.4, weather });
  let { combatants: next, events } = applyDamageResult(
    combatants,
    actor,
    target,
    result,
    `${actor.name} utilise ${actor.skill?.name ?? "une capacité spéciale"} !`
  );

  const inflict = actor.combat?.inflicts[0];
  if (inflict && !result.dodged && !result.blocked && result.effectiveness !== "immune") {
    const targetNow = next.find((c) => c.instanceId === targetId)!;
    if (targetNow.alive && canInflictStatus(targetNow, inflict.status)) {
      next = next.map((c) =>
        c.instanceId === targetId ? inflictStatus(c, inflict.status, STATUS_MAX_STACKS[inflict.status] ?? 1) : c
      );
      events = [...events, { type: "status_applied", targetId, statusId: inflict.status }];
    }
  }

  return { combatants: next, events };
}

export function performGuard(combatants: Combatant[], actorId: string): StepResult {
  const actor = combatants.find((c) => c.instanceId === actorId)!;
  return {
    combatants: combatants.map((c) => (c.instanceId === actorId ? { ...c, guarding: true } : c)),
    events: [{ type: "log", text: `${actor.name} se met en garde défensive.` }],
  };
}

export function performItem(combatants: Combatant[], actorId: string, item: BattleItem): StepResult {
  const actor = combatants.find((c) => c.instanceId === actorId)!;
  if (item.effect === "heal") {
    const newHp = Math.min(actor.maxHp, actor.hp + item.value);
    const healed = newHp - actor.hp;
    return {
      combatants: combatants.map((c) => (c.instanceId === actorId ? { ...c, hp: newHp } : c)),
      events: [
        { type: "log", text: `${actor.name} utilise ${item.name}.` },
        { type: "heal", targetId: actorId, amount: healed },
      ],
    };
  }
  return {
    combatants: combatants.map((c) =>
      c.instanceId === actorId ? { ...c, statuses: c.statuses.filter((s) => STATUS_BY_ID[s.id]?.category === "buff") } : c
    ),
    events: [{ type: "log", text: `${actor.name} utilise ${item.name} et se purifie de ses altérations.` }],
  };
}

/** Start-of-turn processing for one combatant: status DOT ticks, control-status skip flag, mana regen, guard reset. */
export function processTurnStart(combatant: Combatant): { combatant: Combatant; events: BattleEvent[]; skipTurn: boolean } {
  const events: BattleEvent[] = [];
  let hp = combatant.hp;
  let skipTurn = false;
  const nextStatuses: ActiveStatus[] = [];

  for (const s of combatant.statuses) {
    let tickDamage = 0;
    if (s.id === "burn") tickDamage = 3 * s.stacks;
    else if (s.id === "poison") tickDamage = 2 * s.stacks;
    else if (s.id === "bleed") tickDamage = 5;
    else if (s.id === "shock") tickDamage = 2;
    if (tickDamage > 0) {
      hp = Math.max(0, hp - tickDamage);
      events.push({ type: "status_tick", targetId: combatant.instanceId, statusId: s.id, amount: tickDamage });
    }
    if (s.id === "freeze" || s.id === "stun") skipTurn = true;

    const turnsLeft = s.turnsLeft - 1;
    if (turnsLeft > 0) nextStatuses.push({ ...s, turnsLeft });
    else events.push({ type: "status_expired", targetId: combatant.instanceId, statusId: s.id });
  }

  const alive = hp > 0;
  if (!alive && combatant.alive) events.push({ type: "ko", targetId: combatant.instanceId });

  const mana =
    combatant.side === "hero" && combatant.maxMana > 0 ? Math.min(combatant.maxMana, combatant.mana + 10) : combatant.mana;

  return {
    combatant: { ...combatant, hp, mana, statuses: nextStatuses, alive, guarding: false },
    events,
    skipTurn: skipTurn && alive,
  };
}

export function rollInitiativeOrder(combatants: Combatant[]): string[] {
  return combatants
    .filter((c) => c.alive)
    .map((c) => ({ id: c.instanceId, key: c.speed + Math.random() * 0.5 }))
    .sort((a, b) => b.key - a.key)
    .map((e) => e.id);
}

export function chooseEnemyAction(enemy: Combatant, heroTargets: Combatant[]): { kind: "attack" | "skill"; targetId: string } {
  const target = heroTargets.find((h) => h.alive);
  const useSkill = !!enemy.skill && Math.random() < 0.45;
  return { kind: useSkill ? "skill" : "attack", targetId: target?.instanceId ?? "" };
}

export function shouldEnterPhase2(boss: Combatant): boolean {
  return !!boss.isBoss && boss.bossPhase === 1 && boss.alive && boss.hp <= boss.maxHp * 0.5;
}

export function enterPhase2(combatants: Combatant[], bossId: string): Combatant[] {
  return combatants.map((c) => (c.instanceId === bossId ? { ...c, bossPhase: 2, atk: Math.round(c.atk * 1.2) } : c));
}

/** The boss's own lore skill — "ressuscite une fois avec 30% de ses PV" — a one-time death prevention. */
export function tryBossRevive(combatants: Combatant[], bossId: string): { combatants: Combatant[]; revived: boolean } {
  const boss = combatants.find((c) => c.instanceId === bossId);
  if (!boss || !boss.isBoss || boss.hp > 0 || boss.hasRevived) return { combatants, revived: false };
  const revivedHp = Math.round(boss.maxHp * 0.3);
  return {
    combatants: combatants.map((c) =>
      c.instanceId === bossId ? { ...c, hp: revivedHp, alive: true, hasRevived: true } : c
    ),
    revived: true,
  };
}

export function isWaveCleared(combatants: Combatant[]): boolean {
  return combatants.filter((c) => c.side === "enemy").every((c) => !c.alive);
}

export function isHeroDefeated(combatants: Combatant[]): boolean {
  const hero = combatants.find((c) => c.side === "hero");
  return !!hero && !hero.alive;
}

export function getTypeIcon(id: DamageTypeId): string {
  return TYPE_BY_ID[id]?.icon ?? "";
}
