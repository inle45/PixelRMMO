import { RARITY_BY_ID } from "../../data/rarity";
import { CATEGORY_ICONS, CATEGORY_LABELS, type MaterialDef } from "../../data/materials";
import RarityFrame from "./RarityFrame";
import ecuIcon from "../../assets/icons/ecu.png";

interface MaterialCardProps {
  material: MaterialDef;
  monsterName: string;
  onViewMonster: () => void;
}

export default function MaterialCard({ material, monsterName, onViewMonster }: MaterialCardProps) {
  const rarity = RARITY_BY_ID[material.rarity];

  return (
    <RarityFrame rarity={material.rarity}>
      <div className="flex h-full flex-col rounded-2xl bg-white/[0.05] p-3 backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-1">
          <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold text-white/60">
            {CATEGORY_ICONS[material.category]} {CATEGORY_LABELS[material.category]}
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ color: rarity.color, backgroundColor: `${rarity.color}22`, border: `1px solid ${rarity.color}66` }}
          >
            {rarity.emoji} {rarity.label}
          </span>
        </div>

        <div className="mx-auto mt-2 flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-black/25">
          <img
            src={material.icon}
            alt={material.name}
            className="h-11 w-11 object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        <h3 className="mt-2 text-center text-sm font-bold leading-tight text-white">{material.name}</h3>
        <p className="mt-0.5 text-center text-[11px] text-white/45">{material.usage}</p>

        <p className="mt-2 line-clamp-2 text-[11px] italic leading-snug text-white/55">{material.lore}</p>

        <button
          type="button"
          onClick={onViewMonster}
          className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5 text-left transition-colors hover:border-lantern/40 hover:bg-black/35"
        >
          <span className="truncate text-[11px] font-medium text-white/70">{monsterName}</span>
          <span className="flex-none text-[11px] font-bold text-lantern-glow">{material.provenance.dropChance}%</span>
        </button>

        <div className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-black/20 px-2 py-1.5">
          <img src={ecuIcon} alt="" className="h-4 w-4" style={{ imageRendering: "pixelated" }} />
          <span className="text-xs font-bold text-white">{material.value} Écus</span>
        </div>
      </div>
    </RarityFrame>
  );
}
