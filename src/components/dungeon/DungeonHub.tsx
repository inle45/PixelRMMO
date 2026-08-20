import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DUNGEONS } from "../../data/dungeons";
import { MAX_KEYS, getSettledKeyState, msUntilNextKey } from "../../data/energy";
import { WEATHER, getActiveWeatherIndex, getMsUntilNextWeather } from "../../data/typeSystem";
import skullIcon from "../../assets/icons/items/skull.png";

interface DungeonHubProps {
  onEnter: () => void;
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function DungeonHub({ onEnter }: DungeonHubProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const keyState = getSettledKeyState(now);
  const nextKeyMs = msUntilNextKey(now);
  const activeWeather = WEATHER[getActiveWeatherIndex(now)];
  const msUntilNextWeather = getMsUntilNextWeather(now);
  const dungeon = DUNGEONS[0];

  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col items-center gap-2 pb-6 text-center">
        <span
          className="text-[10px] uppercase tracking-[0.3em] text-lantern-glow/80"
          style={{ fontFamily: "var(--font-pixel)" }}
        >
          Expéditions
        </span>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">⚔️ Donjons & Expéditions</h1>
      </div>

      {/* Key / energy gauge */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wide text-white/60">Clés de Crypte</h3>
          {keyState.count < MAX_KEYS && (
            <span className="font-mono text-[11px] text-white/45">Prochaine dans {formatCountdown(nextKeyMs)}</span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {Array.from({ length: MAX_KEYS }).map((_, i) => (
            <span
              key={i}
              className={
                "text-xl transition-all " + (i < keyState.count ? "opacity-100 drop-shadow-[0_0_6px_rgba(255,179,71,0.65)]" : "opacity-20 grayscale")
              }
            >
              🗝️
            </span>
          ))}
          <span className="ml-auto text-sm font-bold text-white">
            {keyState.count} <span className="text-white/40">/ {MAX_KEYS}</span>
          </span>
        </div>
      </div>

      {/* Live weather header */}
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-2xl">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-12 w-12 flex-none items-center justify-center rounded-xl border border-white/10 bg-black/25"
        >
          {activeWeather.icon && (
            <img src={activeWeather.icon} alt="" className="h-9 w-9 object-contain" style={{ imageRendering: "pixelated" }} />
          )}
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-wide text-lantern-glow">Météo Active</p>
          <h2 className="truncate text-sm font-bold text-white">
            {activeWeather.emoji} {activeWeather.name}
          </h2>
          <div className="mt-1 flex flex-wrap gap-1">
            {activeWeather.modifiers.map((mod) => (
              <span key={mod.label} className="rounded-full border border-white/10 bg-black/25 px-1.5 py-0.5 text-[9px] text-white/60">
                {mod.label} <span className="font-bold text-white/85">{mod.value}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex-none text-right">
          <p className="text-[8px] uppercase tracking-wide text-white/40">Prochain cycle</p>
          <p className="font-mono text-sm font-bold text-white">{formatCountdown(msUntilNextWeather)}</p>
        </div>
      </div>

      {/* Dungeon card */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-rose-400/25 bg-gradient-to-b from-rose-950/40 to-black/30 backdrop-blur-2xl">
        <div className="flex items-center gap-4 p-4">
          <img src={skullIcon} alt="" className="h-14 w-14 flex-none" style={{ imageRendering: "pixelated" }} />
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-rose-300/80">{dungeon.name}</p>
            <h3 className="text-base font-bold text-white">{dungeon.subtitle}</h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[9px] text-white/60">
                Niveau 1 recommandé
              </span>
              <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[9px] text-white/60">3 Vagues</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onEnter}
          disabled={keyState.count < 1}
          className="flex w-full items-center justify-center gap-2 border-t border-rose-400/20 bg-gradient-to-r from-rose-600/80 to-rose-500/70 py-3 text-sm font-bold text-white transition-all hover:from-rose-600 hover:to-rose-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:from-rose-600/80 disabled:hover:to-rose-500/70"
        >
          {keyState.count < 1 ? (
            "Aucune Clé disponible"
          ) : (
            <>
              💀 Entrer dans la Crypte <span className="text-rose-100/80">(Consomme 1 Clé)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
