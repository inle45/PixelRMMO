import { useEffect, useReducer, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ClassDefinition, Gender } from "../../data/classes";
import type { MonsterDef } from "../../data/bestiary";
import { CLASS_SKILLS } from "../../data/skills";
import { BATTLE_ITEMS, STARTING_ITEM_COUNTS, type BattleItem } from "../../data/items";
import { generateWave1, generateWave2, generateWave3, generateReinforcements, type WaveMonster } from "../../data/waves";
import { rollDungeonLoot, computeXpReward, toLootCards, type LootCard } from "../../data/lootEngine";
import { applyRewards } from "../../data/inventory";
import { WEATHER, getActiveWeatherIndex, STATUS_BY_ID } from "../../data/typeSystem";
import {
  buildHeroCombatant,
  buildEnemyCombatant,
  rollInitiativeOrder,
  processTurnStart,
  performBasicAttack,
  performSkill,
  performEnemySkill,
  performGuard,
  performItem,
  chooseEnemyAction,
  shouldEnterPhase2,
  enterPhase2,
  tryBossRevive,
  isWaveCleared,
  isHeroDefeated,
  previewEffectiveness,
  getTypeEffectiveness,
  type Combatant,
  type BattleEvent,
} from "../../data/battleEngine";
import CombatantPanel, { type FloatingText } from "./CombatantPanel";
import TurnQueueBar from "./TurnQueueBar";
import ActionMenu from "./ActionMenu";
import arenaBg from "../../assets/dungeon/arena-bg.png";
import targetIcon from "../../assets/icons/dungeon/target.png";

export interface BattleResult {
  victory: boolean;
  elapsedMs: number;
  monstersDefeated: number;
  totalDamageDealt: number;
  criticalHits: number;
  ecus: number;
  lootCards: LootCard[];
  xpGained: number;
  leveledUp: boolean;
  previousLevel: number;
  newLevel: number;
}

interface TurnBattleArenaProps {
  classDef: ClassDefinition;
  gender: Gender;
  level: number;
  onComplete: (result: BattleResult) => void;
}

type Phase = "player_turn" | "busy" | "wave_transition" | "victory" | "defeat";
type TargetMode = { kind: "attack" | "skill"; damageType: Combatant["damageType"]; skill?: (typeof CLASS_SKILLS)[keyof typeof CLASS_SKILLS] } | null;

interface Internal {
  combatants: Combatant[];
  wave: 1 | 2 | 3;
  turnOrder: string[];
  activeId: string | null;
  phase: Phase;
  menu: "none" | "skills" | "items";
  targetMode: TargetMode;
  itemCounts: Record<string, number>;
  log: string[];
  floatingTexts: Record<string, FloatingText[]>;
  playingId: string | null;
  effectivenessBadge: Record<string, { kind: "weak" | "immune"; mult?: number }>;
  isRareEvent: boolean;
  bossPhase2Triggered: boolean;
  waveBanner: string | null;
}

