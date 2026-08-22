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
  nodeSprite,
  nodeMaterial,
  nodeGuardian,
  type GatheringNodeDef,
} from "../../data/gathering";
import { getInventory, removeOwned } from "../../data/inventory";
import HarvestMinigame from "./HarvestMinigame";
import GuardianEncounter from "./GuardianEncounter";

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
  const [toxicity, setToxicity] = useState(0);
  const [version, setVersion] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [active, setActive] = useState<GatheringNodeDef | null>(null);
  const [guardian, setGuardian] = useState<{ node: GatheringNodeDef; perfect: boolean } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  /** Everything cut this visit. Wiped, not banked, if the player passes out. */
  const sessionRef = useRef<Record<string, number>>({});
  const blackedOutRef = useRef(false);

  const heroLevel = getInventory().level;
  const state = getGatheringState();

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  // The cave itself is the pressure: toxicity climbs whether or not you're doing anything, so
  // lingering to wait out a node recharge has a real cost.
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      setToxicity((t) => Math.min(MAX_TOXICITY, t + TOXICITY_PER_SECOND));
    }, 1000);
    return () => clearInterval(id);
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
    setToxicity((t) => Math.min(MAX_TOXICITY, t + node.attemptToxicity));

    if (!result.success) {
      setToxicity((t) => Math.min(MAX_TOXICITY, t + node.failToxicity));
      flash(
        node.tier === 3
          ? `Explosion de spores ! +${node.failToxicity}% toxicité, ressource perdue.`
          : `Coupe ratée — +${node.failToxicity}% toxicité, ressource perdue.`
      );
      setVersion((v) => v + 1);
      return;
    }

    // The guardian wakes *before* the loot is banked, so fleeing genuinely forfeits this cut.
    if (Math.random() < GUARDIAN_CHANCE) {
      setGuardian({ node, perfect: result.perfect });
      return;
    }
    bank(node, result.perfect);
  }

  function bank(node: GatheringNodeDef, perfect: boolean) {
    const out = grantHarvest(node, perfect);
    sessionRef.current[out.materialId] = (sessionRef.current[out.materialId] ?? 0) + out.amount;
    flash(
      perfect
        ? `Coupe parfaite ! +${out.amount} ${nodeMaterial(node)?.name} · +${out.xp} XP`
        : `+${out.amount} ${nodeMaterial(node)?.name} · +${out.xp} XP`
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
              setToxicity((t) => Math.max(0, t - relief));
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
        {guardian && (
          <GuardianEncounter
            guardian={nodeGuardian(guardian.node)}
            onResolve={({ won, fled }) => {
              const g = guardian;
              setGuardian(null);
              if (won) bank(g.node, g.perfect);
              else if (fled) flash("Vous fuyez — les champignons sont abandonnés.");
              else {
                setToxicity(MAX_TOXICITY);
              }
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
