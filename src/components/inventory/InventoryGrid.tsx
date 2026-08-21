import { useMemo, useState } from "react";
import type { EquipmentItemDef } from "../../data/equipment";
import { getFilterIcon } from "../../data/equipment";
import type { MaterialDef } from "../../data/materials";
import type { BattleItem } from "../../data/items";
import { RARITY_BY_ID, type RarityId } from "../../data/rarity";
import RarityFrame from "../codex/RarityFrame";

export type InventoryEntryKind = "equipment" | "material" | "consumable";

export interface InventoryEntry {
  kind: InventoryEntryKind;
  id: string;
  name: string;
  icon: string;
  rarity: RarityId;
  count: number;
  equipment?: EquipmentItemDef;
  material?: MaterialDef;
  consumable?: BattleItem;
  /** Equipment only — true when the hero's class can't equip this piece (e.g. Archer + sword). */
  locked?: boolean;
  /** Not yet opened in the details modal at least once. */
  isNew?: boolean;
}

type FilterId = "all" | "equipment" | "materials" | "potions" | "relics";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "equipment", label: "Équipements" },
  { id: "materials", label: "Matériaux" },
  { id: "potions", label: "Potions" },
  { id: "relics", label: "Reliques" },
];

const GRID_SIZE = 30;

function matchesFilter(entry: InventoryEntry, filter: FilterId): boolean {
  switch (filter) {
    case "all":
      return true;
    case "equipment":
      return entry.kind === "equipment";
    case "potions":
      return entry.kind === "consumable";
    case "relics":
      return entry.kind === "material" && entry.material?.category === "reliques";
    case "materials":
      return entry.kind === "material" && entry.material?.category !== "reliques";
  }
}

interface InventoryGridProps {
  entries: InventoryEntry[];
  onSelect: (entry: InventoryEntry) => void;
}

export default function InventoryGrid({ entries, onSelect }: InventoryGridProps) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [sortByRarity, setSortByRarity] = useState(false);

  const visible = useMemo(() => {
    const filtered = entries.filter((e) => matchesFilter(e, filter));
    if (!sortByRarity) return filtered;
    return [...filtered].sort((a, b) => RARITY_BY_ID[b.rarity].tier - RARITY_BY_ID[a.rarity].tier);
  }, [entries, filter, sortByRarity]);

  const slots: (InventoryEntry | null)[] = [...visible];
  while (slots.length < GRID_SIZE) slots.push(null);

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-white/60">Sac à Dos</h3>
        <button
          type="button"
          onClick={() => setSortByRarity((s) => !s)}
          aria-pressed={sortByRarity}
          className={
            "rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors " +
            (sortByRarity
              ? "border-lantern/50 bg-lantern/15 text-lantern-glow"
              : "border-white/10 bg-black/25 text-white/55 hover:border-white/25")
          }
        >
          Trier par rareté ↓
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = f.id === filter;
          const icon = getFilterIcon(f.id);
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={active}
              className={
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors " +
                (active
                  ? "border-lantern/50 bg-lantern/15 text-lantern-glow"
                  : "border-white/10 bg-black/25 text-white/55 hover:border-white/25")
              }
            >
              {icon && <img src={icon} alt="" className="h-3.5 w-3.5" style={{ imageRendering: "pixelated" }} />}
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid max-h-[420px] grid-cols-5 gap-2 overflow-y-auto pr-0.5">
        {slots.map((entry, i) =>
          entry ? (
            <RarityFrame key={`${entry.kind}-${entry.id}`} rarity={entry.rarity} radius="rounded-lg" onClick={() => onSelect(entry)}>
              <div
                className={
                  "relative flex aspect-square w-full items-center justify-center rounded-lg bg-black/30 p-1.5 " +
                  (entry.locked ? "opacity-45" : "")
                }
              >
                <img src={entry.icon} alt={entry.name} className="h-full w-full object-contain" style={{ imageRendering: "pixelated" }} />
                {entry.count > 1 && (
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[9px] font-bold text-white">
                    x{entry.count}
                  </span>
                )}
                {entry.isNew && !entry.locked && (
                  <span className="absolute -left-1 -top-1 rounded-full bg-emerald-500 px-1 text-[8px] font-bold text-black shadow-[0_0_6px_rgba(52,211,153,0.7)]">
                    NEW
                  </span>
                )}
                {entry.locked && (
                  <svg viewBox="0 0 24 24" className="absolute h-4 w-4 text-white/80" fill="currentColor">
                    <path d="M12 2a4 4 0 0 0-4 4v3H7a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-1V6a4 4 0 0 0-4-4Zm0 2a2 2 0 0 1 2 2v3h-4V6a2 2 0 0 1 2-2Z" />
                  </svg>
                )}
              </div>
            </RarityFrame>
          ) : (
            <div key={`empty-${i}`} className="aspect-square w-full rounded-lg border border-white/5 bg-black/10" />
          )
        )}
      </div>
    </div>
  );
}
