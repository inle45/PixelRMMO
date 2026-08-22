import { useState } from "react";
import { motion } from "framer-motion";
import { STAT_SCALE, type MonsterDef } from "../../data/bestiary";
import AnimatedSprite from "../ui/AnimatedSprite";
import StatBar from "../ui/StatBar";
import RarityBadge from "./RarityBadge";
import { FAMILY_THEME } from "./theme";

type Posture = "idle" | "attack";

interface MonsterCardProps {
  monster: MonsterDef;
  isOpen: boolean;
  onOpen: () => void;
}

export default function MonsterCard({ monster, isOpen, onOpen }: MonsterCardProps) {
  const [posture, setPosture] = useState<Posture>("idle");
  const theme = FAMILY_THEME[monster.family];
  const frames = posture === "idle" ? monster.idleFrames : monster.attackFrames;

  // While the modal twin (same layoutId) is mounted, this slot must stay empty —
  // two mounted elements sharing a layoutId would fight over the FLIP animation.
  if (isOpen) {
    return <div className="rounded-2xl border border-transparent" aria-hidden />;
  }

  return (
    // A div with role="button", NOT a <button>: the posture toggle below is a pair of real nested
    // <button>s, and a button can never contain another interactive control — invalid HTML that
    // React 19 reports as a hydration error on every render. Same trap already documented for
    // DialogueBox's ✕ control.
    <motion.div
      role="button"
      tabIndex={0}
      layoutId={`monster-card-${monster.id}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className={`group flex cursor-pointer flex-col rounded-2xl border bg-white/[0.05] p-3 text-left backdrop-blur-2xl transition-colors hover:bg-white/[0.08] ${theme.border}`}
    >
      <div className="flex items-start justify-between gap-1">
        <RarityBadge rarity={monster.rarity} />
        <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold text-white/50">
          Niv. {monster.level}
        </span>
      </div>

      <div className={`relative mx-auto mt-1 flex h-24 w-24 items-center justify-center rounded-xl border ${theme.border} bg-black/25`}>
        <AnimatedSprite idleSrc={monster.portrait} idleFrames={frames} alt={monster.name} idleFrameDuration={180} />
      </div>

      <div
        role="group"
        aria-label="Posture"
        onClick={(e) => e.stopPropagation()}
        className="mx-auto mt-2 flex gap-1 rounded-full border border-white/10 bg-black/25 p-0.5 text-[10px] font-bold"
      >
        <button
          type="button"
          onClick={() => setPosture("idle")}
          className={`rounded-full px-2 py-0.5 transition-colors ${posture === "idle" ? `${theme.accentBg} ${theme.accentText}` : "text-white/40"}`}
        >
          Repos
        </button>
        <button
          type="button"
          onClick={() => setPosture("attack")}
          disabled={monster.attackFrames.length === 0}
          className={`rounded-full px-2 py-0.5 transition-colors disabled:opacity-30 ${posture === "attack" ? `${theme.accentBg} ${theme.accentText}` : "text-white/40"}`}
        >
          Attaque
        </button>
      </div>

      <h3 className="mt-2 text-center text-sm font-bold leading-tight text-white">{monster.name}</h3>

      {/* The signature move, on the card itself — it used to be buried in the modal, so a monster
          read as having no special ability at all until you opened it. Name only here; the full
          rules text stays in the modal where there's room for it. */}
      <p className={`mt-1.5 flex items-center justify-center gap-1 text-[10px] font-semibold leading-tight ${theme.accentText}`}>
        {monster.skillIcon && (
          <img src={monster.skillIcon} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" style={{ imageRendering: "pixelated" }} />
        )}
        <span className="truncate">{monster.skill.name}</span>
      </p>

      <div className="mt-2.5 flex flex-col gap-1.5">
        <StatBar label="PV" value={monster.stats.hp} max={STAT_SCALE.hp} display={String(monster.stats.hp)} color="bg-gradient-to-r from-rose-500 to-rose-300" />
        <StatBar
          label="ATK"
          value={monster.stats.atk}
          max={STAT_SCALE.atk}
          display={monster.damageType === "magic" ? `${monster.stats.atk} Mag.` : String(monster.stats.atk)}
          color="bg-gradient-to-r from-orange-500 to-orange-300"
        />
        <StatBar label="DEF" value={monster.stats.def} max={STAT_SCALE.def} display={String(monster.stats.def)} color="bg-gradient-to-r from-sky-500 to-sky-300" />
        <StatBar label="VIT" value={monster.stats.speedValue} max={STAT_SCALE.speed} display={monster.stats.speedLabel} color="bg-gradient-to-r from-cyan-500 to-cyan-300" />
      </div>
    </motion.div>
  );
}
