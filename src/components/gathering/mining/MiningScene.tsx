import { useCallback, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MINING_NODES,
  CANYON_BACKGROUND,
  CANYON_ASPECT,
  PICKAXE_REPAIR_COST,
  AMBUSH_CHANCE,
  getMiningState,
  pickaxeMax,
  getNodeState,
  consumeAttempt,
  repairPickaxe,
  grantOre,
  nodeGuardian,
  isDaytime,
  canyonTimeId,
  CANYON_TIME_GRADE,
  type MiningNodeDef,
} from "../../../data/mining";
import { getInventory } from "../../../data/inventory";
import { MATERIAL_BY_ID } from "../../../data/materials";
import { readStoredHeroClass } from "../../../data/storedHero";
import { buildSoloEncounter } from "../../../data/waves";
import canyonArenaBg from "../../../assets/dungeon/canyon-arena-bg.png";
import TurnBattleArena from "../../dungeon/TurnBattleArena";
import MiningAmbience from "./MiningAmbience";
import FractureMinigame from "./FractureMinigame";

interface MiningSceneProps {
  onClose: () => void;
}

const SCENE_BOX: CSSProperties = { height: "100cqh", aspectRatio: `${CANYON_ASPECT}` };

/**
 * Les Canyons Écarlates.
 *
 * Third gathering zone, same shell as the cave and the lake: portrait backdrop filling the
 * viewport, node pins measured against the artwork's own ravines/scaffolding, a HUD in the corner,
 * and ambushes that mount the shared `TurnBattleArena` — never a bespoke fight screen.
 */
