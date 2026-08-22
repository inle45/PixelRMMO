import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SPECIES,
  SPECIES_BY_ID,
  PEN_CAPACITY,
  TROUGH_CAPACITY,
  BREEDING_FEED_COST,
  TIER_LABELS,
  adultsOf,
  animalsOfTier,
  breedBlocker,
  buyAnimal,
  fillTrough,
  getPen,
  msUntilBirth,
  speciesSprite,
  startBreeding,
  formatCountdown,
  type LivestockTier,
} from "../../data/livestock";
import { getInventory } from "../../data/inventory";
import { MATERIAL_BY_ID } from "../../data/materials";
import ecuIcon from "../../assets/icons/ecu.png";

const BLOCKER_LABEL: Record<string, string> = {
  adults: "Il faut 2 adultes de cette espèce.",
  trough: "Mangeoire pas encore pleine.",
  capacity: "Enclos plein.",
  busy: "Gestation déjà en cours.",
};

interface BarnManagePanelProps {
  onClose: () => void;
  onChanged: () => void;
  flash: (msg: string) => void;
}

/**
 * La Grange — buying stock, filling troughs and starting a gestation.
 *
 * Kept out of the scene itself: tapping an animal in the pasture feeds or collects it (the fast,
 * frequent actions), while everything that needs numbers and a confirmation lives here. That split
 * is what lets the pasture stay a *scene* rather than becoming a form with animals drawn on it.
 */
export default function BarnManagePanel({ onClose, onChanged, flash }: BarnManagePanelProps) {
  const [tier, setTier] = useState<LivestockTier>(1);
  const [version, setVersion] = useState(0);
  // Its own tick: the gestation countdown has to advance on its own, not only when the player
  // happens to press something in here.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const state = getPen(now);
  const inv = getInventory();
  const tierSpecies = SPECIES.filter((s) => s.tier === tier);
  const penCount = animalsOfTier(state, tier).length;

  void version;
  const refresh = () => {
    setVersion((v) => v + 1);
    onChanged();
  };

  return (
    <motion.div
      className="absolute inset-0 z-[60] flex flex-col bg-black/85 backdrop-blur-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-white">La Grange</p>
          <p className="text-[10px] text-white/45">
            {TIER_LABELS[tier]} · {penCount}/{PEN_CAPACITY[tier]} places
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs font-bold text-lantern-glow">
            <img src={ecuIcon} alt="" className="h-4 w-4" style={{ imageRendering: "pixelated" }} />
            {inv.ecus}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-xs font-bold text-white/70"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 px-4 py-2.5">
        {([1, 2, 3] as LivestockTier[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTier(t)}
            className={
              "flex-1 rounded-full border px-2 py-1.5 text-[10px] font-bold transition-colors " +
              (tier === t
                ? "border-lantern/60 bg-lantern/20 text-lantern-glow"
                : "border-white/12 bg-black/40 text-white/50")
            }
          >
            {TIER_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-4 pb-6">
        {tierSpecies.map((s) => {
          const owned = state.animals.filter((a) => a.speciesId === s.id);
          const adults = adultsOf(state, s.id);
          const trough = state.troughs[s.id] ?? 0;
          const feedHeld = inv.materials[s.feedId] ?? 0;
          const blocker = breedBlocker(s.id, now);
          const gestating = state.gestations.some((g) => g.speciesId === s.id);
          const locked = inv.level < s.levelRequired;

          return (
            <div key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-start gap-3">
                <img
                  src={speciesSprite(s.id)}
                  alt=""
                  className="h-12 w-12 shrink-0 object-contain"
                  style={{ imageRendering: "pixelated", borderColor: s.accent }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold" style={{ color: s.accent }}>
                    {s.name}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-white/45">
                    {s.feedName} → {s.products.map((p) => p.name).join(" / ")}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/35">
                    {owned.length} détenu{owned.length > 1 ? "s" : ""} ({adults} adulte{adults > 1 ? "s" : ""})
                    {locked && ` · niveau ${s.levelRequired} requis`}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={locked || penCount >= PEN_CAPACITY[tier] || inv.ecus < s.cost}
                  onClick={() => {
                    if (!buyAnimal(s.id)) return flash("Achat impossible.");
                    flash(`${s.name} rejoint l'enclos.`);
                    refresh();
                  }}
                  className="shrink-0 rounded-lg border border-lantern/40 bg-lantern/15 px-2 py-1.5 text-[10px] font-bold text-lantern-glow disabled:border-white/10 disabled:bg-black/40 disabled:text-white/25"
                >
                  {s.cost} Écus
                </button>
              </div>

              {/* Trough */}
              <div className="mt-2.5 flex items-center gap-2">
                <img
                  src={MATERIAL_BY_ID[s.feedId]?.icon || ""}
                  alt=""
                  className="h-5 w-5 shrink-0 object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/60">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{ width: `${(trough / TROUGH_CAPACITY) * 100}%`, backgroundColor: s.accent }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-[9px] text-white/45">
                  {trough}/{TROUGH_CAPACITY}
                </span>
                <button
                  type="button"
                  disabled={feedHeld === 0 || trough >= TROUGH_CAPACITY}
                  onClick={() => {
                    const moved = fillTrough(s.id, TROUGH_CAPACITY);
                    if (moved === 0) return flash(`Aucun ${s.feedName} en sac.`);
                    flash(`+${moved} ${s.feedName} dans la mangeoire.`);
                    refresh();
                  }}
                  className="shrink-0 rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-[9px] font-bold text-white/70 disabled:text-white/20"
                >
                  Remplir ({feedHeld})
                </button>
              </div>

              {/* Breeding */}
              <button
                type="button"
                disabled={blocker !== null}
                onClick={() => {
                  if (!startBreeding(s.id)) return flash("Reproduction impossible.");
                  flash(`Gestation lancée — ${s.name}.`);
                  refresh();
                }}
                className="mt-2 w-full rounded-lg border border-rose-400/35 bg-rose-950/30 px-2 py-1.5 text-[10px] font-bold text-rose-200 disabled:border-white/10 disabled:bg-black/40 disabled:text-white/30"
              >
                {gestating
                  ? `Gestation — ${formatCountdown(msUntilBirth(s.id, now))}`
                  : blocker
                    ? BLOCKER_LABEL[blocker]
                    : `Lancer la reproduction · ${BREEDING_FEED_COST} ${s.feedName}`}
              </button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export { SPECIES_BY_ID };
