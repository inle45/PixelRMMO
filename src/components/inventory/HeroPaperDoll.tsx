import { useMemo } from "react";
import type { CSSProperties } from "react";
import type { ClassDefinition, Gender } from "../../data/classes";
import {
  EQUIPMENT_BY_ID,
  EQUIPMENT_SLOTS,
  SLOT_META,
  aggregateEquipmentBonuses,
  getSlotSilhouette,
  type EquipmentSlotId,
} from "../../data/equipment";
import { computeHeroStats } from "../../data/battleEngine";
import { TYPE_BY_ID } from "../../data/typeSystem";
import { RARITY_BY_ID } from "../../data/rarity";
import AnimatedSprite from "../ui/AnimatedSprite";

interface HeroPaperDollProps {
  classDef: ClassDefinition;
  gender: Gender;
  level: number;
  equippedItemIds: Partial<Record<EquipmentSlotId, string>>;
  onUnequipSlot: (slot: EquipmentSlotId) => void;
  onAutoEquipBest: () => void;
}

/** Where each of the 6 strict slots sits in the 3x3 grid around the centered hero sprite. */
const SLOT_POSITION: Record<EquipmentSlotId, CSSProperties> = {
  head: { gridColumn: 1, gridRow: 1 },
  offhand: { gridColumn: 3, gridRow: 1 },
  weapon: { gridColumn: 1, gridRow: 2 },
  legs: { gridColumn: 3, gridRow: 2 },
  chest: { gridColumn: 1, gridRow: 3 },
  boots: { gridColumn: 3, gridRow: 3 },
};

type NumericStatKey = Exclude<keyof ReturnType<typeof computeHeroStats>, "damageType">;

const STAT_ROWS: { key: NumericStatKey; label: string; format: (v: number) => string }[] = [
  { key: "maxHp", label: "PV Max", format: (v) => `${Math.round(v)}` },
  { key: "maxMana", label: "Mana Max", format: (v) => `${Math.round(v)}` },
  { key: "atk", label: "Attaque", format: (v) => `${Math.round(v)}` },
  { key: "def", label: "Défense", format: (v) => `${Math.round(v)}` },
  { key: "speed", label: "Vitesse", format: (v) => `${Math.round(v)}` },
  { key: "blockChance", label: "Parade", format: (v) => `${Math.round(v * 100)}%` },
  { key: "dodgeChance", label: "Esquive", format: (v) => `${Math.round(v * 100)}%` },
  { key: "critChance", label: "Coup Critique", format: (v) => `${Math.round(v * 100)}%` },
];

export default function HeroPaperDoll({ classDef, gender, level, equippedItemIds, onUnequipSlot, onAutoEquipBest }: HeroPaperDollProps) {
  const bonuses = useMemo(() => aggregateEquipmentBonuses(equippedItemIds), [equippedItemIds]);
  const stats = useMemo(() => computeHeroStats(classDef, level, bonuses), [classDef, level, bonuses]);
  const affinity = TYPE_BY_ID[stats.damageType];

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-white/60">Fiche de Héros</h3>
        <button
          type="button"
          onClick={onAutoEquipBest}
          className="flex items-center gap-1 rounded-full border border-lantern/40 bg-lantern/10 px-2.5 py-1 text-[10px] font-bold text-lantern-glow transition-colors hover:bg-lantern/20"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
            <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
          </svg>
          Meilleur Équipement
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 grid-rows-3 items-center justify-items-center gap-2">
        {EQUIPMENT_SLOTS.map((slot) => (
          <SlotButton
            key={slot}
            slot={slot}
            itemId={equippedItemIds[slot]}
            style={SLOT_POSITION[slot]}
            onClick={() => equippedItemIds[slot] && onUnequipSlot(slot)}
          />
        ))}
        <div style={{ gridColumn: 2, gridRow: "1 / span 3" }} className="flex h-full w-full items-center justify-center">
          <div className="h-24 w-24 drop-shadow-[0_10px_16px_rgba(0,0,0,0.55)]">
            <AnimatedSprite
              idleSrc={classDef.sprites[gender]}
              idleFrames={classDef.idleFrames[gender]}
              alt={classDef.names[gender]}
            />
          </div>
        </div>
      </div>

      {affinity && (
        <div
          className="mx-auto mt-3 flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1"
          style={{ borderColor: `${affinity.color}66`, backgroundColor: `${affinity.color}1a` }}
        >
          {affinity.icon && <img src={affinity.icon} alt="" className="h-3.5 w-3.5" style={{ imageRendering: "pixelated" }} />}
          <span className="text-[10px] font-bold" style={{ color: affinity.color }}>
            Affinité : {affinity.name}
          </span>
        </div>
      )}

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {STAT_ROWS.map((row) => (
          <div key={row.label} className="rounded-lg bg-black/25 px-1.5 py-1.5 text-center">
            <p className="text-[9px] font-medium uppercase tracking-wide text-white/45">{row.label}</p>
            <p className="mt-0.5 text-xs font-bold text-white">{row.format(stats[row.key])}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlotButton({
  slot,
  itemId,
  style,
  onClick,
}: {
  slot: EquipmentSlotId;
  itemId?: string;
  style: CSSProperties;
  onClick: () => void;
}) {
  const meta = SLOT_META[slot];
  const item = itemId ? EQUIPMENT_BY_ID[itemId] : undefined;
  const rarity = item ? RARITY_BY_ID[item.rarity] : undefined;

  return (
    <div style={style} className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={!item}
        aria-label={item ? `Déséquiper ${item.name}` : `${meta.label} (vide)`}
        title={item ? item.name : `${meta.label} — ${meta.focus}`}
        className={
          "flex h-12 w-12 items-center justify-center rounded-lg border p-2 transition-colors " +
          (item
            ? "border-2 bg-black/30 hover:brightness-110 active:scale-95"
            : "border border-dashed border-white/15 bg-black/20")
        }
        style={item && rarity ? { borderColor: rarity.color } : undefined}
      >
        {item ? (
          <img src={item.icon} alt="" className="h-full w-full object-contain" style={{ imageRendering: "pixelated" }} />
        ) : (
          <img
            src={getSlotSilhouette(slot)}
            alt=""
            className="h-full w-full object-contain opacity-60"
            style={{ imageRendering: "pixelated" }}
          />
        )}
      </button>
      <span className="text-center text-[8px] font-medium uppercase leading-tight tracking-wide text-white/40">
        {meta.emoji} {meta.label}
      </span>
    </div>
  );
}
