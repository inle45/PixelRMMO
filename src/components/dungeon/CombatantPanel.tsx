import { AnimatePresence, motion } from "framer-motion";
import AnimatedSprite from "../ui/AnimatedSprite";
import StatusIcon from "./StatusIcon";
import type { Combatant } from "../../data/battleEngine";

export interface FloatingText {
  id: string;
  text: string;
  kind: "damage" | "crit" | "heal" | "miss" | "status";
}

interface CombatantPanelProps {
  combatant: Combatant;
  playing: boolean;
  onFinishAttack?: () => void;
  targetable?: boolean;
  onSelectTarget?: () => void;
  effectivenessBadge?: "weak" | "resist" | "immune" | null;
  effectivenessMultiplier?: number;
  flipped?: boolean;
  size?: "lg" | "sm";
  floatingTexts?: FloatingText[];
  onFloatingTextDone?: (id: string) => void;
}

const FLOAT_COLOR: Record<FloatingText["kind"], string> = {
  damage: "text-white",
  crit: "text-amber-300",
  heal: "text-emerald-300",
  miss: "text-white/50",
  status: "text-violet-300",
};

export default function CombatantPanel({
  combatant,
  playing,
  onFinishAttack,
  targetable,
  onSelectTarget,
  effectivenessBadge,
  effectivenessMultiplier,
  flipped,
  size = "lg",
  floatingTexts = [],
  onFloatingTextDone,
}: CombatantPanelProps) {
  const hpPct = Math.max(0, Math.min(100, (combatant.hp / combatant.maxHp) * 100));
  const manaPct = combatant.maxMana > 0 ? Math.max(0, Math.min(100, (combatant.mana / combatant.maxMana) * 100)) : 0;
  const dim = size === "lg" ? "h-28 w-28" : "h-16 w-16";

  const content = (
    <div className={"flex flex-col items-center gap-1.5 " + (!combatant.alive ? "opacity-35 grayscale" : "")}>
      <div className="relative">
        <AnimatePresence>
          {effectivenessBadge && combatant.alive && (
            <motion.span
              initial={{ opacity: 0, y: 4, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className={
                "absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold shadow-lg " +
                (effectivenessBadge === "weak"
                  ? "bg-emerald-500 text-white"
                  : effectivenessBadge === "immune"
                    ? "bg-slate-600 text-white"
                    : "bg-rose-500/90 text-white")
              }
            >
              {effectivenessBadge === "weak"
                ? `Super Efficace ! ${effectivenessMultiplier ? `(x${effectivenessMultiplier.toFixed(1)})` : ""}`
                : effectivenessBadge === "immune"
                  ? "Immunisé"
                  : "Résiste"}
            </motion.span>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {floatingTexts.map((ft, i) => (
            <motion.span
              key={ft.id}
              initial={{ opacity: 0, y: 0, x: "-50%" }}
              animate={{ opacity: [0, 1, 1, 0], y: -46 }}
              transition={{ duration: 1.1, delay: i * 0.12 }}
              onAnimationComplete={() => onFloatingTextDone?.(ft.id)}
              className={
                "pointer-events-none absolute left-1/2 top-0 z-20 whitespace-nowrap text-sm font-extrabold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] " +
                FLOAT_COLOR[ft.kind] +
                (ft.kind === "crit" ? " text-lg" : "")
              }
            >
              {ft.text}
            </motion.span>
          ))}
        </AnimatePresence>

        <div className={dim + " flex items-center justify-center drop-shadow-[0_8px_14px_rgba(0,0,0,0.5)] " + (flipped ? "-scale-x-100" : "")}>
          <AnimatedSprite
            idleSrc={combatant.portrait}
            idleFrames={combatant.idleFrames}
            attackFrames={combatant.attackFrames}
            playing={playing}
            onFinish={onFinishAttack}
            alt={combatant.name}
          />
        </div>
        {combatant.guarding && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] shadow">
            🛡️
          </span>
        )}
      </div>

      <p className="max-w-[7rem] truncate text-center text-[10px] font-bold text-white sm:text-xs">{combatant.name}</p>

      <div className="w-24 sm:w-28">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-300"
            animate={{ width: `${hpPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        {combatant.maxMana > 0 && (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-300"
              animate={{ width: `${manaPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        )}
      </div>

      {combatant.statuses.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1">
          {combatant.statuses.map((s) => (
            <StatusIcon key={s.id} status={s} />
          ))}
        </div>
      )}
    </div>
  );

  if (targetable) {
    return (
      <button
        type="button"
        onClick={onSelectTarget}
        className="animate-pulse rounded-2xl p-1.5 ring-2 ring-rose-400/70 transition-transform active:scale-95"
      >
        {content}
      </button>
    );
  }

  return <div className="p-1.5">{content}</div>;
}
