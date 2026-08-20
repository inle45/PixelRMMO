import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { BESTIARY, FAMILY_LABELS, type MonsterFamily } from "../../data/bestiary";
import { DUNGEONS } from "../../data/dungeons";
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

const FAMILY_ORDER: MonsterFamily[] = ["vermin", "skeleton", "spectre", "guardian", "boss"];

interface BestiaryProps {
  /** Set by CodexHub when a material card's provenance link is clicked, to jump straight to that monster. */
  requestedMonsterId?: string | null;
  onRequestHandled?: () => void;
}

export default function Bestiary({ requestedMonsterId, onRequestHandled }: BestiaryProps = {}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  // CodexHub only ever passes requestedMonsterId on a fresh mount (it unmounts this
  // screen whenever the Matériaux tab is active), so the jump is a one-time initial
  // value rather than something to keep re-syncing via an effect.
  const [selectedId, setSelectedId] = useState<string | null>(() => requestedMonsterId ?? null);

  useEffect(() => {
    if (requestedMonsterId) onRequestHandled?.();
    // Consume-once on mount: re-running this if the callback identity changes would defeat the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const dungeonSections = useMemo(
    () =>
      DUNGEONS.map((dungeon) => {
        const dungeonMonsters = filtered.filter((m) => m.dungeonId === dungeon.id);
        const familyGroups = FAMILY_ORDER.map((family) => ({
          family,
          monsters: dungeonMonsters.filter((m) => m.family === family),
        })).filter((g) => g.monsters.length > 0);
        return { dungeon, familyGroups, count: dungeonMonsters.length };
      }).filter((s) => s.count > 0),
    [filtered]
  );

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

      <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
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

      {dungeonSections.length === 0 ? (
        <p className="py-12 text-center text-sm text-white/45">Aucune créature ne correspond à ta recherche.</p>
      ) : (
        <div className="flex flex-col gap-10">
          {dungeonSections.map(({ dungeon, familyGroups, count }) => (
            <section key={dungeon.id}>
              <div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-3">
                <span className="text-2xl leading-none">{dungeon.icon}</span>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-lantern-glow">{dungeon.name}</h2>
                  <p className="text-xs text-white/50">
                    {dungeon.subtitle} · {count} créature{count > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-7">
                {familyGroups.map(({ family, monsters }) => (
                  <div key={family}>
                    {filter === "all" && (
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-white/55">
                        {FAMILY_LABELS[family]}
                      </h3>
                    )}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {monsters.map((monster) => (
                        <MonsterCard
                          key={monster.id}
                          monster={monster}
                          isOpen={monster.id === selectedId}
                          onOpen={() => setSelectedId(monster.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && <MonsterModal monster={selected} onClose={() => setSelectedId(null)} />}
      </AnimatePresence>
    </div>
  );
}
