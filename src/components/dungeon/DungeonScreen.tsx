import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import DungeonHub from "./DungeonHub";
import TurnBattleArena, { type BattleResult } from "./TurnBattleArena";
import DungeonSummaryModal from "./DungeonSummaryModal";
import { consumeKey } from "../../data/energy";
import { getInventory } from "../../data/inventory";
import { CLASSES, type ClassId, type Gender } from "../../data/classes";

const HERO_STORAGE_KEY = "pixelrmmo:hero";

interface StoredHero {
  classId: ClassId;
  gender: Gender;
}

function readStoredHero(): StoredHero | null {
  try {
    const raw = localStorage.getItem(HERO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredHero;
    return parsed?.classId && parsed?.gender ? parsed : null;
  } catch {
    return null;
  }
}

interface DungeonScreenProps {
  onReturnToCamp: () => void;
}

type Phase = "hub" | "battle" | "summary";

export default function DungeonScreen({ onReturnToCamp }: DungeonScreenProps) {
  const [phase, setPhase] = useState<Phase>("hub");
  const [battleKey, setBattleKey] = useState(0);
  const [result, setResult] = useState<BattleResult | null>(null);

  const hero = readStoredHero();
  const classDef = hero ? CLASSES.find((c) => c.id === hero.classId) : undefined;

  function enterCrypt() {
    if (!consumeKey()) return;
    setResult(null);
    setBattleKey((k) => k + 1);
    setPhase("battle");
  }

  if (!classDef || !hero) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-8 text-center backdrop-blur-2xl">
        <p className="text-sm text-white/55">Choisis d'abord un héros pour accéder aux donjons.</p>
      </div>
    );
  }

  return (
    <>
      {phase === "hub" && <DungeonHub onEnter={enterCrypt} />}

      <AnimatePresence>
        {phase === "battle" && (
          <TurnBattleArena
            key={battleKey}
            classDef={classDef}
            gender={hero.gender}
            level={getInventory().level}
            onComplete={(r) => {
              setResult(r);
              setPhase("summary");
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "summary" && result && (
          <DungeonSummaryModal
            result={result}
            onReplay={enterCrypt}
            onReturnToCamp={() => {
              setPhase("hub");
              onReturnToCamp();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
