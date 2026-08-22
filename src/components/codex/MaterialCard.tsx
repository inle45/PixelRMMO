import { RARITY_BY_ID } from "../../data/rarity";
import { CATEGORY_ICONS, CATEGORY_LABELS, type MaterialDef } from "../../data/materials";
import RarityFrame from "./RarityFrame";
import ecuIcon from "../../assets/icons/ecu.png";

interface MaterialCardProps {
  material: MaterialDef;
  /** Both absent for a crafted-only material (an ingot, a cut gem) — it has no source monster. */
  monsterName?: string;
  isOpen: boolean;
  onOpen: () => void;
  onViewMonster?: () => void;
}

export default function MaterialCard({ material, monsterName, isOpen, onOpen, onViewMonster }: MaterialCardProps) {
  const rarity = RARITY_BY_ID[material.rarity];

  // Same FLIP trick as MonsterCard: while the modal twin (same layoutId) is mounted,
  // this slot stays an inert placeholder so the two never coexist with the same layoutId.
  if (isOpen) {
    return <div className="rounded-2xl border border-transparent" aria-hidden />;
  }

  return (
    <RarityFrame rarity={material.rarity} layoutId={`material-card-${material.id}`} onClick={onOpen}>
      <div className="flex h-full flex-col rounded-2xl bg-white/[0.05] p-3 backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-1">
          <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold text-white/60">
            <img src={CATEGORY_ICONS[material.category]} alt="" className="mr-1 inline h-3 w-3 align-[-2px]" style={{ imageRendering: "pixelated" }} />{CATEGORY_LABELS[material.category]}
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ color: rarity.color, backgroundColor: `${rarity.color}22`, border: `1px solid ${rarity.color}66` }}
          >
            {rarity.label}
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

        {onViewMonster && material.provenance && (
          // A span with role="button", not a real <button>: this card's own RarityFrame wrapper
          // already renders as a <button> (see RarityFrame's onClick branch), and a button can
          // never contain another interactive control — the exact trap already documented for
          // MonsterCard's posture toggle, hit here in the opposite direction (outer stays a
          // button, so the inner one has to give).
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onViewMonster();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onViewMonster();
              }
            }}
            className="mt-3 flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5 text-left transition-colors hover:border-lantern/40 hover:bg-black/35"
          >
            <span className="truncate text-[11px] font-medium text-white/70">{monsterName}</span>
            <span className="flex-none text-[11px] font-bold text-lantern-glow">{material.provenance.dropChance}%</span>
          </span>
        )}

        <div className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-black/20 px-2 py-1.5">
          <img src={ecuIcon} alt="" className="h-4 w-4" style={{ imageRendering: "pixelated" }} />
          <span className="text-xs font-bold text-white">{material.value} Écus</span>
        </div>
      </div>
    </RarityFrame>
  );
}
