import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { BESTIARY } from "../../data/bestiary";
import { MATERIALS, CATEGORY_LABELS, CATEGORY_ICONS, type MaterialCategory } from "../../data/materials";
import { RARITIES, type RarityId } from "../../data/rarity";
import MaterialCard from "./MaterialCard";
import MaterialModal from "./MaterialModal";

type CategoryFilterId = "all" | MaterialCategory;

interface MaterialsCompendiumProps {
  onViewMonster: (monsterId: string) => void;
  /** Set by CodexHub when a monster's loot table icon is clicked, to jump straight to that material. */
  requestedMaterialId?: string | null;
  onRequestHandled?: () => void;
}

const CATEGORY_FILTERS: { id: CategoryFilterId; label: string; icon: string }[] = [
  { id: "all", label: "Tous", icon: "" },
  { id: "forge", label: CATEGORY_LABELS.forge, icon: CATEGORY_ICONS.forge },
  { id: "alchimie", label: CATEGORY_LABELS.alchimie, icon: CATEGORY_ICONS.alchimie },
  { id: "enchantement", label: CATEGORY_LABELS.enchantement, icon: CATEGORY_ICONS.enchantement },
  { id: "reliques", label: CATEGORY_LABELS.reliques, icon: CATEGORY_ICONS.reliques },
];

export default function MaterialsCompendium({ onViewMonster, requestedMaterialId, onRequestHandled }: MaterialsCompendiumProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterId>("all");
  const [rarityFilter, setRarityFilter] = useState<RarityId | null>(null);
  // Same one-time-jump pattern as Bestiary: CodexHub only passes requestedMaterialId on a fresh
  // mount (this screen unmounts whenever the Bestiaire tab is active), so this is a lazy initial
  // value, not something an effect needs to keep re-syncing.
  const [selectedId, setSelectedId] = useState<string | null>(() => requestedMaterialId ?? null);

  useEffect(() => {
    if (requestedMaterialId) onRequestHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monsterNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of BESTIARY) map[m.id] = m.name;
    return map;
  }, []);

  const filtered = useMemo(
    () =>
      MATERIALS.filter((m) => {
        const matchesCategory = categoryFilter === "all" || m.category === categoryFilter;
        const matchesRarity = !rarityFilter || m.rarity === rarityFilter;
        return matchesCategory && matchesRarity;
      }),
    [categoryFilter, rarityFilter]
  );

  const selected = selectedId ? MATERIALS.find((m) => m.id === selectedId) ?? null : null;

  return (
    <div>
      <div className="flex flex-col items-center gap-2 pb-6 text-center">
        <span className="text-[10px] uppercase tracking-[0.3em] text-lantern-glow/80" style={{ fontFamily: "var(--font-pixel)" }}>
          Crypte Ancestrale
        </span>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Livre des Matériaux</h1>
        <p className="max-w-md text-sm text-white/55">
          {MATERIALS.length} butins classés en 8 niveaux de rareté, du plus abîmé au plus transcendant.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        {CATEGORY_FILTERS.map((f) => {
          const active = categoryFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setCategoryFilter(f.id)}
              className={
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors " +
                (active
                  ? "border-lantern/50 bg-lantern/15 text-lantern-glow"
                  : "border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.08]")
              }
            >
              {/* An <img>, never string interpolation: CATEGORY_ICONS holds sprite paths (Vite inlines
                  small PNGs as base64 data URIs), so `${f.icon}` dumps the whole data URI as visible
                  text across the screen. That is exactly what shipped when these stopped being emoji. */}
              {f.icon && (
                <img src={f.icon} alt="" className="h-3.5 w-3.5 object-contain" style={{ imageRendering: "pixelated" }} />
              )}
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() => setRarityFilter(null)}
          className={
            "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors " +
            (!rarityFilter
              ? "border-white/40 bg-white/15 text-white"
              : "border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.08]")
          }
        >
          Toutes raretés
        </button>
        {RARITIES.map((r) => {
          const active = rarityFilter === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setRarityFilter(active ? null : r.id)}
              className="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all"
              style={{
                borderColor: active ? r.color : `${r.color}40`,
                backgroundColor: active ? `${r.color}25` : "rgba(255,255,255,0.03)",
                color: active ? r.color : "rgba(255,255,255,0.55)",
              }}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-white/45">Aucun matériau ne correspond à ces filtres.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              monsterName={monsterNameById[material.provenance.monsterId] ?? "?"}
              isOpen={material.id === selectedId}
              onOpen={() => setSelectedId(material.id)}
              onViewMonster={() => onViewMonster(material.provenance.monsterId)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <MaterialModal
            material={selected}
            monsterName={monsterNameById[selected.provenance.monsterId] ?? "?"}
            onClose={() => setSelectedId(null)}
            onViewMonster={() => onViewMonster(selected.provenance.monsterId)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
