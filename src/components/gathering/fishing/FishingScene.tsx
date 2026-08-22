import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  FISHING_SPOTS,
  LAKE_BACKGROUND,
  LAKE_ASPECT,
  ROD_MAX_DURABILITY,
  ROD_REPAIR_COST,
  AMBUSH_CHANCE,
  getFishingState,
  whyCannotCast,
  consumeBait,
  breakLine,
  repairRod,
  grantCatch,
  spotGuardian,
  baitCount,
  isNight,
  bobberIcon,
  type FishingSpotDef,
} from "../../../data/fishing";
import { getInventory } from "../../../data/inventory";
import { MATERIAL_BY_ID } from "../../../data/materials";
import { readStoredHeroClass } from "../../../data/storedHero";
import { buildSoloEncounter } from "../../../data/waves";
import lakeArenaBg from "../../../assets/dungeon/lake-arena-bg.png";
import TurnBattleArena from "../../dungeon/TurnBattleArena";
import LakeAmbience from "./LakeAmbience";
import CastSequence from "./CastSequence";
import TensionGauge from "./TensionGauge";

interface FishingSceneProps {
  onClose: () => void;
}

const SCENE_BOX: CSSProperties = { height: "100cqh", aspectRatio: `${LAKE_ASPECT}` };

const REFUSAL_TEXT: Record<string, string> = {
  level: "Niveau insuffisant pour ce spot.",
  rod: "Canne cassée — répare-la avant de relancer.",
  bait: "Aucun appât adapté dans le sac.",
  night: "Ce spot ne mord qu'entre 21h et 06h.",
};

/**
 * Le Bassin du Cratère.
 *
 * Deliberately the same shell as `MushroomCaveScene` — portrait backdrop filling the viewport, spot
 * pins measured against the artwork's own features, a HUD in the corner, and ambushes that mount
 * the SHARED `TurnBattleArena` with an `EncounterDef` rather than any bespoke fight screen.
 */
