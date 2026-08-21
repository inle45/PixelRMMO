import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BESTIARY } from "../../data/bestiary";
import {
  DAMAGE_TYPES,
  STATUSES,
  WEATHER,
  TYPE_BY_ID,
  STATUS_BY_ID,
  WEAK_VS_BY_ID,
  getActiveWeatherIndex,
  getMsUntilNextWeather,
  type DamageTypeId,
} from "../../data/typeSystem";

interface TypeMatrixCompendiumProps {
  onViewMonster: (monsterId: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  dot: "Dégâts sur la durée",
  control: "Contrôle",
  debuff: "Affaiblissement",
  buff: "Bénédiction",
};

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function TypeMatrixCompendium({ onViewMonster }: TypeMatrixCompendiumProps) {
  const [now, setNow] = useState(() => Date.now());
  const [selectedType, setSelectedType] = useState<DamageTypeId | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const activeWeather = WEATHER[getActiveWeatherIndex(now)];
  const msUntilNext = getMsUntilNextWeather(now);

  const selectedDef = selectedType ? TYPE_BY_ID[selectedType] : null;
  const weakVs = selectedType ? WEAK_VS_BY_ID[selectedType] ?? [] : [];

  const monsters = useMemo(
    () => (selectedType ? BESTIARY.filter((m) => m.combat.combatTypes.includes(selectedType)) : BESTIARY),
    [selectedType]
  );

  return (
    <div>
      <div className="flex flex-col items-center gap-2 pb-6 text-center">
        <span className="text-[10px] uppercase tracking-[0.3em] text-lantern-glow/80" style={{ fontFamily: "var(--font-pixel)" }}>
          Crypte Ancestrale
        </span>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Types & Météo</h1>
        <p className="max-w-md text-sm text-white/55">
          Les affinités élémentaires, les statuts de combat et les cycles météorologiques de la crypte.
        </p>
      </div>

      {/* Active weather banner */}
      <div className="mx-auto mb-8 flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-2xl">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-14 w-14 flex-none items-center justify-center rounded-xl border border-white/10 bg-black/25"
        >
          {activeWeather.icon && (
            <img src={activeWeather.icon} alt="" className="h-10 w-10 object-contain" style={{ imageRendering: "pixelated" }} />
          )}
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-lantern-glow">Météo Active</p>
          <h2 className="truncate text-base font-bold text-white">
            {activeWeather.name}
          </h2>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {activeWeather.modifiers.map((mod) => (
              <span key={mod.label} className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[10px] text-white/65">
                {mod.label} <span className="font-bold text-white/90">{mod.value}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex-none text-right">
          <p className="text-[9px] uppercase tracking-wide text-white/40">Prochain cycle</p>
          <p className="font-mono text-lg font-bold text-white">{formatCountdown(msUntilNext)}</p>
        </div>
      </div>

      {/* Type matrix */}
      <section className="mb-8">
        <h3 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-white/60">Table des Types</h3>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {DAMAGE_TYPES.map((t) => {
            const active = selectedType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedType(active ? null : t.id)}
                className="flex flex-col items-center gap-1 rounded-xl border px-3 py-2 transition-all"
                style={{
                  borderColor: active ? t.color : `${t.color}40`,
                  backgroundColor: active ? `${t.color}25` : "rgba(255,255,255,0.03)",
                }}
              >
                {t.icon && <img src={t.icon} alt="" className="h-8 w-8 object-contain" style={{ imageRendering: "pixelated" }} />}
                <span className="text-[10px] font-bold" style={{ color: active ? t.color : "rgba(255,255,255,0.7)" }}>
                  {t.name}
                </span>
              </button>
            );
          })}
        </div>

