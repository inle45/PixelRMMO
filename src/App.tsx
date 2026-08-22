import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import NightSceneBackground from "./components/background/NightSceneBackground";
import DynamicBackground from "./components/background/DynamicBackground";
import AuthCard from "./components/auth/AuthCard";
import CharacterSelectScreen from "./components/character/CharacterSelectScreen";
import CampScreen from "./components/camp/CampScreen";
import BottomNav from "./components/nav/BottomNav";
import CodexHub from "./components/codex/CodexHub";
import DungeonScreen from "./components/dungeon/DungeonScreen";
import InventoryScreen from "./components/inventory/InventoryScreen";
import WorldMap from "./components/map/WorldMap";
import TownScene from "./components/town/TownScene";
import CraftingScreen from "./components/town/CraftingScreen";
import MarketStation from "./components/town/MarketStation";
import type { TabId } from "./data/tabs";

type Screen = "auth" | "character-select" | "game";

const USERNAME_KEY = "pixelrmmo:username";

export default function App() {
  const [screen, setScreen] = useState<Screen>("auth");
  const [activeTab, setActiveTab] = useState<TabId>("camp");
  // Lifted above every tab: the Dungeon tab needs to open the World Map (to send a player who hasn't
  // travelled to the crypt yet), and the Crafting/Marché tabs offer a shortcut into the Cité — so
  // neither overlay can be owned by a single tab's subtree.
  const [mapOpen, setMapOpen] = useState(false);
  const [townOpen, setTownOpen] = useState(false);

  // Still persisted for whoever needs it later — the Camp tab no longer displays it, since the tab
  // is scene-only now, so there's nothing to hold it in React state for.
  const handleAuthenticated = (name: string) => {
    localStorage.setItem(USERNAME_KEY, name);
    setScreen("character-select");
  };

  /** Both overlays, rendered identically under either shell below. */
  const overlays = (
    <>
      <AnimatePresence>
        {mapOpen && (
          <WorldMap
            onClose={() => setMapOpen(false)}
            onEnterTown={() => {
              setMapOpen(false);
              setTownOpen(true);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {townOpen && (
          <TownScene
            onClose={() => setTownOpen(false)}
            onOpenMap={() => {
              setTownOpen(false);
              setMapOpen(true);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );

  // The Camp tab is a fullscreen, non-scrolling scene: it opts out of the padded, centred, scrolling
  // <main> every other tab shares, and out of DynamicBackground too (its own backdrop is opaque and
  // full-bleed, so painting a second one underneath would just be wasted work).
  if (screen === "game" && activeTab === "camp") {
    return (
      <div className="relative h-[100dvh] w-full overflow-hidden">
        <main className="absolute inset-x-0 top-0 bottom-[var(--nav-height)] overflow-hidden">
          <CampScreen onOpenMap={() => setMapOpen(true)} />
        </main>
        <BottomNav active={activeTab} onChange={setActiveTab} />
        {overlays}
      </div>
    );
  }

  if (screen === "game") {
    return (
      <div className="relative min-h-[100dvh] w-full">
        <DynamicBackground active={activeTab} />
        <main className="flex justify-center px-4 pb-28 pt-[calc(1.5rem+env(safe-area-inset-top))]">
          {activeTab === "inventory" ? (
            <InventoryScreen />
          ) : activeTab === "bestiary" ? (
            <CodexHub />
          ) : activeTab === "dungeon" ? (
            <DungeonScreen onReturnToCamp={() => setActiveTab("camp")} onOpenMap={() => setMapOpen(true)} />
          ) : activeTab === "crafting" ? (
            // Inline, NOT a jump into the Cité's plaza: tapping a nav tab should open that tab's
            // content, not teleport the player somewhere they didn't ask to go.
            <CraftingScreen onOpenTown={() => setTownOpen(true)} />
          ) : activeTab === "market" ? (
            <div className="w-full max-w-md">
              <MarketStation />
              <button
                type="button"
                onClick={() => setTownOpen(true)}
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-[11px] text-white/50 transition-colors hover:border-lantern/40 hover:text-white/75"
              >
                L'hôtel des ventes siège à la <span className="font-bold text-lantern-glow">Cité Royale</span> — s'y rendre
              </button>
            </div>
          ) : null}
        </main>
        <BottomNav active={activeTab} onChange={setActiveTab} />
        {overlays}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center px-4 py-10 sm:px-8">
      <NightSceneBackground />
      <main className="flex w-full justify-center">
        {screen === "auth" ? (
          <AuthCard onAuthenticated={handleAuthenticated} />
        ) : (
          <CharacterSelectScreen onConfirm={() => setScreen("game")} />
        )}
      </main>
    </div>
  );
}
