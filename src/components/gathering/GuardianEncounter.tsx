import { useState } from "react";
import { motion } from "framer-motion";
import AnimatedSprite from "../ui/AnimatedSprite";
import { RARITY_LABELS, type MonsterDef } from "../../data/bestiary";
import { MATERIAL_BY_ID } from "../../data/materials";
import { applyRewards } from "../../data/inventory";

interface GuardianEncounterProps {
  guardian: MonsterDef;
  /** Resolved: the player either beat it (harvest is secured + loot) or fled (harvest lost). */
  onResolve: (result: { won: boolean; fled: boolean }) => void;
}

/**
 * A compact stand-off, deliberately NOT the full TurnBattleArena.
 *
 * That arena is a three-wave dungeon run built around `waves.ts` and a per-run consumable pool —
 * wiring a single mid-gathering interruption through it would mean either faking a one-wave "run"
 * or teaching it a second lifecycle. This is a short exchange instead: trade blows until one side
 * drops, with fleeing always available at the cost of the mushrooms already cut.
 */
export default function GuardianEncounter({ guardian, onResolve }: GuardianEncounterProps) {
  const [hp, setHp] = useState(guardian.stats.hp);
  const [heroHp, setHeroHp] = useState(100);
  const [attacking, setAttacking] = useState(false);
  const [log, setLog] = useState<string>("Le gardien se dresse devant vous.");

  const maxHp = guardian.stats.hp;

  function strike() {
    if (attacking) return;
    setAttacking(true);

    // Hero damage scales off the guardian's own defence so every tier stays a handful of exchanges
    // rather than one tier being a one-shot and another a slog.
    const dealt = Math.max(6, Math.round(maxHp / 6 + (Math.random() * maxHp) / 12));
    const nextHp = Math.max(0, hp - dealt);
    setHp(nextHp);

    if (nextHp <= 0) {
      const ecus = Math.round(guardian.stats.hp / 6);
      const materials: Record<string, number> = {};
      for (const drop of guardian.drops) {
        if (drop.materialId && Math.random() * 100 < drop.chance) materials[drop.materialId] = 1;
      }
      applyRewards({ ecus, xp: guardian.stats.hp, materials });
      setLog(`${guardian.name} s'effondre — la récolte est sécurisée.`);
      setTimeout(() => onResolve({ won: true, fled: false }), 700);
      return;
    }

    const taken = Math.max(3, Math.round(guardian.stats.atk / 2));
    const nextHero = Math.max(0, heroHp - taken);
    setHeroHp(nextHero);
    setLog(`-${dealt} au gardien · -${taken} PV pour vous`);

    if (nextHero <= 0) {
      setTimeout(() => onResolve({ won: false, fled: false }), 700);
      return;
    }
    setTimeout(() => setAttacking(false), 420);
  }

  const lootNames = guardian.drops
    .filter((d) => d.materialId)
    .map((d) => MATERIAL_BY_ID[d.materialId!]?.name)
    .filter(Boolean);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-[#12111a]/95 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">{guardian.name}</p>
            <p className="text-[10px] text-white/45">
              Niv. {guardian.level} · {RARITY_LABELS[guardian.rarity]}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-rose-500/15 px-2 py-1 text-[10px] font-bold text-rose-300">Gardien réveillé</span>
        </div>

        <div className="relative mx-auto mt-3 flex h-36 w-36 items-center justify-center">
          <motion.div
            animate={attacking ? { x: [0, -8, 6, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="h-full w-full"
            style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.6))" }}
          >
            <AnimatedSprite idleSrc={guardian.portrait} idleFrames={guardian.idleFrames} alt={guardian.name} />
          </motion.div>
        </div>

        <div className="mt-2 space-y-1.5">
          <Bar label="Gardien" value={hp} max={maxHp} color="#f43f5e" />
          <Bar label="Vous" value={heroHp} max={100} color="#34d399" />
        </div>

        <p className="mt-2 text-center text-[11px] text-white/60">{log}</p>

        {lootNames.length > 0 && (
          <p className="mt-1 text-center text-[9px] text-white/35">Butin possible : {lootNames.join(", ")}</p>
        )}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={strike}
            disabled={attacking}
            className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-3 py-2.5 text-xs font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Frapper
          </button>
          <button
            type="button"
            onClick={() => onResolve({ won: false, fled: true })}
            className="flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-xs font-bold text-white/70 transition-colors hover:bg-black/60"
          >
            Fuir
          </button>
        </div>
        <p className="mt-1.5 text-center text-[9px] text-white/30">Fuir abandonne les champignons en cours de coupe.</p>
      </div>
    </motion.div>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[9px] font-bold uppercase tracking-wide text-white/40">
        <span>{label}</span>
        <span>
          {value}/{max}
        </span>
      </div>
      <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-black/50">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          animate={{ width: `${(value / max) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}
