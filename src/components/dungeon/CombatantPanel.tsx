import { AnimatePresence, motion } from "framer-motion";
import AnimatedSprite from "../ui/AnimatedSprite";
import OneShotFx from "./OneShotFx";
import StatusIcon from "./StatusIcon";
import guardIcon from "../../assets/icons/dungeon/guard.png";
import { IMPACT_BURST_FRAMES, DEATH_DISSOLVE_FRAMES, type ImpactBurst, type DeathBurst } from "../../data/battleVfx";
import type { Combatant } from "../../data/battleEngine";

export interface FloatingText {
  id: string;
  text: string;
  kind: "damage" | "crit" | "heal" | "miss" | "status" | "shield";
}

interface CombatantPanelProps {
  combatant: Combatant;
  playing: boolean;
  onFinishAttack?: () => void;
  targetable?: boolean;
  onSelectTarget?: () => void;
  effectivenessBadge?: "weak" | "immune" | null;
  effectivenessMultiplier?: number;
  size?: "lg" | "sm";
  floatingTexts?: FloatingText[];
  onFloatingTextDone?: (id: string) => void;
  impactBursts?: ImpactBurst[];
  onImpactBurstDone?: (id: string) => void;
  deathBursts?: DeathBurst[];
  onDeathBurstDone?: (id: string) => void;
}

const FLOAT_STYLE: Record<FloatingText["kind"], string> = {
  damage: "text-white",
  crit: "text-amber-300",
  heal: "text-emerald-300",
  miss: "text-white/60",
  status: "text-violet-300",
  shield: "text-sky-300",
};

export default function CombatantPanel({
  combatant,
  playing,
  onFinishAttack,
  targetable,
  onSelectTarget,
  effectivenessBadge,
  effectivenessMultiplier,
  size = "lg",
  floatingTexts = [],
  onFloatingTextDone,
  impactBursts = [],
  onImpactBurstDone,
  deathBursts = [],
  onDeathBurstDone,
}: CombatantPanelProps) {
  const hpPct = Math.max(0, Math.min(100, (combatant.hp / combatant.maxHp) * 100));
  const manaPct = combatant.maxMana > 0 ? Math.max(0, Math.min(100, (combatant.mana / combatant.maxMana) * 100)) : 0;
  const dim = size === "lg" ? "h-32 w-32" : "h-20 w-20";
  const isHero = combatant.side === "hero";

  const content = (
    <motion.div
      className="relative flex flex-col items-center"
      animate={{ opacity: combatant.alive ? 1 : 0.3, filter: combatant.alive ? "grayscale(0)" : "grayscale(1)" }}
      transition={{ duration: 0.6 }}
    >
      {/* Floating HUD — no card, no border, just glowing bars over the head */}
      <div className="z-10 mb-1 flex flex-col items-center gap-0.5">
        <p className="max-w-[7rem] truncate text-center text-[10px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] sm:text-xs">
          {combatant.name}
        </p>
        <div className="w-20 sm:w-24">
          <div className="h-[5px] w-full overflow-hidden rounded-full bg-black/40 backdrop-blur-sm">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-300 shadow-[0_0_6px_rgba(244,63,94,0.9)]"
              animate={{ width: `${hpPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          {combatant.maxMana > 0 && (
            <div className="mt-0.5 h-[3px] w-full overflow-hidden rounded-full bg-black/40 backdrop-blur-sm">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-300 shadow-[0_0_5px_rgba(56,189,248,0.9)]"
                animate={{ width: `${manaPct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          )}
        </div>
        {combatant.statuses.length > 0 && (
          <div className="flex flex-wrap justify-center gap-0.5">
            {combatant.statuses.map((s) => (
              <StatusIcon key={s.id} status={s} />
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <AnimatePresence>
          {effectivenessBadge && combatant.alive && (
            <motion.span
              initial={{ opacity: 0, y: 4, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className={
                "absolute -top-4 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold shadow-lg " +
                (effectivenessBadge === "weak" ? "bg-emerald-500 text-white" : "bg-slate-600 text-white")
              }
            >
              {effectivenessBadge === "weak"
                ? `SUPER EFFICACE ${effectivenessMultiplier ? `x${effectivenessMultiplier.toFixed(1)}` : ""}`
                : "IMMUNISÉ"}
            </motion.span>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {floatingTexts.map((ft, i) => (
            <motion.span
              key={ft.id}
              initial={{ opacity: 0, y: 0, x: "-50%" }}
              animate={{ opacity: [0, 1, 1, 0], y: -52 }}
              transition={{ duration: 1.15, delay: i * 0.12 }}
              onAnimationComplete={() => onFloatingTextDone?.(ft.id)}
              className={
                "pointer-events-none absolute left-1/2 top-2 z-30 whitespace-nowrap text-sm font-extrabold drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] " +
                FLOAT_STYLE[ft.kind] +
                (ft.kind === "crit" ? " text-lg" : "")
              }
            >
              {ft.text}
            </motion.span>
          ))}
        </AnimatePresence>

        {isHero && (
          <motion.div
            className="absolute -bottom-2 left-1/2 h-7 w-24 -translate-x-1/2 rounded-full"
            style={{ background: "radial-gradient(closest-side, rgba(255,207,107,0.4), transparent 75%)" }}
            animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.92, 1.05, 0.92] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <div className="absolute bottom-0 left-1/2 h-4 w-20 -translate-x-1/2 rounded-[50%] bg-black/60 blur-[4px]" />

        <div
          className={dim + " relative flex items-center justify-center"}
          style={{ filter: "drop-shadow(0 10px 16px rgba(0,0,0,0.65)) brightness(0.93) contrast(1.06) saturate(0.9)" }}
        >
          <AnimatedSprite
            idleSrc={combatant.portrait}
            idleFrames={combatant.idleFrames}
            attackFrames={combatant.attackFrames}
            playing={playing}
            onFinish={onFinishAttack}
            alt={combatant.name}
          />

          {impactBursts.map((burst) => (
            <div key={burst.id} className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <motion.div
                className="absolute h-2/3 w-2/3 rounded-full"
                style={{ background: `radial-gradient(circle, ${burst.color}cc, transparent 70%)` }}
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: [0, 0.9, 0], scale: [0.3, 1.3, 1.5] }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              <OneShotFx
                frames={IMPACT_BURST_FRAMES}
                frameDuration={55}
                onDone={() => onImpactBurstDone?.(burst.id)}
                className="absolute h-full w-full object-contain"
                style={{ mixBlendMode: "screen" }}
              />
            </div>
          ))}

          {deathBursts.map((burst) => (
            <div key={burst.id} className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <OneShotFx
                frames={DEATH_DISSOLVE_FRAMES}
                frameDuration={70}
                onDone={() => onDeathBurstDone?.(burst.id)}
                className="absolute h-full w-full scale-125 object-contain opacity-90"
              />
            </div>
          ))}
        </div>

        {combatant.guarding && (
          <span className="absolute -right-1 -top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 shadow">
            <img src={guardIcon} alt="" className="h-3.5 w-3.5 object-contain" style={{ imageRendering: "pixelated" }} />
          </span>
        )}
      </div>
    </motion.div>
  );

  if (targetable) {
    return (
      <button
        type="button"
        onClick={onSelectTarget}
        className="animate-pulse rounded-2xl p-1 ring-2 ring-rose-400/70 transition-transform active:scale-95"
      >
        {content}
      </button>
    );
  }

  return content;
}
