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
import type { TabId } from "./data/tabs";

type Screen = "auth" | "character-select" | "game";

const USERNAME_KEY = "pixelrmmo:username";

export default function App() {
  const [screen, setScreen] = useState<Screen>("auth");
  const [activeTab, setActiveTab] = useState<TabId>("camp");
  // Lifted above both the Camp and the general "game" branch below: the Dungeon tab also needs to
  // open the World Map (to send a player who hasn't travelled to the crypt yet), so ownership can't
  // live inside CampScreen alone.
  const [mapOpen, setMapOpen] = useState(false);
  // Same reasoning as mapOpen: entering the Cité from the World Map's "Entrer dans la Cité" button
  // can happen while any tab is active, so this can't live inside a single tab's branch either.
  const [townOpen, setTownOpen] = useState(false);

  // Still persisted for whoever needs it later — the Camp tab no longer displays it, since the tab
  // is scene-only now, so there's nothing to hold it in React state for.
  const handleAuthenticated = (name: string) => {
    localStorage.setItem(USERNAME_KEY, name);
    setScreen("character-select");
  };

  // The Camp tab is a fullscreen, non-scrolling scene: it opts out of the padded, centred, scrolling
  // <main> every other tab shares, and out of DynamicBackground too (its own backdrop is opaque and
  // full-bleed, so painting a second one underneath would just be wasted work). The Town scene needs
  // the exact same treatment, so "market"/"crafting" — which used to be bare ComingSoonPanel
  // placeholders — join this branch too: tapping either now jumps straight into TownScene's
  // Marketplace/Forge instead of a dead end.
  if (screen === "game" && (activeTab === "camp" || activeTab === "market" || activeTab === "crafting")) {
    return (
      <div className="relative h-[100dvh] w-full overflow-hidden">
        <main className="absolute inset-x-0 top-0 bottom-[var(--nav-height)] overflow-hidden">
          {activeTab === "camp" ? (
            <CampScreen onOpenMap={() => setMapOpen(true)} />
          ) : (
            <TownScene
              initialZone={activeTab === "market" ? "market" : "forge"}
              onClose={() => setActiveTab("camp")}
              onOpenMap={() => setMapOpen(true)}
            />
          )}
        </main>
        <BottomNav active={activeTab} onChange={setActiveTab} />
        <AnimatePresence>
          {mapOpen && <WorldMap onClose={() => setMapOpen(false)} onEnterTown={() => { setMapOpen(false); setTownOpen(true); }} />}
        </AnimatePresence>
        <AnimatePresence>
          {townOpen && <TownScene onClose={() => setTownOpen(false)} onOpenMap={() => { setTownOpen(false); setMapOpen(true); }} />}
        </AnimatePresence>
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
          ) : null // camp/market/crafting are already handled by the fullscreen branch above
          }
        </main>
        <BottomNav active={activeTab} onChange={setActiveTab} />
        <AnimatePresence>
          {mapOpen && <WorldMap onClose={() => setMapOpen(false)} onEnterTown={() => { setMapOpen(false); setTownOpen(true); }} />}
        </AnimatePresence>
        <AnimatePresence>
          {townOpen && <TownScene onClose={() => setTownOpen(false)} onOpenMap={() => { setTownOpen(false); setMapOpen(true); }} />}
        </AnimatePresence>
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
