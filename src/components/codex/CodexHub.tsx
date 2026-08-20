import { useState } from "react";
import Bestiary from "../bestiary/Bestiary";
import MaterialsCompendium from "./MaterialsCompendium";
import { BESTIARY } from "../../data/bestiary";
import { MATERIALS } from "../../data/materials";

type CodexTab = "bestiary" | "materials";

const CODEX_TABS: { id: CodexTab; label: string }[] = [
  { id: "bestiary", label: `📖 Bestiaire (${BESTIARY.length})` },
  { id: "materials", label: `🪵 Matériaux (${MATERIALS.length})` },
];

export default function CodexHub() {
  const [tab, setTab] = useState<CodexTab>("bestiary");
  const [jumpToMonsterId, setJumpToMonsterId] = useState<string | null>(null);

  const activeIndex = CODEX_TABS.findIndex((t) => t.id === tab);

  return (
    <div className="w-full max-w-5xl">
      <div
        role="tablist"
        aria-label="Grand Codex du Royaume"
        className="relative mx-auto mb-6 grid w-fit grid-cols-2 rounded-full border border-white/15 bg-white/[0.06] p-1 backdrop-blur-2xl"
      >
        <span
          className="absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-lantern via-lantern-glow to-mercenary shadow-[0_2px_12px_rgba(255,179,71,0.4)] transition-transform duration-300 ease-out"
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
              "relative z-10 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-colors duration-200 sm:text-sm " +
              (tab === t.id ? "text-[#1a1004]" : "text-white/60 hover:text-white/85")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "bestiary" ? (
        <Bestiary requestedMonsterId={jumpToMonsterId} onRequestHandled={() => setJumpToMonsterId(null)} />
      ) : (
        <MaterialsCompendium
          onViewMonster={(monsterId) => {
            setJumpToMonsterId(monsterId);
            setTab("bestiary");
          }}
        />
      )}
    </div>
  );
}
