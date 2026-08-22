import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  GATHERING_NODES,
  CAVE_BACKGROUND,
  CAVE_ASPECT,
  MAX_TOXICITY,
  TOXICITY_PER_SECOND,
  GUARDIAN_CHANCE,
  HARVESTS_PER_NODE,
  SICKLE_MAX_DURABILITY,
  SICKLE_REPAIR_COST,
  PURIFIER_RELIEF,
  getGatheringState,
  getNodeState,
  msUntilNodeReady,
  consumeAttempt,
  grantHarvest,
  repairSickle,
  purifierCount,
  consumePurifier,
  getToxicity as readToxicity,
  setToxicity as persistToxicity,
  nodeSprite,
  nodeGuardian,
  type GatheringNodeDef,
} from "../../data/gathering";
import { getInventory, removeOwned } from "../../data/inventory";
import { MATERIAL_BY_ID } from "../../data/materials";
import { readStoredHeroClass } from "../../data/storedHero";
import { buildSoloEncounter } from "../../data/waves";
import caveArenaBg from "../../assets/dungeon/cave-arena-bg.png";
import HarvestMinigame from "./HarvestMinigame";
import TurnBattleArena from "../dungeon/TurnBattleArena";

interface MushroomCaveSceneProps {
  onClose: () => void;
  /** Called when toxicity maxes out: the run is voided and the player wakes at camp. */
  onBlackout: (lost: Record<string, number>) => void;
}

const SCENE_BOX: CSSProperties = { height: "100cqh", aspectRatio: `${CAVE_ASPECT}` };

