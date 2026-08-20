import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { BESTIARY, FAMILY_LABELS, type MonsterFamily } from "../../data/bestiary";
import MonsterCard from "./MonsterCard";
import MonsterModal from "./MonsterModal";

type FilterId = "all" | MonsterFamily;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "vermin", label: FAMILY_LABELS.vermin },
  { id: "skeleton", label: FAMILY_LABELS.skeleton },
  { id: "spectre", label: FAMILY_LABELS.spectre },
  { id: "guardian", label: FAMILY_LABELS.guardian },
  { id: "boss", label: FAMILY_LABELS.boss },
];

export default function Bestiary() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<FilterId, number> = { all: BESTIARY.length, vermin: 0, skeleton: 0, spectre: 0, guardian: 0, boss: 0 };
    for (const m of BESTIARY) c[m.family]++;
    return c;
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return BESTIARY.filter((m) => {
      const matchesFamily = filter === "all" || m.family === filter;
      const matchesSearch = !q || m.name.toLowerCase().includes(q) || m.lore.toLowerCase().includes(q);
      return matchesFamily && matchesSearch;
    });
  }, [search, filter]);

  const selected = selectedId ? BESTIARY.find((m) => m.id === selectedId) ?? null : null;

  return (
    <div className="w-full max-w-5xl">
      <div className="flex flex-col items-center gap-2 pb-6 text-center">
        <span className="text-[10px] uppercase tracking-[0.3em] text-lantern-glow/80" style={{ fontFamily: "var(--font-pixel)" }}>
          Crypte Ancestrale
        </span>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">📖 Bestiaire des Créatures</h1>
        <p className="max-w-md text-sm text-white/55">
          {BESTIARY.length} créatures répertoriées dans le grimoire. Étudie-les avant de descendre.
        </p>
      </div>

      <div className="mx-auto mb-4 max-w-md">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une créature..."
          className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/35 backdrop-blur-2xl outline-none transition-colors focus:border-lantern/50"
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors " +
                (active
                  ? "border-lantern/50 bg-lantern/15 text-lantern-glow"
                  : "border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.08]")
              }
            >
              {f.label} ({counts[f.id]})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-white/45">Aucune créature ne correspond à ta recherche.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((monster) => (
            <MonsterCard
              key={monster.id}
              monster={monster}
              isOpen={monster.id === selectedId}
              onOpen={() => setSelectedId(monster.id)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && <MonsterModal monster={selected} onClose={() => setSelectedId(null)} />}
      </AnimatePresence>
    </div>
  );
}
