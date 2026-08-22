import { useState } from "react";
import ForgeStation from "./ForgeStation";
import EnchantStation from "./EnchantStation";
import KitchenStation from "./KitchenStation";

type CraftTab = "forge" | "enchant" | "kitchen";

const TABS: { id: CraftTab; label: string }[] = [
  { id: "forge", label: "Forge" },
  { id: "enchant", label: "Enchantement" },
  { id: "kitchen", label: "Cuisine" },
];

interface CraftingScreenProps {
  onOpenTown: () => void;
}

/**
 * The Crafting bottom-nav tab.
 *
 * It renders the Forge and Enchantement counters *inline*, as an ordinary scrolling tab screen —
 * it does NOT drop the player into the Cité's plaza the way an earlier version did, which teleported
 * you into a town scene with no explanation of why you were suddenly there. Both counters are the
 * same components the plaza's buildings open as modals (see TownPanel), so the two routes can't
 * drift apart, and a line at the bottom tells the player where these workshops physically are.
 */
export default function CraftingScreen({ onOpenTown }: CraftingScreenProps) {
  const [tab, setTab] = useState<CraftTab>("forge");

  return (
    <div className="w-full max-w-md">
      <div className="mb-3 flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={
              "flex-1 rounded-full border px-3 py-2 text-xs font-bold transition-colors " +
              (tab === t.id
                ? "border-lantern/50 bg-lantern/15 text-lantern-glow"
                : "border-white/10 bg-black/25 text-white/55 hover:border-white/25")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "forge" ? <ForgeStation /> : tab === "enchant" ? <EnchantStation /> : <KitchenStation />}

      <button
        type="button"
        onClick={onOpenTown}
        className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-[11px] text-white/50 transition-colors hover:border-lantern/40 hover:text-white/75"
      >
        Ces ateliers se trouvent à la <span className="font-bold text-lantern-glow">Cité Royale</span> — s'y rendre
      </button>
    </div>
  );
}