interface RunStats {
  startedAt: number;
  monstersDefeated: MonsterDef[];
  totalDamageDealt: number;
  criticalHits: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let floatId = 0;

export default function TurnBattleArena({ classDef, gender, level, onComplete }: TurnBattleArenaProps) {
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  const skill = CLASS_SKILLS[classDef.id];

  const stateRef = useRef<Internal>(buildInitialState(classDef, gender, level));
  const statsRef = useRef<RunStats>({ startedAt: Date.now(), monstersDefeated: [], totalDamageDealt: 0, criticalHits: 0 });
  const battleEndedRef = useRef(false);
  const playerTurnResolveRef = useRef<(() => void) | null>(null);
  const startedRef = useRef(false);

  function set(patch: Partial<Internal>) {
    stateRef.current = { ...stateRef.current, ...patch };
    forceRender();
  }
  function applyCombatants(next: Combatant[]) {
    set({ combatants: next });
  }
  function pushLog(text: string) {
    set({ log: [...stateRef.current.log.slice(-3), text] });
  }
  function nameOf(id: string): string {
    return stateRef.current.combatants.find((c) => c.instanceId === id)?.name ?? "?";
  }
  function setPlaying(id: string | null) {
    set({ playingId: id });
  }
  function addFloatingText(targetId: string, text: string, kind: FloatingText["kind"]) {
    const ft: FloatingText = { id: `f${floatId++}`, text, kind };
    const current = stateRef.current.floatingTexts;
    set({ floatingTexts: { ...current, [targetId]: [...(current[targetId] ?? []), ft] } });
  }
  function clearFloatingText(targetId: string, id: string) {
    const current = stateRef.current.floatingTexts;
    set({ floatingTexts: { ...current, [targetId]: (current[targetId] ?? []).filter((f) => f.id !== id) } });
  }
  function setEffectivenessBadge(targetId: string, kind: "weak" | "immune", mult?: number) {
    set({ effectivenessBadge: { ...stateRef.current.effectivenessBadge, [targetId]: { kind, mult } } });
  }
  function clearEffectivenessBadge(targetId: string) {
    const next = { ...stateRef.current.effectivenessBadge };
    delete next[targetId];
    set({ effectivenessBadge: next });
  }

  async function playEvents(events: BattleEvent[]) {
    for (const ev of events) {
      switch (ev.type) {
        case "log":
          pushLog(ev.text);
          break;
        case "damage": {
          addFloatingText(ev.targetId, ev.crit ? `-${ev.amount} !` : `-${ev.amount}`, ev.crit ? "crit" : "damage");
          if (ev.effectiveness === "weak") {
            const target = stateRef.current.combatants.find((c) => c.instanceId === ev.targetId);
            const mult = target?.combat ? getTypeEffectiveness(target.damageType, target.combat).mult : undefined;
            setEffectivenessBadge(ev.targetId, "weak", mult);
            void sleep(1300).then(() => clearEffectivenessBadge(ev.targetId));
          }
          if (ev.actorId === "hero") {
            statsRef.current.totalDamageDealt += ev.amount;
            if (ev.crit) statsRef.current.criticalHits += 1;
          }
          await sleep(220);
          break;
        }
        case "heal":
          addFloatingText(ev.targetId, `+${ev.amount}`, "heal");
          await sleep(200);
          break;
        case "dodge":
          addFloatingText(ev.targetId, "Esquive !", "miss");
          await sleep(200);
          break;
        case "block":
          addFloatingText(ev.targetId, "Bloqué !", "miss");
          await sleep(200);
          break;
        case "immune":
          addFloatingText(ev.targetId, "Immunisé", "miss");
          setEffectivenessBadge(ev.targetId, "immune");
          void sleep(1300).then(() => clearEffectivenessBadge(ev.targetId));
          await sleep(200);
          break;
        case "status_applied":
          pushLog(`${nameOf(ev.targetId)} subit ${STATUS_BY_ID[ev.statusId]?.name ?? ev.statusId}.`);
          break;
        case "status_tick":
          addFloatingText(ev.targetId, `-${ev.amount}`, "status");
          await sleep(180);
          break;
        case "status_expired":
          break;
        case "ko": {
          pushLog(`${nameOf(ev.targetId)} est vaincu !`);
          const c = stateRef.current.combatants.find((x) => x.instanceId === ev.targetId);
          if (c?.side === "enemy" && c.sourceDef) statsRef.current.monstersDefeated.push(c.sourceDef);
          await sleep(450);
          break;
        }
      }
    }
  }

  function checkBattleEnd(): boolean {
    const st = stateRef.current;
    if (isHeroDefeated(st.combatants)) {
      battleEndedRef.current = true;
      set({ phase: "defeat" });
      void finishRun(false);
      return true;
    }
    if (isWaveCleared(st.combatants)) {
      battleEndedRef.current = true;
      void handleWaveCleared();
      return true;
    }
    return false;
  }

  async function handlePostAction() {
    const st = stateRef.current;
    const boss = st.combatants.find((c) => c.isBoss);
    if (!boss) return;
    if (!boss.alive) {
      const { combatants: revived, revived: didRevive } = tryBossRevive(st.combatants, boss.instanceId);
      if (didRevive) {
        applyCombatants(revived);
        pushLog("🌪️ Le Roi Squelette se relève dans un tourbillon d'ossements !");
        await sleep(800);
      }
    } else if (!st.bossPhase2Triggered && shouldEnterPhase2(boss)) {
      const withPhase2 = enterPhase2(st.combatants, boss.instanceId);
      const reinforcements = generateReinforcements().map(buildEnemyCombatant);
      applyCombatants([...withPhase2, ...reinforcements]);
      set({ bossPhase2Triggered: true });
      pushLog("⚠️ Le Roi Squelette entre en furie et invoque des renforts !");
      await sleep(900);
    }
  }

  async function handleWaveCleared() {
    const st = stateRef.current;
    if (st.wave === 3) {
      set({ phase: "victory" });
      await finishRun(true);
      return;
    }
    set({ phase: "wave_transition", waveBanner: `Vague ${st.wave} Terminée !` });
    await sleep(1800);
    const hero = st.combatants.find((c) => c.side === "hero")!;
    const nextWaveNum = st.wave === 1 ? 2 : 3;
    const plan = nextWaveNum === 2 ? generateWave2() : generateWave3();
    const carriedHero = buildHeroCombatant(classDef, gender, level, { hp: hero.hp, mana: hero.mana });
    const newEnemies = plan.monsters.map((wm: WaveMonster) => buildEnemyCombatant(wm));
    set({
      combatants: [carriedHero, ...newEnemies],
      wave: nextWaveNum,
      isRareEvent: plan.isRareEvent,
      bossPhase2Triggered: false,
      phase: "player_turn",
      waveBanner: plan.isRareEvent ? "⭐ Rencontre Rare !" : null,
      menu: "none",
      targetMode: null,
    });
    if (plan.isRareEvent) void sleep(2200).then(() => set({ waveBanner: null }));
    battleEndedRef.current = false;
    void runRound();
  }

  async function finishRun(victory: boolean) {
    const stats = statsRef.current;
    const elapsedMs = Date.now() - stats.startedAt;
    if (victory) {
      const loot = rollDungeonLoot(stats.monstersDefeated);
      const xp = computeXpReward(stats.monstersDefeated);
      const applied = applyRewards({ ecus: loot.ecus, materials: loot.materials, xp });
      await sleep(600);
      onComplete({
        victory: true,
        elapsedMs,
        monstersDefeated: stats.monstersDefeated.length,
        totalDamageDealt: stats.totalDamageDealt,
        criticalHits: stats.criticalHits,
        ecus: loot.ecus,
        lootCards: toLootCards(loot.materials),
        xpGained: xp,
        leveledUp: applied.leveledUp,
        previousLevel: applied.previousLevel,
        newLevel: applied.state.level,
      });
    } else {
      const consolationXp = Math.round(computeXpReward(stats.monstersDefeated) * 0.25);
      const applied = applyRewards({ xp: consolationXp });
      await sleep(600);
      onComplete({
        victory: false,
        elapsedMs,
        monstersDefeated: stats.monstersDefeated.length,
        totalDamageDealt: stats.totalDamageDealt,
        criticalHits: stats.criticalHits,
        ecus: 0,
        lootCards: [],
        xpGained: consolationXp,
        leveledUp: applied.leveledUp,
        previousLevel: applied.previousLevel,
        newLevel: applied.state.level,
      });
    }
  }

  function runPlayerTurn(): Promise<void> {
    return new Promise((resolve) => {
      playerTurnResolveRef.current = resolve;
      set({ phase: "player_turn" });
    });
  }

  async function runEnemyTurn(actor: Combatant) {
    const heroTargets = stateRef.current.combatants.filter((c) => c.side === "hero");
    const { kind, targetId } = chooseEnemyAction(actor, heroTargets);
    if (!targetId) return;
    const weather = WEATHER[getActiveWeatherIndex(Date.now())];
    setPlaying(actor.instanceId);
    await sleep(350);
    const result =
      kind === "skill"
        ? performEnemySkill(stateRef.current.combatants, actor.instanceId, targetId, weather)
        : performBasicAttack(stateRef.current.combatants, actor.instanceId, targetId, weather);
    applyCombatants(result.combatants);
    await playEvents(result.events);
    setPlaying(null);
    await sleep(200);
  }

  async function runRound() {
    if (battleEndedRef.current) return;
    const order = rollInitiativeOrder(stateRef.current.combatants);
    set({ turnOrder: order });
    for (let i = 0; i < order.length; i++) {
      if (battleEndedRef.current) return;
      const id = order[i];
      const actor = stateRef.current.combatants.find((c) => c.instanceId === id);
      if (!actor || !actor.alive) continue;
      set({ activeId: id });

      const { combatant: updatedActor, events, skipTurn } = processTurnStart(actor);
      applyCombatants(stateRef.current.combatants.map((c) => (c.instanceId === id ? updatedActor : c)));
      await playEvents(events);
      if (checkBattleEnd()) return;
      if (!updatedActor.alive) continue;

      if (skipTurn) {
        pushLog(`${updatedActor.name} est immobilisé et ne peut agir !`);
        await sleep(700);
        continue;
      }

      if (updatedActor.side === "enemy") {
        set({ phase: "busy" });
        await sleep(1000);
        await runEnemyTurn(updatedActor);
        if (checkBattleEnd()) return;
      } else {
        await runPlayerTurn();
      }
      if (battleEndedRef.current) return;
    }
    void runRound();
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void runRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resolveHeroAction(kind: "attack" | "skill" | "guard" | "item", targetId: string | null, item?: BattleItem) {
    set({ phase: "busy", menu: "none", targetMode: null });
    const weather = WEATHER[getActiveWeatherIndex(Date.now())];
    let result: { combatants: Combatant[]; events: BattleEvent[] };

    if (kind === "guard") {
      result = performGuard(stateRef.current.combatants, "hero");
    } else if (kind === "item" && item) {
      result = performItem(stateRef.current.combatants, "hero", item);
      const counts = { ...stateRef.current.itemCounts };
      counts[item.id] = Math.max(0, (counts[item.id] ?? 0) - 1);
      set({ itemCounts: counts });
    } else if (kind === "attack" && targetId) {
      setPlaying("hero");
      await sleep(350);
      result = performBasicAttack(stateRef.current.combatants, "hero", targetId, weather);
    } else if (kind === "skill" && targetId) {
      setPlaying("hero");
      await sleep(350);
      result = performSkill(stateRef.current.combatants, "hero", targetId, skill, weather);
    } else {
      result = { combatants: stateRef.current.combatants, events: [] };
    }

    applyCombatants(result.combatants);
    await playEvents(result.events);
    setPlaying(null);
    await sleep(150);

    await handlePostAction();
    if (checkBattleEnd()) return;

    set({ phase: "player_turn" });
    playerTurnResolveRef.current?.();
    playerTurnResolveRef.current = null;
  }

  function aliveEnemies(): Combatant[] {
    return stateRef.current.combatants.filter((c) => c.side === "enemy" && c.alive);
  }

  function beginTargeting(kind: "attack" | "skill") {
    const enemies = aliveEnemies();
    const damageType = kind === "attack" ? "physical" : skill.damageType;
    if (enemies.length === 1) {
      void resolveHeroAction(kind, enemies[0].instanceId);
      return;
    }
    for (const e of enemies) {
      const effectiveness = previewEffectiveness(damageType, e);
      if (effectiveness === "weak") {
        const mult = e.combat ? getTypeEffectiveness(damageType, e.combat).mult : undefined;
        setEffectivenessBadge(e.instanceId, "weak", mult);
      }
    }
    set({ targetMode: { kind, damageType, skill: kind === "skill" ? skill : undefined }, menu: "none" });
  }

  function handleTargetClick(targetId: string) {
    const mode = stateRef.current.targetMode;
    if (!mode) return;
    set({ targetMode: null, effectivenessBadge: {} });
    void resolveHeroAction(mode.kind, targetId);
  }

  const st = stateRef.current;
  const hero = st.combatants.find((c) => c.side === "hero");
  const enemies = st.combatants.filter((c) => c.side === "enemy");
  const inputLocked = st.phase !== "player_turn" || !!st.targetMode;
  const canOpenMenu = st.phase === "player_turn" && !st.targetMode;

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <img src={arenaBg} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ imageRendering: "pixelated" }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/80" />

      <div className="relative flex flex-1 flex-col px-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <TurnQueueBar order={st.turnOrder} combatants={st.combatants} activeId={st.activeId} />

        <AnimatePresence>
          {st.waveBanner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="pointer-events-none absolute left-1/2 top-1/3 z-30 -translate-x-1/2 rounded-2xl border border-lantern/40 bg-black/70 px-6 py-3 text-center backdrop-blur"
            >
              <p className="text-lg font-bold text-lantern-glow" style={{ fontFamily: "var(--font-pixel)" }}>
                {st.waveBanner}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-1 items-center justify-between gap-2 py-4">
          {hero && (
            <CombatantPanel
              combatant={hero}
              playing={st.playingId === "hero"}
              size="lg"
              floatingTexts={st.floatingTexts["hero"] ?? []}
              onFloatingTextDone={(id) => clearFloatingText("hero", id)}
            />
          )}

          <div className="flex flex-1 flex-wrap items-center justify-end gap-1">
            {enemies.map((e) => {
              const targetable = !!st.targetMode && e.alive;
              const badge = st.effectivenessBadge[e.instanceId];
              return (
                <CombatantPanel
                  key={e.instanceId}
                  combatant={e}
                  playing={st.playingId === e.instanceId}
                  size={enemies.length > 1 ? "sm" : "lg"}
                  flipped
                  targetable={targetable}
                  onSelectTarget={() => handleTargetClick(e.instanceId)}
                  effectivenessBadge={badge?.kind ?? null}
                  effectivenessMultiplier={badge?.mult}
                  floatingTexts={st.floatingTexts[e.instanceId] ?? []}
                  onFloatingTextDone={(id) => clearFloatingText(e.instanceId, id)}
                />
              );
            })}
          </div>
        </div>

        <div className="mb-2 h-14 space-y-0.5 overflow-hidden rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-[10px] leading-tight text-white/70 backdrop-blur">
          {st.log.length === 0 && <p className="text-white/30">Le combat commence...</p>}
          {st.log.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>

        <div className="pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {st.targetMode ? (
            <div className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-400/40 bg-black/50 px-3 py-2.5 text-center text-xs font-bold text-rose-200 backdrop-blur">
              <img src={targetIcon} alt="" className="h-4 w-4 object-contain" style={{ imageRendering: "pixelated" }} />
              Choisis une cible parmi les ennemis en surbrillance
              <button
                type="button"
                onClick={() => set({ targetMode: null, effectivenessBadge: {} })}
                className="ml-2 rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-white/70"
              >
                Annuler
              </button>
            </div>
          ) : st.menu === "skills" ? (
            <SkillPanel
              skill={skill}
              hero={hero}
              onCancel={() => set({ menu: "none" })}
              onPick={() => beginTargeting("skill")}
            />
          ) : st.menu === "items" ? (
            <ItemPanel
              itemCounts={st.itemCounts}
              onCancel={() => set({ menu: "none" })}
              onPick={(item) => void resolveHeroAction("item", "hero", item)}
            />
          ) : (
            <ActionMenu
              disabled={inputLocked || !canOpenMenu}
              onBasicAttack={() => beginTargeting("attack")}
              onOpenSkills={() => set({ menu: "skills" })}
              onGuard={() => void resolveHeroAction("guard", null)}
              onOpenItems={() => set({ menu: "items" })}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function buildInitialState(classDef: ClassDefinition, gender: Gender, level: number): Internal {
  const hero = buildHeroCombatant(classDef, gender, level);
  const plan = generateWave1();
  const enemies = plan.monsters.map((wm: WaveMonster) => buildEnemyCombatant(wm));
  return {
    combatants: [hero, ...enemies],
    wave: 1,
    turnOrder: [],
    activeId: null,
    phase: "player_turn",
    menu: "none",
    targetMode: null,
    itemCounts: { ...STARTING_ITEM_COUNTS },
    log: [],
    floatingTexts: {},
    playingId: null,
    effectivenessBadge: {},
    isRareEvent: false,
    bossPhase2Triggered: false,
    waveBanner: null,
  };
}

function SkillPanel({
  skill,
  hero,
  onCancel,
  onPick,
}: {
  skill: (typeof CLASS_SKILLS)[keyof typeof CLASS_SKILLS];
  hero?: Combatant;
  onCancel: () => void;
  onPick: () => void;
}) {
  const canAfford = !hero || hero.mana >= skill.manaCost;
  return (
    <div className="rounded-xl border border-violet-400/30 bg-black/60 p-2.5 backdrop-blur">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-violet-300">Sorts &amp; Compétences</span>
        <button type="button" onClick={onCancel} className="text-[10px] text-white/50">
          ✕ Fermer
        </button>
      </div>
      <button
        type="button"
        disabled={!canAfford}
        onClick={onPick}
        className="flex w-full items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.06] p-2 text-left transition-colors hover:border-violet-400/40 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <img src={skill.icon} alt="" className="h-7 w-7 flex-none object-contain" style={{ imageRendering: "pixelated" }} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white">{skill.name}</p>
          <p className="truncate text-[10px] text-white/50">{skill.description}</p>
        </div>
        {skill.manaCost > 0 && (
          <span className="flex-none rounded-full bg-sky-400/15 px-2 py-0.5 text-[9px] font-bold text-sky-300">
            {skill.manaCost} Mana
          </span>
        )}
      </button>
    </div>
  );
}

function ItemPanel({
  itemCounts,
  onCancel,
  onPick,
}: {
  itemCounts: Record<string, number>;
  onCancel: () => void;
  onPick: (item: BattleItem) => void;
}) {
  return (
    <div className="rounded-xl border border-emerald-400/30 bg-black/60 p-2.5 backdrop-blur">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">Sac d'Objets</span>
        <button type="button" onClick={onCancel} className="text-[10px] text-white/50">
          ✕ Fermer
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {BATTLE_ITEMS.map((item) => {
          const count = itemCounts[item.id] ?? 0;
          return (
            <button
              key={item.id}
              type="button"
              disabled={count <= 0}
              onClick={() => onPick(item)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] p-2 text-left transition-colors hover:border-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <img src={item.icon} alt="" className="h-7 w-7 flex-none object-contain" style={{ imageRendering: "pixelated" }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-white">{item.name}</p>
                <p className="text-[9px] text-white/45">x{count}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
