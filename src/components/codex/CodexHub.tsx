import { useState } from "react";
import Bestiary from "../bestiary/Bestiary";
import MaterialsCompendium from "./MaterialsCompendium";
import TypeMatrixCompendium from "./TypeMatrixCompendium";
import LivestockCompendium from "./LivestockCompendium";

type CodexTab = "bestiary" | "materials" | "livestock" | "types";

const CODEX_TABS: { id: CodexTab; label: string }[] = [
  // No counts in the labels: at four tabs, "Matériaux (85)" + "Types & Météo" ran the row off the
  // side of a 390px screen. Each tab shows its own count in its content anyway.
  { id: "bestiary", label: "Bestiaire" },
  { id: "materials", label: "Matériaux" },
  { id: "livestock", label: "Élevage" },
  { id: "types", label: "Types" },
];

export default function CodexHub() {
  const [tab, setTab] = useState<CodexTab>("bestiary");
  const [jumpToMonsterId, setJumpToMonsterId] = useState<string | null>(null);
  const [jumpToMaterialId, setJumpToMaterialId] = useState<string | null>(null);

  const activeIndex = CODEX_TABS.findIndex((t) => t.id === tab);

  const viewMonster = (monsterId: string) => {
    setJumpToMonsterId(monsterId);
    setTab("bestiary");
  };

  return (
    <div className="w-full max-w-5xl">
      <div
        role="tablist"
        aria-label="Grand Codex du Royaume"
        className="relative mx-auto mb-6 grid w-fit grid-cols-4 rounded-full border border-white/15 bg-white/[0.06] p-1 backdrop-blur-2xl"
      >
        <span
          className="absolute inset-y-1 w-[calc(25%-3px)] rounded-full bg-gradient-to-r from-lantern via-lantern-glow to-mercenary shadow-[0_2px_12px_rgba(255,179,71,0.4)] transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${activeIndex * 100}%)`, left: 4 }}
        />
        {CODEX_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={
              "relative z-10 whitespace-nowrap rounded-full px-2.5 py-2 text-[11px] font-semibold transition-colors duration-200 sm:px-4 sm:text-sm " +
              (tab === t.id ? "text-[#1a1004]" : "text-white/60 hover:text-white/85")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "bestiary" ? (
        <Bestiary
          requestedMonsterId={jumpToMonsterId}
          onRequestHandled={() => setJumpToMonsterId(null)}
          onViewMaterial={(materialId) => {
            setJumpToMaterialId(materialId);
            setTab("materials");
          }}
        />
      ) : tab === "materials" ? (
        <MaterialsCompendium
          requestedMaterialId={jumpToMaterialId}
          onRequestHandled={() => setJumpToMaterialId(null)}
          onViewMonster={viewMonster}
        />
      ) : tab === "livestock" ? (
        <LivestockCompendium />
      ) : (
        <TypeMatrixCompendium onViewMonster={viewMonster} />
      )}
    </div>
  );
}