function fmt(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function MushroomCaveScene({ onClose, onBlackout }: MushroomCaveSceneProps) {
  const reduceMotion = useReducedMotion();
  // Seeded from persisted state, NOT 0 — walking out and back in used to be a free full purge,
  // which made every other toxicity number meaningless. See TOXICITY_DECAY_MS_PER_POINT.
  const [toxicity, setToxicityLocal] = useState(() => readToxicity());
  const [version, setVersion] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [active, setActive] = useState<GatheringNodeDef | null>(null);
  /** An in-progress guardian ambush. `battleKey` remounts TurnBattleArena per ambush, the same
   * fresh-instance-per-run trick DungeonScreen uses rather than resetting a live battle in place. */
  const [guardian, setGuardian] = useState<{
    node: GatheringNodeDef;
    perfect: boolean;
    encounter: ReturnType<typeof buildSoloEncounter>;
    battleKey: number;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  /** Everything cut this visit. Wiped, not banked, if the player passes out. */
  const sessionRef = useRef<Record<string, number>>({});
  const blackedOutRef = useRef(false);

  const heroLevel = getInventory().level;
  const state = getGatheringState();
  const storedHero = readStoredHeroClass();

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  // The cave itself is the pressure: toxicity climbs whether or not you're doing anything, so
  // lingering to wait out a node recharge has a real cost.
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      setToxicityLocal((t) => persistToxicity(t + TOXICITY_PER_SECOND));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /** Single write path for every toxicity change: persist first, mirror into local state second, so
   * the stored value and what the gauge shows can never drift apart. */
  const changeToxicity = useCallback((next: (t: number) => number) => {
    setToxicityLocal((t) => persistToxicity(next(t)));
  }, []);

  useEffect(() => {
    if (toxicity < MAX_TOXICITY || blackedOutRef.current) return;
    blackedOutRef.current = true;
    // Roll back everything harvested this visit — the loss is the point of the gauge.
    const lost = { ...sessionRef.current };
    for (const [id, qty] of Object.entries(lost)) removeOwned("material", id, qty);
    onBlackout(lost);
  }, [toxicity, onBlackout]);

  function beginHarvest(node: GatheringNodeDef) {
    if (heroLevel < node.levelRequired) return flash(`Niveau ${node.levelRequired} requis.`);
    if (state.sickleDurability <= 0) return flash("Serpe émoussée — réparez-la avant de couper.");
    if (getNodeState(node.id, Date.now()).exhaustedAt !== 0) return flash("Gisement épuisé, il se régénère.");
    setActive(node);
  }

  function finishMinigame(node: GatheringNodeDef, result: { success: boolean; perfect: boolean }) {
    setActive(null);
    consumeAttempt(node.id);
    changeToxicity((t) => t + node.attemptToxicity);

    if (!result.success) {
      changeToxicity((t) => t + node.failToxicity);
      flash(
        node.tier === 3
          ? `Explosion de spores ! +${node.failToxicity}% toxicité, ressource perdue.`
          : `Coupe ratée — +${node.failToxicity}% toxicité, ressource perdue.`
      );
      setVersion((v) => v + 1);
      return;
    }

    // The guardian wakes *before* the loot is banked, so losing the fight genuinely forfeits this
    // cut. There is no flee option any more: the shared engine has none, and an unavoidable fight
    // is what gives a harvest real stakes instead of being free material printing.
    const monster = nodeGuardian(node);
    if (monster && storedHero && Math.random() < GUARDIAN_CHANCE) {
      setGuardian({
        node,
        perfect: result.perfect,
        encounter: buildSoloEncounter(monster.id, { background: caveArenaBg, label: monster.name }),
        battleKey: Date.now(),
      });
      return;
    }
    bank(node, result.perfect);
  }

  function bank(node: GatheringNodeDef, perfect: boolean) {
    const out = grantHarvest(node, perfect);
    for (const g of out.granted) {
      sessionRef.current[g.materialId] = (sessionRef.current[g.materialId] ?? 0) + g.amount;
    }
    // A cut can now come up empty — the prestige line is a roll, not a guarantee — so say so rather
    // than flashing a reward line with nothing in it.
    const spoils = out.granted
      .map((g) => `+${g.amount} ${MATERIAL_BY_ID[g.materialId]?.name ?? g.materialId}`)
      .join(" · ");
    flash(
      out.granted.length === 0
        ? `Coupe réussie mais stérile — rien d'exploitable. +${out.xp} XP`
        : `${perfect ? "Coupe parfaite ! " : ""}${spoils} · +${out.xp} XP`
    );
    setVersion((v) => v + 1);
  }

  const toxColor = toxicity > 75 ? "#f43f5e" : toxicity > 45 ? "#fbbf24" : "#34d399";
  const purifiers = purifierCount();
  void version; // re-read localStorage-backed node/sickle state after each action

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-[#05090b]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative h-full w-full overflow-hidden" style={{ containerType: "size", imageRendering: "pixelated" }}>
        <img src={CAVE_BACKGROUND} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" />

        <div className="absolute left-1/2 top-0 -translate-x-1/2" style={SCENE_BOX}>
          <img src={CAVE_BACKGROUND} alt="" className="absolute inset-0 h-full w-full" style={{ imageRendering: "pixelated" }} draggable={false} />

          {/* Toxic haze thickens with the gauge — the screen itself tells you you're in trouble. */}
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
            style={{ background: "radial-gradient(120% 100% at 50% 60%, rgba(74,222,128,0.28), rgba(20,60,35,0.5))", opacity: toxicity / MAX_TOXICITY }}
          />

          {GATHERING_NODES.map((node) => {
            const ns = getNodeState(node.id, now);
            const ready = ns.exhaustedAt === 0;
            const locked = heroLevel < node.levelRequired;
            const left = HARVESTS_PER_NODE - ns.harvests;
            return (
              <div key={node.id} className="absolute z-10" style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -100%)" }}>
                <button type="button" onClick={() => beginHarvest(node)} aria-label={node.name} className="group relative flex flex-col items-center">
                  <motion.div
                    className="relative"
                    style={{ width: 46 }}
                    animate={reduceMotion || !ready ? {} : { y: [0, -2, 0] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {/* Pulsing spore glow, matched to the tier's accent — the node's "I'm alive" tell. */}
                    <motion.span
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ width: 62, height: 62, background: `radial-gradient(circle, ${node.accent}bb, transparent 70%)`, mixBlendMode: "screen", filter: "blur(4px)" }}
                      animate={reduceMotion ? { opacity: 0.5 } : { opacity: ready ? [0.35, 0.8, 0.35] : [0.1, 0.2, 0.1], scale: [1, 1.12, 1] }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <img
                      src={nodeSprite(node.tier)}
                      alt=""
                      className="relative h-auto w-full"
                      style={{ imageRendering: "pixelated", filter: ready ? "drop-shadow(0 3px 5px rgba(0,0,0,0.7))" : "grayscale(0.8) brightness(0.5)" }}
                    />
                  </motion.div>
                  <span className="mt-0.5 whitespace-nowrap rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold backdrop-blur-sm" style={{ color: node.accent }}>
                    T{node.tier} · {locked ? `Niv. ${node.levelRequired}` : ready ? `${left} coupe${left > 1 ? "s" : ""}` : fmt(msUntilNodeReady(node.id, now))}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {/* --------------------------------------------------------------------------- HUD */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-30 rounded-full border border-white/15 bg-black/65 px-3 py-1.5 text-xs font-bold text-white/85 backdrop-blur-md hover:bg-black/80"
        >
          Sortir
        </button>

        <div className="absolute left-3 right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-20 max-w-[62%]">
          <div className="rounded-xl bg-black/60 p-2 backdrop-blur-md">
            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wide text-white/50">
              <span>Asphyxie</span>
              <span style={{ color: toxColor }}>{Math.round(toxicity)}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/60">
              <motion.div className="h-full rounded-full" style={{ backgroundColor: toxColor }} animate={{ width: `${toxicity}%` }} transition={{ duration: 0.4 }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="text-[9px] font-bold text-white/45">
                Serpe {state.sickleDurability}/{SICKLE_MAX_DURABILITY}
              </span>
              {state.sickleDurability < SICKLE_MAX_DURABILITY && (
                <button
                  type="button"
                  onClick={() => {
                    if (repairSickle()) { flash("Serpe réaffûtée."); setVersion((v) => v + 1); }
                    else flash(`${SICKLE_REPAIR_COST} Écus requis.`);
                  }}
                  className="rounded-full border border-lantern/40 px-1.5 py-0.5 text-[9px] font-bold text-lantern-glow hover:bg-lantern/15"
                >
                  Réparer · {SICKLE_REPAIR_COST}
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={purifiers <= 0 || toxicity <= 0}
            onClick={() => {
              const relief = consumePurifier();
              if (relief <= 0) return flash("Aucun purifiant.");
              changeToxicity((t) => t - relief);
              flash(`Purifiant utilisé — −${relief}% asphyxie.`);
              setVersion((v) => v + 1);
            }}
            className={
              "mt-1.5 w-full rounded-xl px-2 py-1.5 text-[10px] font-bold transition-colors " +
              (purifiers > 0 && toxicity > 0 ? "border border-emerald-400/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50" : "border border-white/10 bg-black/40 text-white/30")
            }
          >
            Purifiant ×{purifiers} · −{PURIFIER_RELIEF}%
          </button>
        </div>

        <AnimatePresence>
          {toast && (
            <motion.p
              key={toast}
              className="absolute inset-x-6 bottom-6 z-30 rounded-xl bg-black/75 px-3 py-2 text-center text-[11px] font-bold text-white backdrop-blur-md"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {toast}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {active && (
          <HarvestMinigame
            node={active}
            onCancel={() => setActive(null)}
            onFinish={(r) => finishMinigame(active, r)}
          />
        )}
        {/* THE guardian fight is the real dungeon engine, not a bespoke mini-screen — same
            TurnBattleArena, same turn order, same skills/items/statuses, only the EncounterDef and
            the backdrop differ. The earlier hand-rolled strike/flee exchange was rejected outright
            ("je veux que ce soit le même moteur de combat que dans les donjons juste avec un autre
            decor"); see EncounterDef in waves.ts before adding any future fight anywhere. */}
        {guardian && storedHero && (
          <TurnBattleArena
            key={guardian.battleKey}
            classDef={storedHero.classDef}
            gender={storedHero.hero.gender}
            level={heroLevel}
            encounter={guardian.encounter}
            onComplete={({ victory }) => {
              const g = guardian;
              setGuardian(null);
              if (victory) {
                // Beating the ambush keeps the cut AND banks the guardian's own bestiary drops,
                // which TurnBattleArena has already applied to the inventory by this point.
                bank(g.node, g.perfect);
                flash(`${nodeGuardian(g.node)?.name ?? "Le gardien"} est vaincu — récolte sécurisée !`);
              } else {
                // Losing is a blackout: the spores take you and the whole visit's harvest is voided.
                changeToxicity(() => MAX_TOXICITY);
              }
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