export default function MiningScene({ onClose }: MiningSceneProps) {
  const [version, setVersion] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [active, setActive] = useState<MiningNodeDef | null>(null);
  const [ambush, setAmbush] = useState<{
    node: MiningNodeDef;
    perfect: boolean;
    encounter: ReturnType<typeof buildSoloEncounter>;
    battleKey: number;
  } | null>(null);

  const storedHero = readStoredHeroClass();
  const heroLevel = getInventory().level;
  const state = getMiningState();
  const daytime = isDaytime();
  const grade = CANYON_TIME_GRADE[canyonTimeId()];

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);

  function beginStrike(node: MiningNodeDef) {
    if (heroLevel < node.levelRequired) return flash(`Niveau ${node.levelRequired} requis.`);
    if (state.pickaxeDurability <= 0) return flash("Pioche ébréchée — réparez-la avant de miner.");
    if (getNodeState(node.id, Date.now()).exhaustedAt !== 0) return flash("Filon épuisé, il se régénère.");
    setActive(node);
  }

  function onStrikeResolved(node: MiningNodeDef, outcome: "perfect" | "hit" | "miss") {
    setActive(null);
    consumeAttempt(node.id, outcome === "miss");
    setVersion((v) => v + 1);

    if (outcome === "miss") {
      flash("Rebond ! La pioche s'ébrèche et le bloc résiste.");
      return;
    }

    // Rolled on every resolved swing, hit or perfect — the vibration of the strike is what wakes
    // the guardian, not whether the ore actually broke clean.
    const monster = nodeGuardian(node);
    if (monster && storedHero && Math.random() < AMBUSH_CHANCE) {
      setAmbush({
        node,
        perfect: outcome === "perfect",
        encounter: buildSoloEncounter(monster.id, { background: canyonArenaBg, label: monster.name }),
        battleKey: Date.now(),
      });
      return;
    }
    bank(node, outcome === "perfect");
  }

  function bank(node: MiningNodeDef, perfect: boolean) {
    const out = grantOre(node, perfect);
    const spoils = out.granted
      .map((g) => `+${g.amount} ${MATERIAL_BY_ID[g.materialId]?.name ?? g.materialId}`)
      .join(" · ");
    flash(
      out.granted.length === 0
        ? `Bloc brisé, mais rien d'exploitable. +${out.xp} XP`
        : `${perfect ? "Coupe nette ! " : ""}${spoils} · +${out.xp} XP`
    );
    setVersion((v) => v + 1);
  }

  void version; // re-read localStorage-backed node/pickaxe state after each action

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-[#160a05]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative h-full w-full overflow-hidden" style={{ containerType: "size", imageRendering: "pixelated" }}>
        <img src={CANYON_BACKGROUND} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" />

        <div className="absolute left-1/2 top-0 -translate-x-1/2" style={SCENE_BOX}>
          <img
            src={CANYON_BACKGROUND}
            alt=""
            className="absolute inset-0 h-full w-full transition-[filter] duration-1000"
            style={{ imageRendering: "pixelated", filter: grade.filter }}
            draggable={false}
          />
          {/* Colour wash on top of the graded image — one background, day/night expressed purely
              in CSS, same mechanism as the Cité's TIME_GRADE rather than a second generation. */}
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
            style={{ background: grade.wash }}
          />

          <MiningAmbience daytime={daytime} />

          {MINING_NODES.map((node) => {
            const locked = heroLevel < node.levelRequired;
            const exhausted = getNodeState(node.id, Date.now()).exhaustedAt !== 0;
            const live = !locked && !exhausted;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => beginStrike(node)}
                aria-label={node.name}
                className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                <motion.span
                  className="block h-9 w-9 rounded-lg border-2"
                  style={{
                    borderColor: node.accent,
                    backgroundColor: `${node.accent}33`,
                    boxShadow: live ? `0 0 16px 4px ${node.accent}88` : "none",
                    opacity: locked || exhausted ? 0.35 : 1,
                  }}
                  animate={live ? { rotate: [-3, 3, -3] } : {}}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />
                <span
                  className="mt-1 whitespace-nowrap rounded-full bg-black/65 px-2 py-0.5 text-[9px] font-bold backdrop-blur-sm"
                  style={{ color: locked || exhausted ? "rgba(255,255,255,0.4)" : node.accent }}
                >
                  {locked ? `Niv. ${node.levelRequired}` : exhausted ? `${node.name} · épuisé` : node.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* ---- HUD ---- */}
        <div className="absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top))] w-44 rounded-2xl border border-white/10 bg-black/60 p-3 backdrop-blur-md">
          <p className="text-[10px] font-bold uppercase tracking-wide text-orange-300">Canyons Écarlates</p>
          <div className="mt-2 flex items-center justify-between text-[10px] text-white/60">
            <span>Pioche</span>
            <span className={state.pickaxeDurability <= 0 ? "text-rose-400" : "text-white"}>
              {state.pickaxeDurability}/{pickaxeMax(state)}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300"
              style={{ width: `${(state.pickaxeDurability / pickaxeMax(state)) * 100}%` }}
            />
          </div>
          <button
            type="button"
            disabled={state.pickaxeDurability >= pickaxeMax(state)}
            onClick={() => {
              if (!repairPickaxe()) return flash(`Il faut ${PICKAXE_REPAIR_COST} Écus pour réparer.`);
              flash("Pioche réparée.");
              setVersion((v) => v + 1);
            }}
            className="mt-2 w-full rounded-lg border border-orange-400/40 bg-orange-950/40 px-2 py-1 text-[10px] font-bold text-orange-300 disabled:border-white/10 disabled:bg-black/40 disabled:text-white/25"
          >
            Réparer · {PICKAXE_REPAIR_COST} Écus
          </button>
          <p className="mt-2 text-[9px] leading-snug text-white/40">
            {grade.caption}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] rounded-full border border-white/15 bg-black/60 px-3 py-2 text-[11px] font-bold text-white/80 backdrop-blur-md hover:bg-black/80"
        >
          Quitter le canyon
        </button>

        <AnimatePresence>
          {toast && (
            <motion.div
              className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-xl border border-white/15 bg-black/80 px-4 py-2 text-center text-[11px] font-semibold text-white backdrop-blur-md"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {active && (
          <FractureMinigame
            node={active}
            onCancel={() => setActive(null)}
            onFinish={(r) => onStrikeResolved(active, r.outcome)}
          />
        )}
        {ambush && storedHero && (
          <TurnBattleArena
            key={ambush.battleKey}
            classDef={storedHero.classDef}
            gender={storedHero.hero.gender}
            level={heroLevel}
            encounter={ambush.encounter}
            onComplete={({ victory }) => {
              const a = ambush;
              setAmbush(null);
              if (victory) {
                bank(a.node, a.perfect);
              } else {
                flash("Vaincu — l'éboulement vous chasse du filon.");
                setVersion((v) => v + 1);
              }
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
