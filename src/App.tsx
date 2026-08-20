import { useState } from "react";
import NightSceneBackground from "./components/background/NightSceneBackground";
import DynamicBackground from "./components/background/DynamicBackground";
import AuthCard from "./components/auth/AuthCard";
import CharacterSelectScreen from "./components/character/CharacterSelectScreen";
import CampScreen from "./components/camp/CampScreen";
import BottomNav from "./components/nav/BottomNav";
import CodexHub from "./components/codex/CodexHub";
import DungeonScreen from "./components/dungeon/DungeonScreen";
import type { TabId } from "./data/tabs";

type Screen = "auth" | "character-select" | "game";

const USERNAME_KEY = "pixelrmmo:username";

const COMING_SOON: Record<Exclude<TabId, "camp" | "bestiary" | "dungeon">, { title: string; text: string }> = {
  crafting: {
    title: "Crafting",
    text: "Forge, cuisine, bijouterie... l'atelier d'artisanat arrive bientôt.",
  },
  market: { title: "Hôtel des Ventes", text: "Le marché C2C entre joueurs arrive bientôt." },
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("auth");
  const [activeTab, setActiveTab] = useState<TabId>("camp");
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem(USERNAME_KEY));

  const handleAuthenticated = (name: string) => {
    localStorage.setItem(USERNAME_KEY, name);
    setUsername(name);
    setScreen("character-select");
  };

  if (screen === "game") {
    return (
      <div className="relative min-h-[100dvh] w-full">
        <DynamicBackground active={activeTab} />
        <main className="flex justify-center px-4 pb-28 pt-[calc(1.5rem+env(safe-area-inset-top))]">
          {activeTab === "camp" ? (
            <CampScreen username={username} onOpenDungeon={() => setActiveTab("dungeon")} />
          ) : activeTab === "bestiary" ? (
            <CodexHub />
          ) : activeTab === "dungeon" ? (
            <DungeonScreen onReturnToCamp={() => setActiveTab("camp")} />
          ) : (
            <ComingSoonPanel {...COMING_SOON[activeTab]} />
          )}
        </main>
        <BottomNav active={activeTab} onChange={setActiveTab} />
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

function ComingSoonPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-8 text-center backdrop-blur-2xl">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm text-white/55">{text}</p>
    </div>
  );
}
