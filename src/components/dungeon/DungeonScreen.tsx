import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import DungeonHub from "./DungeonHub";
import TurnBattleArena, { type BattleResult } from "./TurnBattleArena";
import DungeonSummaryModal from "./DungeonSummaryModal";
import { consumeKey } from "../../data/energy";
import { getInventory } from "../../data/inventory";
import { getWorldState } from "../../data/worldState";
import { CLASSES, type ClassId, type Gender } from "../../data/classes";
import { mapIcon } from "../../data/campScene";

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
  onOpenMap: () => void;
}

type Phase = "hub" | "battle" | "summary";

/** The one node id the Crypte du Roi Squelette dungeon is physically bound to on the World Map —
 * see mapNodes.json. Kept as a literal here (rather than looking it up by `kind === "dungeon"`)
 * since this dungeon module only ever knows about the one crypt, not the map's node graph. */
const CRYPT_NODE_ID = "crypte";

export default function DungeonScreen({ onReturnToCamp, onOpenMap }: DungeonScreenProps) {
  const [phase, setPhase] = useState<Phase>("hub");
  const [battleKey, setBattleKey] = useState(0);
  const [result, setResult] = useState<BattleResult | null>(null);

  const hero = readStoredHero();
  const classDef = hero ? CLASSES.find((c) => c.id === hero.classId) : undefined;
  const atCrypt = getWorldState().currentNodeId === CRYPT_NODE_ID;

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

  if (!atCrypt) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-rose-400/25 bg-gradient-to-b from-rose-950/30 to-black/30 p-8 text-center backdrop-blur-2xl">
        {mapIcon && <img src={mapIcon} alt="" className="mx-auto h-14 w-14" style={{ imageRendering: "pixelated" }} />}
        <h2 className="mt-3 text-base font-bold text-white">Crypte Verrouillée</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          Tu dois d'abord voyager jusqu'à la Crypte du Roi Squelette sur la Carte du Monde pour pouvoir y entrer.
        </p>
        <button
          type="button"
          onClick={onOpenMap}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-lantern to-lantern-glow px-4 py-2.5 text-xs font-bold text-black transition-opacity hover:opacity-90"
        >
          Ouvrir la Carte du Monde
        </button>
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
