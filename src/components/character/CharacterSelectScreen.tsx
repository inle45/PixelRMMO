import { useState } from "react";
import { CLASSES, type ClassId, type Gender } from "../../data/classes";
import GenderToggle from "./GenderToggle";
import ClassCard from "./ClassCard";
import Button from "../ui/Button";

const STORAGE_KEY = "pixelrmmo:hero";

interface StoredHero {
  classId: ClassId;
  gender: Gender;
}

interface CharacterSelectScreenProps {
  onConfirm?: (hero: StoredHero) => void;
}

function readStoredHero(): StoredHero | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredHero;
    return parsed?.classId && parsed?.gender ? parsed : null;
  } catch {
    return null;
  }
}

export default function CharacterSelectScreen({ onConfirm }: CharacterSelectScreenProps) {
  const storedHero = readStoredHero();
  const [gender, setGender] = useState<Gender>(storedHero?.gender ?? "male");
  const [selected, setSelected] = useState<ClassId | null>(storedHero?.classId ?? null);
  const [confirmed, setConfirmed] = useState<StoredHero | null>(null);

  const handleConfirm = () => {
    if (!selected) return;
    const hero: StoredHero = { classId: selected, gender };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hero));
    setConfirmed(hero);
    onConfirm?.(hero);
  };

  const selectedName = selected ? CLASSES.find((c) => c.id === selected)?.names[gender] : null;

  return (
    <div className="relative w-full max-w-5xl">
      <div className="flex flex-col items-center gap-2 pb-8 text-center">
        <span
          className="text-[10px] uppercase tracking-[0.3em] text-lantern-glow/80"
          style={{ fontFamily: "var(--font-pixel)" }}
        >
          PixelRMMO
        </span>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Choisis ta Classe, ton Genre & tes Stats</h1>
        <p className="max-w-md text-sm text-white/55">
          Chaque héros a un rôle stratégique unique. Choisis avec soin, Mercenaire.
        </p>

        <div className="pt-4">
          <GenderToggle value={gender} onChange={setGender} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CLASSES.map((classDef) => (
          <ClassCard
            key={classDef.id}
            classDef={classDef}
            gender={gender}
            selected={selected === classDef.id}
            onSelect={() => {
              setSelected(classDef.id);
              setConfirmed(null);
            }}
          />
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <div className="w-full max-w-xs">
          <Button type="button" disabled={!selected} onClick={handleConfirm}>
            Incarner ce Héros
          </Button>
        </div>
        {confirmed && (
          <p className="animate-[fadeIn_0.25s_ease-out] text-sm font-medium text-lantern-glow">
            ✓ {selectedName} enregistré comme héros de départ.
          </p>
        )}
      </div>
    </div>
  );
}
