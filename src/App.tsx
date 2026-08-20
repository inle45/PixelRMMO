import { useState } from "react";
import NightSceneBackground from "./components/background/NightSceneBackground";
import AuthCard from "./components/auth/AuthCard";
import CharacterSelectScreen from "./components/character/CharacterSelectScreen";

type Screen = "auth" | "character-select";

export default function App() {
  const [screen, setScreen] = useState<Screen>("auth");

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center px-4 py-10 sm:px-8">
      <NightSceneBackground />
      <main className="flex w-full justify-center">
        {screen === "auth" ? (
          <AuthCard onAuthenticated={() => setScreen("character-select")} />
        ) : (
          <CharacterSelectScreen />
        )}
      </main>
    </div>
  );
}
