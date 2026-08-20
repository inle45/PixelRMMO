import { useMemo, useState } from "react";
import { CLASSES, type ClassId, type Gender } from "../../data/classes";
import StatBar from "../ui/StatBar";
import ecuIcon from "../../assets/icons/ecu.png";

const STORAGE_KEY = "pixelrmmo:hero";

const STARTER_WEAPON: Record<ClassId, { name: string; icon: string }> = {
  knight: { name: "Épée de Fer", icon: "🗡️" },
  archer: { name: "Arc Renforcé", icon: "🏹" },
  mage: { name: "Bâton Runique", icon: "🪄" },
};

interface StoredHero {
  classId: ClassId;
  gender: Gender;
}

interface BackpackItem {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface CampScreenProps {
  onOpenDungeon?: () => void;
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

export default function CampScreen({ onOpenDungeon }: CampScreenProps) {
  const hero = useMemo(() => readStoredHero(), []);
  const classDef = hero ? CLASSES.find((c) => c.id === hero.classId) : undefined;
  const weapon = hero ? STARTER_WEAPON[hero.classId] : null;
  const [openSlot, setOpenSlot] = useState<string | null>(null);

  const backpack: (BackpackItem | null)[] = useMemo(() => {
    const items: BackpackItem[] = [];
    if (weapon) {
      items.push({
        id: "weapon",
        name: weapon.name,
        icon: weapon.icon,
        description: "Ton arme de départ. Fiable et bien équilibrée au combat.",
      });
    }
    items.push({
      id: "tunic",
      name: "Tunique de Mercenaire",
      icon: "🧥",
      description: "Armure légère en cuir tanné. Protection de base contre les coups.",
    });
    items.push({
      id: "potion-1",
      name: "Potion de Soin",
      icon: "🧪",
      description: "Restaure 50 PV instantanément.",
    });
    items.push({
      id: "potion-2",
      name: "Potion de Soin",
      icon: "🧪",
      description: "Restaure 50 PV instantanément.",
    });
    const slots: (BackpackItem | null)[] = [...items];
    while (slots.length < 16) slots.push(null);
    return slots;
  }, [weapon]);

  const hpStat = classDef?.stats.find((s) => s.label === "PV");

  return (
    <div className="w-full max-w-md">
      {/* Header: Écus + Marché C2C balance */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          <img src={ecuIcon} alt="" className="h-7 w-7" style={{ imageRendering: "pixelated" }} />
          <span className="text-sm font-bold text-white">250 Écus</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-3 py-1.5">
          <span className="text-[10px] uppercase tracking-wide text-white/45">Marché</span>
          <span className="text-sm font-bold text-lantern-glow">0,00 €</span>
        </div>
      </div>

      {/* Hero panel */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-2xl">
        {classDef && hero ? (
          <div className="flex gap-4">
            <div className="flex h-20 w-20 flex-none items-center justify-center rounded-xl border border-white/10 bg-black/25">
              <img
                src={classDef.sprites[hero.gender]}
                alt={classDef.names[hero.gender]}
                className="h-full w-full object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
            <div className="flex flex-1 flex-col justify-center gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white">{classDef.names[hero.gender]}</h2>
                <span className="rounded-full bg-lantern/15 px-2 py-0.5 text-[10px] font-bold text-lantern-glow">
                  NIV. 1
                </span>
              </div>
              {hpStat && <StatBar {...hpStat} />}
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/55">Aucun héros sélectionné pour l'instant.</p>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <EquipmentSlot label="Arme" icon={weapon?.icon} />
          <EquipmentSlot label="Armure" icon={null} />
          <EquipmentSlot label="Relique" icon={null} />
        </div>
      </div>

      {/* Backpack */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-2xl">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-white/60">Sac à Dos</h3>
        <div className="grid max-h-[300px] grid-cols-4 gap-2 overflow-y-auto pr-0.5">
          {backpack.map((item, i) => (
            <div key={item?.id ?? `empty-${i}`} className="relative">
              <button
                type="button"
                disabled={!item}
                onClick={() => item && setOpenSlot(openSlot === item.id ? null : item.id)}
                aria-label={item?.name}
                className={
                  "flex aspect-square w-full items-center justify-center rounded-lg border text-lg transition-colors " +
                  (item
                    ? "border-white/15 bg-black/30 hover:border-lantern/50 active:scale-95"
                    : "border-white/5 bg-black/10")
                }
              >
                {item?.icon}
              </button>
              {item && openSlot === item.id && (
                <div className="absolute bottom-full left-1/2 z-20 mb-2 w-36 -translate-x-1/2 rounded-lg border border-white/15 bg-[#11101a]/95 p-2 text-center shadow-xl backdrop-blur">
                  <p className="text-[11px] font-bold text-white">{item.name}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-white/60">{item.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dungeon access card */}
      <button
        type="button"
        onClick={onOpenDungeon}
        className="group mt-4 flex w-full items-center gap-3 rounded-2xl border border-rose-400/25 bg-gradient-to-r from-rose-950/40 to-black/30 p-4 text-left backdrop-blur-2xl transition-all hover:border-rose-400/50 hover:from-rose-950/55"
      >
        <span className="text-3xl">💀</span>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-rose-300/80">Donjon 1</p>
          <p className="text-sm font-bold text-white">La Crypte du Roi Squelette</p>
        </div>
        <span className="text-white/40 transition-transform group-hover:translate-x-1">→</span>
      </button>
    </div>
  );
}

function EquipmentSlot({ label, icon }: { label: string; icon?: string | null }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/20 text-lg">
        {icon ?? <span className="text-white/25">+</span>}
      </div>
      <span className="text-[9px] font-medium uppercase tracking-wide text-white/40">{label}</span>
    </div>
  );
}
