import { useState } from "react";
import { motion } from "framer-motion";
import { CLASSES, type ClassId, type Gender } from "../../data/classes";
import { useStorageStore } from "../../hooks/useStorageStore";
import type { InventoryEntry, InventoryEntryKind } from "../inventory/InventoryGrid";
import StorageGrid from "./StorageGrid";
import backpackIcon from "../../assets/icons/dungeon/backpack.png";

const HERO_STORAGE_KEY = "pixelrmmo:hero";

interface StoredHero {
  classId: ClassId;
  gender: Gender;
}

function readStoredHero(): StoredHero | null {
  try {
    const raw = localStorage.getItem(HERO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredHero;
    return parsed?.classId && parsed?.gender ? parsed : null;
  } catch {
    return null;
  }
}

type FilterId = "all" | InventoryEntryKind;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "equipment", label: "Équipement" },
  { id: "material", label: "Matériaux" },
  { id: "consumable", label: "Consommables" },
];

function matchesFilter(entry: InventoryEntry, filter: FilterId): boolean {
  return filter === "all" || entry.kind === filter;
}

interface StorageModalProps {
  onClose: () => void;
  /** The chest is one single shared container reachable from two physical locations (the Camp
   * tent-side chest, and the Cité's Auberge du Sanglier Doré) — same data, different framing, so the
   * title is the only thing that changes between call sites rather than forking the component. */
  title?: string;
}

/**
 * The dual-volet storage screen opened once the camp chest finishes its opening animation: the
 * player's bag on the left, the chest's own 30-slot hold on the right, one item stack (click or
 * drag) at a time between them.
 */
export default function StorageModal({ onClose, title = "Coffre du Campement" }: StorageModalProps) {
  const hero = readStoredHero();
  const classId = hero?.classId ?? "knight";
  const classDef = CLASSES.find((c) => c.id === classId);

  const { bagEntries, chestEntries, moveToChest, moveToBag, depositAll } = useStorageStore(classId);
  const [filter, setFilter] = useState<FilterId>("all");

  const visibleBag = bagEntries.filter((e) => matchesFilter(e, filter));
  const visibleChest = chestEntries.filter((e) => matchesFilter(e, filter));

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/75 p-4 py-8 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-2xl bg-[#12111a]/95 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={backpackIcon} alt="" className="h-7 w-7" style={{ imageRendering: "pixelated" }} />
            <div>
              <h2 className="text-sm font-bold text-white">{title}</h2>
              {classDef && <p className="text-[10px] text-white/45">{classDef.names[hero?.gender ?? "male"]}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-sm text-white/80 backdrop-blur transition-colors hover:bg-black/60 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const active = f.id === filter;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={active}
                  className={
                    "rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors " +
                    (active
                      ? "border-lantern/50 bg-lantern/15 text-lantern-glow"
                      : "border-white/10 bg-black/25 text-white/55 hover:border-white/25")
                  }
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={depositAll}
            className="rounded-full border border-emerald-400/40 bg-emerald-950/30 px-2.5 py-1 text-[10px] font-bold text-emerald-300 transition-colors hover:bg-emerald-950/50"
          >
            Déposer tous les matériaux
          </button>
        </div>

        <p className="mt-2 text-center text-[10px] text-white/40">Touchez ou glissez un objet vers l'autre volet pour le transférer.</p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <h3 className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-white/55">Sacoche</h3>
            <div className="max-h-[360px] overflow-y-auto rounded-xl border border-white/10 bg-white/[0.04] p-2">
              <StorageGrid
                side="bag"
                entries={visibleBag}
                onTransfer={(entry) => moveToChest(entry.kind, entry.id, entry.count)}
                onDropFromOtherSide={(ref) => {
                  const source = chestEntries.find((e) => e.kind === ref.kind && e.id === ref.id);
                  if (source) moveToBag(source.kind, source.id, source.count);
                }}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-white/55">Coffre Partagé</h3>
            <div className="max-h-[360px] overflow-y-auto rounded-xl border border-white/10 bg-white/[0.04] p-2">
              <StorageGrid
                side="chest"
                entries={visibleChest}
                onTransfer={(entry) => moveToBag(entry.kind, entry.id, entry.count)}
                onDropFromOtherSide={(ref) => {
                  const source = bagEntries.find((e) => e.kind === ref.kind && e.id === ref.id);
                  if (source) moveToChest(source.kind, source.id, source.count);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
