import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LoopSprite from "../camp/LoopSprite";
import {
  SPECIES,
  TIER_LABELS,
  getPen,
  speciesFrames,
  type LivestockTier,
  type SpeciesDef,
} from "../../data/livestock";
import { MONSTER_BY_ID } from "../../data/bestiary";
import { MATERIAL_BY_ID } from "../../data/materials";
import ecuIcon from "../../assets/icons/ecu.png";

/**
 * « Élevage & Faune Domestique » — its own Codex tab, NOT a section inside the Bestiaire.
 *
 * The 15 species are still real `bestiary.json` entries (that is what gives them sprites, idle
 * loops and lore without a second asset table), but they are filtered out of the Bestiaire and
 * presented here instead. Listing them there put a hen and a tortoise on monster cards next to the
 * Skeleton King, badged "Mini-Boss" with a "Production" attack — which read as a bug, not a
 * catalogue. A husbandry sheet wants entirely different fields anyway: diet, production cycle,
 * gestation, and what it costs, none of which a combat card has room for.
 */

const TIER_ACCENT: Record<LivestockTier, { ring: string; text: string; chip: string }> = {
  1: { ring: "border-emerald-400/30", text: "text-emerald-300", chip: "bg-emerald-400/15" },
  2: { ring: "border-sky-400/30", text: "text-sky-300", chip: "bg-sky-400/15" },
  3: { ring: "border-violet-400/30", text: "text-violet-300", chip: "bg-violet-400/15" },
};

function minutes(ms: number): string {
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.round(m / 60)} h` : `${m} min`;
}

export default function LivestockCompendium() {
  const [filter, setFilter] = useState<LivestockTier | "all">("all");
  const [selected, setSelected] = useState<SpeciesDef | null>(null);

  const pen = getPen();
  const ownedCount = (id: string) => pen.animals.filter((a) => a.speciesId === id).length;

  const shown = filter === "all" ? SPECIES : SPECIES.filter((s) => s.tier === filter);
  const filters: { id: LivestockTier | "all"; label: string }[] = [
    { id: "all", label: `Tous (${SPECIES.length})` },
    ...([1, 2, 3] as LivestockTier[]).map((t) => ({
      id: t,
      label: `${TIER_LABELS[t]} (${SPECIES.filter((s) => s.tier === t).length})`,
    })),
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap justify-center gap-2">
        {filters.map((f) => (
          <button
            key={String(f.id)}
            type="button"
            onClick={() => setFilter(f.id)}
            className={
              "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors " +
              (filter === f.id
                ? "border-lantern/60 bg-lantern/20 text-lantern-glow"
                : "border-white/15 bg-white/[0.04] text-white/55 hover:text-white/85")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((s) => {
          const owned = ownedCount(s.id);
          const accent = TIER_ACCENT[s.tier];
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s)}
              className={
                "flex flex-col items-center rounded-2xl border bg-white/[0.04] p-3 text-center backdrop-blur-sm transition-colors hover:bg-white/[0.07] " +
                accent.ring
              }
            >
              <span className={"mb-2 rounded-full px-2 py-0.5 text-[9px] font-bold " + accent.chip + " " + accent.text}>
                {TIER_LABELS[s.tier]}
              </span>
              <span className="flex h-16 items-end justify-center">
                <LoopSprite
                  frames={speciesFrames(s.id)}
                  frameDuration={220}
                  alt={s.name}
                  className="h-16 w-16"
                  style={{ filter: "drop-shadow(0 4px 5px rgba(0,0,0,0.5))" }}
                />
              </span>
              <p className="mt-1.5 text-[11px] font-bold leading-tight text-white">{s.name}</p>
              <p className="mt-0.5 text-[9px] text-white/45">{s.feedName}</p>
              <span
                className={
                  "mt-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold " +
                  (owned > 0 ? "bg-emerald-400/15 text-emerald-300" : "bg-white/5 text-white/35")
                }
              >
                {owned > 0 ? `${owned} au domaine` : "Non acquis"}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected && <SpeciesSheet species={selected} owned={ownedCount(selected.id)} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}

function SpeciesSheet({ species, owned, onClose }: { species: SpeciesDef; owned: number; onClose: () => void }) {
  const accent = TIER_ACCENT[species.tier];
  const lore = MONSTER_BY_ID[species.id]?.lore ?? "";

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={"max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl border bg-[#0d1220] p-5 " + accent.ring}
        initial={{ scale: 0.94, y: 14 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 14 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={"rounded-full px-2 py-0.5 text-[9px] font-bold " + accent.chip + " " + accent.text}>
              {TIER_LABELS[species.tier]}
            </span>
            <h3 className="mt-1.5 text-lg font-bold text-white">{species.name}</h3>
            <p className="text-[10px] text-white/45">Niveau {species.levelRequired} requis</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-xs font-bold text-white/70"
          >
            ✕
          </button>
        </div>

        <div className="my-4 flex justify-center">
          <LoopSprite
            frames={speciesFrames(species.id)}
            frameDuration={220}
            alt={species.name}
            className="h-28 w-28"
            style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.6))" }}
          />
        </div>

        {lore && <p className="mb-4 text-center text-[11px] italic leading-relaxed text-white/60">{lore}</p>}

        <dl className="space-y-2 text-[11px]">
          <Row label="Régime alimentaire">
            <span className="flex items-center gap-1.5">
              <img
                src={MATERIAL_BY_ID[species.feedId]?.icon || ""}
                alt=""
                className="h-4 w-4 object-contain"
                style={{ imageRendering: "pixelated" }}
              />
              {species.feedName}
              <span className="text-white/40">· {species.feedPerCycle}/cycle</span>
            </span>
          </Row>
          <Row label="Production">
            <span className="flex flex-col gap-1">
              {species.products.map((p) => (
                <span key={p.materialId} className="flex items-center gap-1.5">
                  <img
                    src={MATERIAL_BY_ID[p.materialId]?.icon || ""}
                    alt=""
                    className="h-4 w-4 object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                  {p.name} ×{p.qty}
                  <span className="text-white/40">{p.chance < 100 ? `· ${p.chance}%` : ""}</span>
                </span>
              ))}
            </span>
          </Row>
          <Row label="Cycle de production">{minutes(species.cycleMs)}</Row>
          <Row label="Durée de gestation">{minutes(species.gestationMs)}</Row>
          <Row label="Croissance d'un petit">{species.growthHarvests} récoltes</Row>
          <Row label="Prix d'acquisition">
            <span className="flex items-center gap-1 font-bold text-lantern-glow">
              <img src={ecuIcon} alt="" className="h-4 w-4" style={{ imageRendering: "pixelated" }} />
              {species.cost.toLocaleString("fr-FR")}
            </span>
          </Row>
          <Row label="Au domaine">
            <span className={owned > 0 ? "font-bold text-emerald-300" : "text-white/40"}>
              {owned > 0 ? `${owned} bête${owned > 1 ? "s" : ""}` : "Aucune"}
            </span>
          </Row>
        </dl>
      </motion.div>
    </motion.div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] pb-2">
      <dt className="shrink-0 text-white/45">{label}</dt>
      <dd className="text-right text-white/85">{children}</dd>
    </div>
  );
}
