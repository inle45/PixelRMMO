import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { BattleResult } from "./TurnBattleArena";
import { getInventory, xpIntoLevel, XP_PER_LEVEL } from "../../data/inventory";
import { getSettledKeyState } from "../../data/energy";
import { RARITY_BY_ID } from "../../data/rarity";
import { CATEGORY_ICONS } from "../../data/materials";
import RarityFrame from "../codex/RarityFrame";
import ecuIcon from "../../assets/icons/ecu.png";
import chestOpen from "../../assets/dungeon/chest-open.png";

const chestFrameModules = import.meta.glob("../../assets/dungeon/chest/*.png", { eager: true, import: "default" }) as Record<
  string,
  string
>;
const CHEST_FRAMES = Array.from({ length: 7 }, (_, i) => {
  const entry = Object.entries(chestFrameModules).find(([path]) => path.endsWith(`/chest-${i}.png`));
  return entry?.[1] ?? "";
}).filter(Boolean);

const CONFETTI_COLORS = ["#ffb347", "#ffcf6b", "#facc15", "#f97316", "#fde68a"];

interface DungeonSummaryModalProps {
  result: BattleResult;
  onReplay: () => void;
  onReturnToCamp: () => void;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return value;
}

export default function DungeonSummaryModal({ result, onReplay, onReturnToCamp }: DungeonSummaryModalProps) {
  const [stored, setStored] = useState(false);
  const [chestFrame, setChestFrame] = useState(0);
  const [chestDone, setChestDone] = useState(() => !result.victory || CHEST_FRAMES.length === 0);
  const ecuCount = useCountUp(result.victory ? result.ecus : 0);

  const inventory = useMemo(() => getInventory(), []);
  const xpIntoCurrentLevel = xpIntoLevel(inventory);
  const xpPct = Math.min(100, Math.round((xpIntoCurrentLevel / XP_PER_LEVEL) * 100));
  const hasKey = getSettledKeyState().count >= 1;

  useEffect(() => {
    if (chestDone) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      if (i >= CHEST_FRAMES.length) {
        clearInterval(id);
        setChestDone(true);
      } else {
        setChestFrame(i);
      }
    }, 110);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/85 p-4 py-8 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {result.victory ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 24 }}
          className="w-full max-w-md overflow-hidden rounded-3xl border border-lantern/30 bg-gradient-to-b from-[#1a1004] to-[#0b0f1a] shadow-[0_25px_70px_rgba(0,0,0,0.65)]"
        >
          <div className="relative flex flex-col items-center gap-2 overflow-hidden bg-gradient-to-b from-lantern/20 via-transparent to-transparent px-6 pb-4 pt-8">
            {chestDone && (
              <>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ opacity: [0.4, 0.85, 0.4], scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="h-40 w-40 rounded-full bg-lantern/30 blur-2xl"
                  />
                </div>
                {Array.from({ length: 16 }).map((_, i) => (
                  <motion.span
                    key={i}
                    className="pointer-events-none absolute left-1/2 top-1/3 h-1.5 w-1.5 rounded-sm"
                    style={{ backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }}
                    initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
                    animate={{
                      opacity: 0,
                      x: (Math.cos((i / 16) * Math.PI * 2) * (60 + (i % 5) * 12)),
                      y: (Math.sin((i / 16) * Math.PI * 2) * (40 + (i % 4) * 10)) - 20,
                      rotate: 180,
                    }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                  />
                ))}
              </>
            )}
            <span className="relative text-xs font-bold uppercase tracking-[0.3em] text-lantern-glow">Victoire !</span>
            <motion.img
              src={chestDone ? chestOpen : CHEST_FRAMES[chestFrame] || chestOpen}
              alt="Coffre"
              className="relative h-28 w-28 object-contain drop-shadow-[0_10px_20px_rgba(255,179,71,0.4)]"
              style={{ imageRendering: "pixelated" }}
              animate={chestDone ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <h2 className="relative text-lg font-bold text-white">La Crypte est Nettoyée !</h2>
          </div>

          <div className="max-h-[65vh] overflow-y-auto px-5 pb-5">
            {/* Combat stats */}
            <div className="grid grid-cols-4 gap-2 rounded-xl border border-white/10 bg-black/25 p-3">
              <Stat label="Temps" value={formatElapsed(result.elapsedMs)} />
              <Stat label="Vaincus" value={String(result.monstersDefeated)} />
              <Stat label="Dégâts" value={String(result.totalDamageDealt)} />
              <Stat label="Critiques" value={String(result.criticalHits)} />
            </div>

            {/* XP bar */}
            <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-lantern-glow">NIVEAU {inventory.level}</span>
                <span className="text-white/55">
                  {xpIntoCurrentLevel} / {XP_PER_LEVEL} XP <span className="text-emerald-400">(+{result.xpGained})</span>
                </span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full border border-white/10 bg-black/40">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-lantern to-lantern-glow"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPct}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                />
              </div>
              {result.leveledUp && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, type: "spring", stiffness: 300 }}
                  className="mt-2 text-center text-sm font-extrabold text-lantern-glow"
                  style={{ fontFamily: "var(--font-pixel)" }}
                >
                  ⭐ LEVEL UP ! Niveau {result.previousLevel} → {result.newLevel} ⭐
                </motion.p>
              )}
            </div>

            {/* Écus */}
            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/25 p-3">
              <img src={ecuIcon} alt="" className="h-8 w-8" style={{ imageRendering: "pixelated" }} />
              <span className="text-xl font-extrabold text-white">+{ecuCount}</span>
              <span className="text-xs font-medium text-white/50">Écus récoltés</span>
            </div>

            {/* Loot cards */}
            {result.lootCards.length > 0 && (
              <div className="mt-3">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/60">Butin Obtenu</h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {result.lootCards.map((card) => (
                    <RarityFrame key={card.materialId} rarity={card.rarity} radius="rounded-xl">
                      <div className="flex flex-col items-center gap-1 p-2 text-center">
                        <div className="flex h-10 w-10 items-center justify-center">
                          {card.icon && (
                            <img src={card.icon} alt="" className="h-full w-full object-contain" style={{ imageRendering: "pixelated" }} />
                          )}
                        </div>
                        <p className="w-full truncate text-[9px] font-bold text-white">{card.name}</p>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px]">{CATEGORY_ICONS[card.category]}</span>
                          <span className="text-[9px] font-bold" style={{ color: RARITY_BY_ID[card.rarity].color }}>
                            x{card.count}
                          </span>
                        </div>
                      </div>
                    </RarityFrame>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setStored(true)}
                disabled={stored}
                className="w-full rounded-xl bg-gradient-to-r from-lantern via-lantern-glow to-mercenary py-2.5 text-sm font-bold text-[#1a1004] shadow-[0_4px_16px_rgba(255,179,71,0.35)] transition-all active:scale-[0.98] disabled:opacity-70"
              >
                {stored ? "✓ Rangé dans le Sac" : "🎒 Tout Ranger dans le Sac"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onReplay}
                  disabled={!hasKey}
                  className="rounded-xl border border-rose-400/30 bg-rose-500/15 py-2.5 text-xs font-bold text-rose-200 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ⚔️ Rejouer (1 Clé)
                </button>
                <button
                  type="button"
                  onClick={onReturnToCamp}
                  className="rounded-xl border border-white/15 bg-white/[0.06] py-2.5 text-xs font-bold text-white/85 transition-all active:scale-[0.98]"
                >
                  🏰 Retour au Camp
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 24 }}
          className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#12101a] shadow-[0_25px_70px_rgba(0,0,0,0.65)]"
        >
          <div className="flex flex-col items-center gap-2 border-b border-white/10 bg-black/30 px-6 py-8 text-center">
            <span className="text-3xl">💀</span>
            <h2 className="text-lg font-bold text-white/85">La Crypte t'a Vaincu...</h2>
            <p className="text-xs text-white/45">Le Roi Squelette veille encore sur ses ossements.</p>
          </div>

          <div className="px-6 py-5">
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-black/25 p-3">
              <Stat label="Temps" value={formatElapsed(result.elapsedMs)} />
              <Stat label="Vaincus" value={String(result.monstersDefeated)} />
              <Stat label="Dégâts" value={String(result.totalDamageDealt)} />
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3 text-center">
              <p className="text-[11px] text-white/55">
                Gain de consolation : <span className="font-bold text-emerald-400">+{result.xpGained} XP</span> (25%)
              </p>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50">Conseils Stratégiques</p>
              <ul className="space-y-1 text-[11px] leading-snug text-white/60">
                <li>• Utilise ✨ Sorts contre les faiblesses élémentaires signalées "Super Efficace".</li>
                <li>• 🛡️ Garde réduit de 50% les dégâts en attendant tes potions ou ton mana.</li>
                <li>• Garde un œil sur la Météo active : elle amplifie certains types de dégâts.</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={onReturnToCamp}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-lantern via-lantern-glow to-mercenary py-2.5 text-sm font-bold text-[#1a1004] shadow-[0_4px_16px_rgba(255,179,71,0.35)] transition-all active:scale-[0.98]"
            >
              🏰 Retourner au Campement
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-sm font-extrabold text-white">{value}</span>
      <span className="text-[8px] font-medium uppercase tracking-wide text-white/40">{label}</span>
    </div>
  );
}
