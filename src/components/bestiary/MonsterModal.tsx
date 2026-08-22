import { useState } from "react";
import { motion } from "framer-motion";
import { FAMILY_LABELS, STAT_SCALE, type MonsterDef } from "../../data/bestiary";
import { MATERIAL_BY_ID } from "../../data/materials";
import AnimatedSprite from "../ui/AnimatedSprite";
import StatBar from "../ui/StatBar";
import RarityBadge from "./RarityBadge";
import { FAMILY_THEME } from "./theme";
import ecuIcon from "../../assets/icons/ecu.png";

type Posture = "idle" | "attack";

interface MonsterModalProps {
  monster: MonsterDef;
  onClose: () => void;
  onViewMaterial?: (materialId: string) => void;
}

export default function MonsterModal({ monster, onClose, onViewMaterial }: MonsterModalProps) {
  const [posture, setPosture] = useState<Posture>("idle");
  const theme = FAMILY_THEME[monster.family];
  const frames = posture === "idle" ? monster.idleFrames : monster.attackFrames;

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/75 p-4 py-8 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        layoutId={`monster-card-${monster.id}`}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-sm rounded-3xl border bg-[#12111a]/95 p-5 shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl ${theme.border} ${theme.glow}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-sm text-white/80 backdrop-blur transition-colors hover:bg-black/60 hover:text-white"
        >
          ✕
        </button>

        <div className="flex items-start justify-between gap-2 pr-8">
          <RarityBadge rarity={monster.rarity} />
          <span className="rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-bold text-white/50">
            Niv. {monster.level}
          </span>
        </div>

        <div className={`relative mx-auto mt-3 flex h-40 w-40 items-center justify-center rounded-2xl border ${theme.border} bg-black/25`}>
          <AnimatedSprite idleSrc={monster.portrait} idleFrames={frames} alt={monster.name} idleFrameDuration={180} />
        </div>

        <div
          role="group"
          aria-label="Posture"
          className="mx-auto mt-3 flex w-fit gap-1 rounded-full border border-white/10 bg-black/25 p-0.5 text-[11px] font-bold"
        >
          <button
            type="button"
            onClick={() => setPosture("idle")}
            className={`rounded-full px-3 py-1 transition-colors ${posture === "idle" ? `${theme.accentBg} ${theme.accentText}` : "text-white/40"}`}
          >
            Repos
          </button>
          <button
            type="button"
            onClick={() => setPosture("attack")}
            disabled={monster.attackFrames.length === 0}
            className={`rounded-full px-3 py-1 transition-colors disabled:opacity-30 ${posture === "attack" ? `${theme.accentBg} ${theme.accentText}` : "text-white/40"}`}
          >
            Attaque
          </button>
        </div>

        <div className="mt-3 text-center">
          <h2 className="text-lg font-bold text-white">{monster.name}</h2>
          <p className={`mt-0.5 text-[11px] font-medium uppercase tracking-wide ${theme.accentText}`}>
            {FAMILY_LABELS[monster.family]}
          </p>
        </div>

        <div className="mt-4 grid gap-1.5">
          <StatBar label="PV" value={monster.stats.hp} max={STAT_SCALE.hp} display={String(monster.stats.hp)} color="bg-gradient-to-r from-rose-500 to-rose-300" />
          <StatBar
            label="ATK"
            value={monster.stats.atk}
            max={STAT_SCALE.atk}
            display={monster.damageType === "magic" ? `${monster.stats.atk} Magique` : String(monster.stats.atk)}
            color="bg-gradient-to-r from-orange-500 to-orange-300"
          />
          <StatBar label="DEF" value={monster.stats.def} max={STAT_SCALE.def} display={String(monster.stats.def)} color="bg-gradient-to-r from-sky-500 to-sky-300" />
          <StatBar label="VIT" value={monster.stats.speedValue} max={STAT_SCALE.speed} display={monster.stats.speedLabel} color="bg-gradient-to-r from-cyan-500 to-cyan-300" />
          {monster.extraStats.map((s) => (
            <StatBar key={s.label} label={s.label} value={s.value} max={100} display={s.display} color="bg-gradient-to-r from-fuchsia-500 to-fuchsia-300" />
          ))}
        </div>

        {monster.traits.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {monster.traits.map((t) => (
              <span key={t} className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[10px] font-medium text-white/60">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className={`mt-4 rounded-xl border ${theme.border} bg-black/30 p-3`}>
          <p className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${theme.accentText}`}>
            {monster.skillIcon && (
              <img src={monster.skillIcon} alt="" className="h-4 w-4 object-contain" style={{ imageRendering: "pixelated" }} />
            )}
            {monster.skill.name}
          </p>
          <p className="mt-1 text-xs leading-snug text-white/70">{monster.skill.description}</p>
        </div>

        <p className="mt-4 text-xs italic leading-relaxed text-white/50">{monster.lore}</p>

        <div className="mt-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-white/60">Butin</h3>
          <div className="mt-2 flex flex-col gap-1.5">
            {monster.drops.map((drop) => {
              const material = drop.materialId ? MATERIAL_BY_ID[drop.materialId] : undefined;
              const icon = drop.currency ? ecuIcon : material?.icon;
              const rowContent = (
                <>
                  <span className="flex min-w-0 items-center gap-2 text-white/75">
                    {icon && (
                      <img
                        src={icon}
                        alt=""
                        className="h-5 w-5 flex-none object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                    )}
                    <span className="truncate">
                      {drop.name}
                      {drop.currency && drop.min != null && ` (${drop.min}-${drop.max})`}
                    </span>
                  </span>
                  <span className={`flex-none font-bold ${theme.accentText}`}>{drop.chance}%</span>
                </>
              );

              return material ? (
                <button
                  key={drop.name}
                  type="button"
                  onClick={() => onViewMaterial?.(material.id)}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-left text-xs transition-colors hover:border-lantern/40 hover:bg-black/35"
                >
                  {rowContent}
                </button>
              ) : (
                <div
                  key={drop.name}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs"
                >
                  {rowContent}
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
