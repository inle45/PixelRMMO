import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  TREES,
  AMBUSH_CHANCE,
  AXE_REPAIR_COST,
  canChop,
  consumeFell,
  getTreeState,
  getWoodcuttingState,
  grantWood,
  repairAxe,
  treeGuardian,
  treeSprite,
  AXE_MAX_DURABILITY,
  type TreeDef,
} from "../../data/woodcutting";
import {
  FOREST_BACKGROUND,
  FOREST_GRADE,
  FOREST_LIGHTS,
  isNightPeriod,
} from "../../data/campPanels";
import type { TimeOfDayId } from "../../hooks/useTimeOfDay";
import { MATERIAL_BY_ID } from "../../data/materials";
import { getInventory } from "../../data/inventory";
import { readStoredHeroClass } from "../../data/storedHero";
import { buildSoloEncounter } from "../../data/waves";
import TurnBattleArena from "../dungeon/TurnBattleArena";
import PanelStage from "./PanelStage";
import ForestAmbience from "./ForestAmbience";
import ChopMinigame from "./ChopMinigame";

/**
 * La Lisière Sylvestre — the camp's left-hand panel.
 *
 * Same shell as the three standalone gathering zones (node pins on a graded backdrop, a corner HUD,
 * ambushes on the shared `TurnBattleArena`), but living inside the camp pager rather than behind a
 * World Map node, because the spec puts the woodpile at the player's own camp.
 *
 * An ambush here uses **the real combat engine** with a forest `EncounterDef` — see the ONE COMBAT
 * ENGINE rule. There is no lightweight "it's just one spider" screen.
 */
export default function WoodcuttingScene({ period }: { period: TimeOfDayId }) {
  const [version, setVersion] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [active, setActive] = useState<TreeDef | null>(null);
  const [ambush, setAmbush] = useState<{
    tree: TreeDef;
    perfect: boolean;
    encounter: ReturnType<typeof buildSoloEncounter>;
    battleKey: number;
  } | null>(null);

  const storedHero = readStoredHeroClass();
  const heroLevel = getInventory().level;
  const state = getWoodcuttingState();
  const grade = FOREST_GRADE[period];
  const night = isNightPeriod(period);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  function begin(tree: TreeDef) {
    const blocked = canChop(tree);
    if (blocked) return flash(blocked);
    setActive(tree);
  }

  function onFelled(tree: TreeDef, perfect: boolean) {
    setActive(null);
    consumeFell(tree.id);
    setVersion((v) => v + 1);

    // Rolled once per felled tree — the axe blows are what wake whatever nests in the branches.
    const monster = treeGuardian(tree);
    if (monster && storedHero && Math.random() < AMBUSH_CHANCE) {
      setAmbush({
        tree,
        perfect,
        encounter: buildSoloEncounter(monster.id, { background: FOREST_BACKGROUND, label: monster.name }),
        battleKey: Date.now(),
      });
      return;
    }
    bank(tree, perfect);
  }

  function bank(tree: TreeDef, perfect: boolean) {
    const out = grantWood(tree, perfect);
    const spoils = out.granted
      .map((g) => `+${g.amount} ${MATERIAL_BY_ID[g.materialId]?.name ?? g.materialId}`)
      .join(" · ");
    flash(
      out.granted.length === 0
        ? `L'arbre tombe, mais rien d'exploitable. +${out.xp} XP`
        : `${perfect ? "Coupe parfaite ! " : ""}${spoils} · +${out.xp} XP`
    );
    setVersion((v) => v + 1);
  }

  void version; // re-read the localStorage-backed tree/axe state after each action

  return (
    <div className="relative h-full w-full">
      <PanelStage
        background={FOREST_BACKGROUND}
        grade={grade}
        lights={FOREST_LIGHTS}
        night={night}
        ambience={<ForestAmbience night={night} />}
      >
        {TREES.map((tree) => {
          const locked = heroLevel < tree.levelRequired;
          const regrowing = getTreeState(tree.id, Date.now()).cutAt !== 0;
          const live = !locked && !regrowing;
          return (
            <button
              key={tree.id}
              type="button"
              onClick={() => begin(tree)}
              aria-label={tree.name}
              className="absolute flex flex-col items-center"
              style={{ left: `${tree.x}%`, top: `${tree.y}%`, transform: "translate(-50%, -100%)" }}
            >
              <motion.img
                src={treeSprite(tree.tier)}
                alt=""
                className="h-14 w-14 object-contain"
                style={{
                  imageRendering: "pixelated",
                  opacity: locked || regrowing ? 0.35 : 1,
                  filter: live ? `drop-shadow(0 0 8px ${tree.accent}88)` : "grayscale(0.6)",
                }}
                animate={live ? { rotate: [-1.5, 1.5, -1.5] } : {}}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <span
                className="mt-0.5 whitespace-nowrap rounded-full bg-black/70 px-1.5 py-0.5 text-[8px] font-bold backdrop-blur-sm"
                style={{ color: locked || regrowing ? "rgba(255,255,255,0.4)" : tree.accent }}
              >
                {locked ? `Niv. ${tree.levelRequired}` : regrowing ? "repousse…" : tree.name}
              </span>
            </button>
          );
        })}
      </PanelStage>

      {/* HUD — top right, off the scene's ground line so it never covers a tree. */}
      <div className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] w-40 rounded-2xl border border-white/10 bg-black/60 p-2.5 backdrop-blur-md">
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">Hache</p>
        <div className="mt-1 flex items-center justify-between text-[10px] text-white/60">
          <span>Durabilité</span>
          <span className={state.axeDurability <= 0 ? "text-rose-400" : "text-white"}>
            {state.axeDurability}/{AXE_MAX_DURABILITY}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-300"
            style={{ width: `${(state.axeDurability / AXE_MAX_DURABILITY) * 100}%` }}
          />
        </div>
        <button
          type="button"
          disabled={state.axeDurability >= AXE_MAX_DURABILITY}
          onClick={() => {
            if (!repairAxe()) return flash(`Il faut ${AXE_REPAIR_COST} Écus pour affûter.`);
            flash("Hache affûtée.");
            setVersion((v) => v + 1);
          }}
          className="mt-2 w-full rounded-lg border border-emerald-400/40 bg-emerald-950/40 px-2 py-1 text-[10px] font-bold text-emerald-300 disabled:border-white/10 disabled:bg-black/40 disabled:text-white/25"
        >
          Affûter · {AXE_REPAIR_COST} Écus
        </button>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="absolute bottom-32 left-1/2 z-20 max-w-[85%] -translate-x-1/2 rounded-xl border border-white/15 bg-black/85 px-4 py-2 text-center text-[11px] font-semibold text-white backdrop-blur-md"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {active && (
          <ChopMinigame
            tree={active}
            onCancel={() => setActive(null)}
            onFinish={(r) => onFelled(active, r.perfect)}
          />
        )}
      </AnimatePresence>

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
              bank(a.tree, a.perfect);
            } else {
              flash("Vaincu — vous fuyez la lisière les mains vides.");
              setVersion((v) => v + 1);
            }
          }}
        />
      )}
    </div>
  );
}