export default function FishingScene({ onClose }: FishingSceneProps) {
  const reduceMotion = useReducedMotion();
  const [version, setVersion] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [casting, setCasting] = useState<FishingSpotDef | null>(null);
  const [fighting, setFighting] = useState<FishingSpotDef | null>(null);
  const [ambush, setAmbush] = useState<{
    spot: FishingSpotDef;
    encounter: ReturnType<typeof buildSoloEncounter>;
    battleKey: number;
  } | null>(null);

  const storedHero = readStoredHeroClass();
  const heroLevel = getInventory().level;
  const state = getFishingState();
  const night = isNight(now);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);

  // One clock for the whole screen: it drives the night/day gate and the night-only spot's pin, so
  // a spot opening at 21h lights up without a reload.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20_000);
    return () => clearInterval(id);
  }, []);

  function beginCast(spot: FishingSpotDef) {
    const refusal = whyCannotCast(spot, new Date());
    if (refusal) return flash(REFUSAL_TEXT[refusal]);
    // The bait is spent the instant the line goes out. Everything after this point can fail and
    // the bait is still gone — that is the zone's entire cost model.
    if (!consumeBait(spot)) return flash("Aucun appât adapté dans le sac.");
    setVersion((v) => v + 1);
    setCasting(spot);
  }

  function onStrikeResolved(spot: FishingSpotDef, struck: boolean) {
    setCasting(null);
    if (!struck) {
      flash("Raté — la prise décroche et l'appât est perdu.");
      setVersion((v) => v + 1);
      return;
    }
    // The ambush is rolled between the strike and the fight, so a guardian replaces the catch
    // entirely rather than arriving after the reward is already banked.
    const monster = spotGuardian(spot);
    if (monster && storedHero && Math.random() < AMBUSH_CHANCE) {
      setAmbush({
        spot,
        encounter: buildSoloEncounter(monster.id, { background: lakeArenaBg, label: monster.name }),
        battleKey: Date.now(),
      });
      return;
    }
    setFighting(spot);
  }

  function onFightResolved(spot: FishingSpotDef, landed: boolean, perfect: boolean) {
    setFighting(null);
    if (!landed) {
      breakLine();
      flash("Ligne brisée ! Appât perdu, canne endommagée.");
      setVersion((v) => v + 1);
      return;
    }
    const out = grantCatch(spot, perfect);
    const spoils = out.granted
      .map((g) => `+${g.amount} ${MATERIAL_BY_ID[g.materialId]?.name ?? g.materialId}`)
      .join(" · ");
    flash(
      out.granted.length === 0
        ? `Ferrage réussi, mais rien au bout. +${out.xp} XP`
        : `${perfect ? "Prise parfaite ! " : ""}${spoils} · +${out.xp} XP`
    );
    setVersion((v) => v + 1);
  }

  void version; // re-read localStorage-backed rod/bait state after each action

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-[#040d14]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative h-full w-full overflow-hidden" style={{ containerType: "size", imageRendering: "pixelated" }}>
        <img src={LAKE_BACKGROUND} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" />

        <div className="absolute left-1/2 top-0 -translate-x-1/2" style={SCENE_BOX}>
          <img src={LAKE_BACKGROUND} alt="" className="absolute inset-0 h-full w-full" style={{ imageRendering: "pixelated" }} draggable={false} />

          {/* Night wash. CSS grading over one backdrop rather than a second generated image — the
              rule the Cité's rebuild settled on and this scene inherits. */}
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
            style={{
              background: "linear-gradient(180deg, rgba(10,20,60,0.55), rgba(4,10,32,0.65))",
              opacity: night ? 1 : 0,
            }}
          />

          <LakeAmbience night={night} />

          {FISHING_SPOTS.map((spot) => {
            const refusal = whyCannotCast(spot, now);
            const locked = heroLevel < spot.levelRequired;
            const baits = baitCount(spot.baitId);
            const live = !refusal && !reduceMotion;
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => beginCast(spot)}
                aria-label={spot.name}
                className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              >
                {/* A castable spot is a floating bobber trailing rings, not a pulsing circle: the
                    flat ring read as a UI hotspot pasted on a photo rather than as something
                    sitting in the water. A blocked spot goes still and dim on purpose — the
                    difference between "you can fish here" and "you can't" should be visible at a
                    glance without reading the label. */}
                <span className="relative flex h-11 w-11 items-center justify-center">
                  {live &&
                    [0, 1].map((i) => (
                      <motion.span
                        key={i}
                        className="absolute rounded-full border-2"
                        style={{ borderColor: spot.accent }}
                        initial={{ width: 12, height: 7, opacity: 0 }}
                        animate={{ width: 52, height: 30, opacity: [0, 0.75, 0] }}
                        transition={{ duration: 2.8, delay: i * 1.4, repeat: Infinity, ease: "easeOut" }}
                      />
                    ))}
                  <motion.span
                    className="absolute h-8 w-8 rounded-full blur-md"
                    style={{ backgroundColor: `${spot.accent}66`, opacity: locked ? 0.15 : 1 }}
                    animate={live ? { opacity: [0.35, 0.85, 0.35], scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.img
                    src={bobberIcon}
                    alt=""
                    className="relative h-7 w-7 object-contain"
                    style={{
                      imageRendering: "pixelated",
                      opacity: locked ? 0.4 : 1,
                      filter: `drop-shadow(0 3px 5px rgba(0,0,0,0.6)) drop-shadow(0 0 6px ${spot.accent})`,
                    }}
                    animate={live ? { y: [0, -3.5, 0], rotate: [-5, 5, -5] } : {}}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                </span>
                <span
                  className="mt-0.5 whitespace-nowrap rounded-full bg-black/65 px-2 py-0.5 text-[9px] font-bold backdrop-blur-sm"
                  style={{ color: locked ? "rgba(255,255,255,0.4)" : spot.accent }}
                >
                  {locked ? `Niv. ${spot.levelRequired}` : `${spot.name} · ${baits} appât${baits > 1 ? "s" : ""}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* ---- HUD ---- */}
        <div className="absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top))] w-44 rounded-2xl border border-white/10 bg-black/60 p-3 backdrop-blur-md">
          <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-300">Bassin du Cratère</p>
          <div className="mt-2 flex items-center justify-between text-[10px] text-white/60">
            <span>Canne</span>
            <span className={state.rodDurability <= 0 ? "text-rose-400" : "text-white"}>
              {state.rodDurability}/{ROD_MAX_DURABILITY}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300"
              style={{ width: `${(state.rodDurability / ROD_MAX_DURABILITY) * 100}%` }}
            />
          </div>
          <button
            type="button"
            disabled={state.rodDurability >= ROD_MAX_DURABILITY}
            onClick={() => {
              if (!repairRod()) return flash(`Il faut ${ROD_REPAIR_COST} Écus pour réparer.`);
              flash("Canne réparée.");
              setVersion((v) => v + 1);
            }}
            className="mt-2 w-full rounded-lg border border-cyan-400/40 bg-cyan-950/40 px-2 py-1 text-[10px] font-bold text-cyan-300 disabled:border-white/10 disabled:bg-black/40 disabled:text-white/25"
          >
            Réparer · {ROD_REPAIR_COST} Écus
          </button>
          <p className="mt-2 text-[9px] leading-snug text-white/40">
            {night ? "Nuit — le Cœur Brumeux mord." : "Jour — la brume dort jusqu'à 21h."}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] rounded-full border border-white/15 bg-black/60 px-3 py-2 text-[11px] font-bold text-white/80 backdrop-blur-md hover:bg-black/80"
        >
          Quitter le bassin
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
        {casting && (
          <CastSequence
            spot={casting}
            onCancel={() => setCasting(null)}
            onFinish={(r) => onStrikeResolved(casting, r.struck)}
          />
        )}
        {fighting && (
          <TensionGauge
            spot={fighting}
            onCancel={() => onFightResolved(fighting, false, false)}
            onFinish={(r) => onFightResolved(fighting, r.landed, r.perfect)}
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
                // Winning banks the guardian's own bestiary drops (already applied by the arena)
                // and hands the interrupted catch back as a landed, non-perfect one.
                onFightResolved(a.spot, true, false);
              } else {
                breakLine();
                flash("Vaincu — la ligne cède et la prise s'échappe.");
                setVersion((v) => v + 1);
              }
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
