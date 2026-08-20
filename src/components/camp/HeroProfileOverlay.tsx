import { useMemo } from "react";
import { motion } from "framer-motion";
import type { ClassDefinition, Gender } from "../../data/classes";
import { getInventory, xpIntoLevel, XP_PER_LEVEL } from "../../data/inventory";
import AnimatedSprite from "../ui/AnimatedSprite";
import StatBar from "../ui/StatBar";

interface HeroProfileOverlayProps {
  classDef: ClassDefinition;
  gender: Gender;
  username?: string | null;
  onClose: () => void;
}

export default function HeroProfileOverlay({ classDef, gender, username, onClose }: HeroProfileOverlayProps) {
  const { theme } = classDef;
  const inventory = useMemo(() => getInventory(), []);
  const xp = xpIntoLevel(inventory);
  const xpPct = Math.min(100, Math.round((xp / XP_PER_LEVEL) * 100));

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
        layoutId="hero-avatar-frame"
        className={`relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.6)] ring-1 ${theme.ring}/40`}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={classDef.profileBackground[gender]}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ imageRendering: "pixelated" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/55" />
        <div className="absolute inset-0 bg-black/10" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-sm text-white/80 backdrop-blur transition-colors hover:bg-black/60 hover:text-white"
        >
          ✕
        </button>

        <div className="relative flex flex-col items-center px-6 pb-6 pt-9">
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wider ${theme.badgeBg} ${theme.badgeText}`}
          >
            {classDef.icon} {classDef.badge}
          </span>

          <div className="mt-4 flex h-40 w-40 items-center justify-center drop-shadow-[0_10px_20px_rgba(0,0,0,0.55)]">
            <AnimatedSprite
              idleSrc={classDef.sprites[gender]}
              idleFrames={classDef.idleFrames[gender]}
              alt={classDef.names[gender]}
            />
          </div>

          <h2 className="mt-2 text-xl font-bold text-white">{classDef.names[gender]}</h2>
          {username && <p className="text-xs font-medium text-white/50">@{username}</p>}
          <p className="mt-1 text-[11px] text-white/45">{classDef.role}</p>

          <div className="mt-5 w-full">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-lantern-glow">NIVEAU {inventory.level}</span>
              <span className="text-white/55">
                {xp} / {XP_PER_LEVEL} XP
              </span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full border border-white/10 bg-black/40">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-lantern to-lantern-glow"
                initial={{ width: 0 }}
                animate={{ width: `${xpPct}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.25 }}
              />
            </div>
          </div>

          <div className="mt-5 grid w-full gap-2.5">
            {classDef.stats.map((s) => (
              <StatBar key={s.label} {...s} />
            ))}
          </div>

          <div className={`mt-5 w-full rounded-xl border ${theme.border} bg-black/35 p-3 backdrop-blur-sm`}>
            <p className={`text-[11px] font-bold uppercase tracking-wide ${theme.badgeText}`}>
              Passif · {classDef.passive.name}
            </p>
            <p className="mt-1 text-xs leading-snug text-white/70">{classDef.passive.description}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
