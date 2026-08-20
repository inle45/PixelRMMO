import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CLASSES, type ClassId, type Gender } from "../../data/classes";
import { getInventory, getOwnedMaterials } from "../../data/inventory";
import StatBar from "../ui/StatBar";
import AnimatedSprite from "../ui/AnimatedSprite";
import HeroProfileOverlay from "./HeroProfileOverlay";
import ecuIcon from "../../assets/icons/ecu.png";
import swordIcon from "../../assets/icons/items/sword.png";
import bowIcon from "../../assets/icons/items/bow.png";
import staffIcon from "../../assets/icons/items/staff.png";
import potionIcon from "../../assets/icons/items/potion.png";
import skullIcon from "../../assets/icons/items/skull.png";
import tunicKnightIcon from "../../assets/icons/items/tunic-knight.png";
import tunicArcherIcon from "../../assets/icons/items/tunic-archer.png";
import tunicMageIcon from "../../assets/icons/items/tunic-mage.png";

const STORAGE_KEY = "pixelrmmo:hero";

const STARTER_WEAPON: Record<ClassId, { name: string; icon: string }> = {
  knight: { name: "Épée de Fer", icon: swordIcon },
  archer: { name: "Arc Renforcé", icon: bowIcon },
  mage: { name: "Bâton d'Apprenti", icon: staffIcon },
};

const STARTER_ARMOR: Record<ClassId, { name: string; icon: string }> = {
  knight: { name: "Tunique d'Écuyer", icon: tunicKnightIcon },
  archer: { name: "Tunique de Rôdeur", icon: tunicArcherIcon },
  mage: { name: "Tunique de Mage Apprenti", icon: tunicMageIcon },
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
  username?: string | null;
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

export default function CampScreen({ username, onOpenDungeon }: CampScreenProps) {
  const hero = useMemo(() => readStoredHero(), []);
  const classDef = hero ? CLASSES.find((c) => c.id === hero.classId) : undefined;
  const weapon = hero ? STARTER_WEAPON[hero.classId] : null;
  const armor = hero ? STARTER_ARMOR[hero.classId] : null;
  const [openSlot, setOpenSlot] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const inventory = useMemo(() => getInventory(), []);
  const ownedMaterials = useMemo(() => getOwnedMaterials(), []);

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
    if (armor) {
      items.push({
        id: "armor",
        name: armor.name,
        icon: armor.icon,
        description: "Armure légère de départ. Protection de base contre les coups.",
      });
    }
    items.push({
      id: "potion-1",
      name: "Mini Potion de Soin",
      icon: potionIcon,
      description: "Restaure 50 PV instantanément.",
    });
    items.push({
      id: "potion-2",
      name: "Mini Potion de Soin",
      icon: potionIcon,
      description: "Restaure 50 PV instantanément.",
    });
    for (const { material, count } of ownedMaterials) {
      items.push({
        id: `material-${material.id}`,
        name: `${material.name} x${count}`,
        icon: material.icon,
        description: `${material.usage} Rapporté de la Crypte Ancestrale.`,
      });
    }
    const slots: (BackpackItem | null)[] = [...items];
    while (slots.length < 16) slots.push(null);
    return slots;
  }, [weapon, armor, ownedMaterials]);

  const hpStat = classDef?.stats.find((s) => s.label === "PV");

  return (
    <div className="w-full max-w-md">
      {/* Header: Écus + Marché C2C balance */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          <img src={ecuIcon} alt="" className="h-7 w-7" style={{ imageRendering: "pixelated" }} />
          <span className="text-sm font-bold text-white">{inventory.ecus} Écus</span>
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
            <div className="h-20 w-20 flex-none">
              {!profileOpen && (
                <motion.button
                  type="button"
                  layoutId="hero-avatar-frame"
                  onClick={() => setProfileOpen(true)}
                  aria-label="Voir la fiche du héros"
                  className="flex h-20 w-20 items-center justify-center rounded-xl border border-white/10 bg-black/25 transition-colors active:scale-95"
                  transition={{ type: "spring", stiffness: 260, damping: 28 }}
                >
                  <AnimatedSprite
                    idleSrc={classDef.sprites[hero.gender]}
                    idleFrames={classDef.idleFrames[hero.gender]}
                    alt={classDef.names[hero.gender]}
                  />
                </motion.button>
              )}
            </div>
            <div className="flex flex-1 flex-col justify-center gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">{classDef.names[hero.gender]}</h2>
                  {username && <p className="text-xs font-medium text-white/45">@{username}</p>}
                </div>
                <span className="rounded-full bg-lantern/15 px-2 py-0.5 text-[10px] font-bold text-lantern-glow">
                  NIV. {inventory.level}
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
                  "flex aspect-square w-full items-center justify-center rounded-lg border p-2 transition-colors " +
                  (item
                    ? "border-white/15 bg-black/30 hover:border-lantern/50 active:scale-95"
                    : "border-white/5 bg-black/10")
                }
              >
                {item && (
                  <img
                    src={item.icon}
                    alt=""
                    className="h-full w-full object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                )}
              </button>
              {item && openSlot === item.id && (
                <div
                  className={
                    "absolute top-full z-20 mt-2 w-36 rounded-lg border border-white/15 bg-[#11101a]/95 p-2 text-center shadow-xl backdrop-blur " +
                    (i % 4 === 0
                      ? "left-0"
                      : i % 4 === 3
                        ? "right-0"
                        : "left-1/2 -translate-x-1/2")
                  }
                >
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
        <img
          src={skullIcon}
          alt=""
          className="h-10 w-10 flex-none"
          style={{ imageRendering: "pixelated" }}
        />
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-rose-300/80">Donjon 1</p>
          <p className="text-sm font-bold text-white">La Crypte du Roi Squelette</p>
        </div>
        <span className="text-white/40 transition-transform group-hover:translate-x-1">→</span>
      </button>

      <AnimatePresence>
        {profileOpen && classDef && hero && (
          <HeroProfileOverlay
            classDef={classDef}
            gender={hero.gender}
            username={username}
            onClose={() => setProfileOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EquipmentSlot({ label, icon }: { label: string; icon?: string | null }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/20 p-2">
        {icon ? (
          <img src={icon} alt="" className="h-full w-full object-contain" style={{ imageRendering: "pixelated" }} />
        ) : (
          <span className="text-lg text-white/25">+</span>
        )}
      </div>
      <span className="text-[9px] font-medium uppercase tracking-wide text-white/40">{label}</span>
    </div>
  );
}
