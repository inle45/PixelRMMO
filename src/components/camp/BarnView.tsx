import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  SPECIES_BY_ID,
  collectProduct,
  feedAnimal,
  getPen,
  isReady,
  msUntilReady,
  formatCountdown,
  type AnimalInstance,
} from "../../data/livestock";
import { BARN_BACKGROUND, BARN_GRADE, BARN_LIGHTS, isNightPeriod } from "../../data/campPanels";
import type { TimeOfDayId } from "../../hooks/useTimeOfDay";
import { mulberry32 } from "../../data/seededRandom";
import PanelStage from "./PanelStage";
import BarnAmbience from "./BarnAmbience";
import PenAnimal from "./PenAnimal";
import BarnManagePanel from "./BarnManagePanel";

/**
 * Le Domaine d'Élevage — the camp's right-hand panel.
 *
 * The pasture band (`PASTURE`) is where the artwork actually paints open fenced grass, measured off
 * `barn_pasture_day_bg.png` rather than guessed — the same discipline the Cité's crowd placement
 * needed after its first pass put a guard in the water. Animals are laid out across that band by a
 * seeded PRNG keyed on the animal's own uid, so a given animal keeps its patch of field across
 * re-renders and reloads instead of teleporting every time the component re-renders.
 *
 * The screen re-ticks once a second because production countdowns are live; every animal's ready /
 * hungry state is derived from the stored timestamps on each tick rather than held in React state,
 * so nothing can drift out of sync with what `livestock.ts` actually persisted.
 */

/**
 * Open grass on the backdrop, in scene-box percentages.
 *
 * The x range is deliberately narrow. The scene box is sized `max(100cqw, 95cqh)`, so on the
 * portrait phone this is designed for it is ~1.4x the viewport wide and the outer ~15% of each side
 * is cropped off-screen — the first pass used x 10-88% and simply put animals where the player
 * could never see them. Anything interactive belongs in x 28-72%. Vertically the barn's roof
 * occupies the upper left, so nothing goes above y 70% or it stands on the tiles.
 */
const PASTURE = { x0: 30, x1: 70, y0: 72, y1: 90 };

export default function BarnView({ period }: { period: TimeOfDayId }) {
  const [version, setVersion] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const grade = BARN_GRADE[period];
  const night = isNightPeriod(period);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const state = getPen(now);
  void version;

  // Layout is derived from each animal's uid, so it is stable for that animal and unique between
  // animals — no stored coordinates, and no reshuffle on re-render.
  const placed = useMemo(
    () =>
      state.animals.map((a, i) => {
        const seed = Array.from(a.uid).reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 7);
        const rand = mulberry32(seed);
        return {
          animal: a,
          homeX: PASTURE.x0 + rand() * (PASTURE.x1 - PASTURE.x0),
          y: PASTURE.y0 + rand() * (PASTURE.y1 - PASTURE.y0),
          range: 4 + rand() * 7,
          duration: 11 + rand() * 10,
          delay: -rand() * 12,
          z: i,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.animals.length, version]
  );

  function tapAnimal(animal: AnimalInstance) {
    const species = SPECIES_BY_ID[animal.speciesId];
    if (!species) return;

    if (isReady(animal, Date.now())) {
      const out = collectProduct(animal.uid);
      if (!out) return;
      const spoils = out.granted.map((g) => `+${g.amount} ${g.name}`).join(" · ");
      flash(
        (out.granted.length ? spoils : "Rien à récolter cette fois.") +
          (out.grewUp ? ` · ${species.name} est adulte !` : "")
      );
      setVersion((v) => v + 1);
      return;
    }

    if (animal.fedAt === 0) {
      if (!feedAnimal(animal.uid)) {
        return flash(`Mangeoire vide — remplissez-la en ${species.feedName}.`);
      }
      flash(`${species.name} nourri·e — récolte dans ${formatCountdown(species.cycleMs)}.`);
      setVersion((v) => v + 1);
      return;
    }

    flash(`${species.name} — prêt dans ${formatCountdown(msUntilReady(animal, Date.now()))}.`);
  }

  const readyCount = state.animals.filter((a) => isReady(a, now)).length;
  const hungryCount = state.animals.filter((a) => a.fedAt === 0).length;

  return (
    <div className="relative h-full w-full">
      <PanelStage
        background={BARN_BACKGROUND}
        grade={grade}
        lights={BARN_LIGHTS}
        night={night}
        ambience={<BarnAmbience night={night} />}
      >
        {placed.map((p) => {
          const species = SPECIES_BY_ID[p.animal.speciesId];
          if (!species) return null;
          return (
            <PenAnimal
              key={p.animal.uid}
              animal={p.animal}
              species={species}
              homeX={p.homeX}
              y={p.y}
              range={p.range}
              duration={p.duration}
              delay={p.delay}
              resting={night}
              ready={isReady(p.animal, now)}
              hungry={p.animal.fedAt === 0}
              onClick={() => tapAnimal(p.animal)}
            />
          );
        })}
      </PanelStage>

      {state.animals.length === 0 && (
        <p
          className="pointer-events-none absolute inset-x-0 bottom-32 px-8 text-center text-xs italic text-white/75"
          style={{ textShadow: "0 2px 6px rgba(0,0,0,0.95)" }}
        >
          Les enclos sont vides. Ouvrez la grange pour acquérir vos premières bêtes.
        </p>
      )}

      {/* HUD — top right, mirroring the forest panel's axe card. */}
      <div className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] w-40 rounded-2xl border border-white/10 bg-black/60 p-2.5 backdrop-blur-md">
        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-300">Domaine</p>
        <p className="mt-1 text-[10px] text-white/55">
          {state.animals.length} bête{state.animals.length > 1 ? "s" : ""}
          {readyCount > 0 && <span className="text-emerald-300"> · {readyCount} prête·s</span>}
          {hungryCount > 0 && <span className="text-amber-300"> · {hungryCount} à nourrir</span>}
        </p>
        {state.gestations.length > 0 && (
          <p className="mt-0.5 text-[9px] text-rose-300">{state.gestations.length} gestation en cours</p>
        )}
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="mt-2 w-full rounded-lg border border-amber-400/40 bg-amber-950/40 px-2 py-1 text-[10px] font-bold text-amber-300"
        >
          Ouvrir la Grange
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
        {panelOpen && (
          <BarnManagePanel
            onClose={() => setPanelOpen(false)}
            onChanged={() => setVersion((v) => v + 1)}
            flash={flash}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