        {selectedDef && (
          <div className="mx-auto mt-4 max-w-md rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-center text-xs italic text-white/55">{selectedDef.description}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-emerald-400">Fort contre</p>
                <div className="flex flex-wrap justify-center gap-1">
                  {selectedDef.strongVs.length === 0 && <span className="text-[10px] text-white/30">—</span>}
                  {selectedDef.strongVs.map((id) => (
                    <TypePill key={id} typeId={id} tone="strong" />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-rose-400">Faible contre</p>
                <div className="flex flex-wrap justify-center gap-1">
                  {weakVs.length === 0 && <span className="text-[10px] text-white/30">—</span>}
                  {weakVs.map((id) => (
                    <TypePill key={id} typeId={id} tone="weak" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Status effects */}
      <section className="mb-8">
        <h3 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-white/60">Statuts de Combat</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATUSES.map((s) => (
            <div key={s.id} className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-black/25">
                {s.icon && <img src={s.icon} alt="" className="h-9 w-9 object-contain" style={{ imageRendering: "pixelated" }} />}
              </div>
              <h4 className="text-xs font-bold text-white">
                {s.name}
              </h4>
              <p className="text-[9px] uppercase tracking-wide text-white/40">{CATEGORY_LABELS[s.category]}</p>
              <p className="text-[10px] leading-snug text-white/55">{s.description}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-lantern-glow">{s.formula}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Monster list filtered by type */}
      <section>
        <h3 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-white/60">
          Créatures {selectedDef ? `— Type ${selectedDef.name}` : `(${monsters.length})`}
        </h3>
        {monsters.length === 0 && (
          <p className="py-6 text-center text-xs text-white/40">
            Aucune créature de ce type dans la Crypte — {selectedDef?.name} n'est porté par aucun monstre, seulement subi comme faiblesse.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {monsters.map((monster) => (
            <div
              key={monster.id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5"
            >
              <button
                type="button"
                onClick={() => onViewMonster(monster.id)}
                className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border border-white/10 bg-black/25 transition-colors hover:border-lantern/40"
              >
                {monster.portrait && (
                  <img src={monster.portrait} alt="" className="h-8 w-8 object-contain" style={{ imageRendering: "pixelated" }} />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => onViewMonster(monster.id)} className="text-left">
                  <p className="truncate text-xs font-bold text-white hover:text-lantern-glow">{monster.name}</p>
                  <p className="truncate text-[10px] text-white/40">{monster.combat.typeLabel}</p>
                </button>
                <div className="mt-1 flex flex-wrap gap-1">
                  {monster.combat.weaknesses.map((w) => (
                    <button
                      key={w.type}
                      type="button"
                      onClick={() => setSelectedType((TYPE_BY_ID[w.type] ? (w.type as DamageTypeId) : null) ?? null)}
                      disabled={!TYPE_BY_ID[w.type]}
                      className="rounded-full border px-1.5 py-0.5 text-[9px] font-bold transition-transform disabled:cursor-default"
                      style={
                        TYPE_BY_ID[w.type]
                          ? { borderColor: `${TYPE_BY_ID[w.type].color}66`, color: TYPE_BY_ID[w.type].color, backgroundColor: `${TYPE_BY_ID[w.type].color}18` }
                          : { borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)" }
                      }
                    >
                      {TYPE_BY_ID[w.type]?.icon && (
                        <img
                          src={TYPE_BY_ID[w.type].icon}
                          alt=""
                          className="mr-0.5 inline-block h-2.5 w-2.5 align-[-1px]"
                          style={{ imageRendering: "pixelated" }}
                        />
                      )}
                      x{w.multiplier}
                    </button>
                  ))}
                  {monster.combat.inflicts.map((inf) => {
                    const status = STATUS_BY_ID[inf.status];
                    return status ? (
                      <span key={inf.status} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-1.5 py-0.5 text-[9px] text-white/60">
                        {status.icon && (
                          <img src={status.icon} alt="" className="h-2.5 w-2.5" style={{ imageRendering: "pixelated" }} />
                        )}
                        {status.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TypePill({ typeId, tone }: { typeId: DamageTypeId; tone: "strong" | "weak" }) {
  const t = TYPE_BY_ID[typeId];
  if (!t) return null;
  return (
    <span
      className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold"
      style={{
        borderColor: tone === "strong" ? "rgba(52,211,153,0.5)" : "rgba(251,113,133,0.5)",
        backgroundColor: tone === "strong" ? "rgba(52,211,153,0.12)" : "rgba(251,113,133,0.12)",
        color: t.color,
      }}
    >
      {t.icon && <img src={t.icon} alt="" className="h-3.5 w-3.5 object-contain" style={{ imageRendering: "pixelated" }} />}
      {t.name}
    </span>
  );
}
