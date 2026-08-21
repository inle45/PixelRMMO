import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TIME_PERIODS, type TimeOfDayId } from "../../hooks/useTimeOfDay";
import { PROP_BY_ID, type CampConfig, type PeriodLayout } from "../../data/campScene";

/** Everything the calibrator can move, flattened into one addressable list per period: the hero,
 * its contact shadow, and each of that period's props. */
type TargetId = "hero" | "shadow" | `prop:${string}`;

const STEP = 0.5;

interface CampCalibratorProps {
  period: TimeOfDayId;
  config: CampConfig;
  onChange: (config: CampConfig) => void;
  onReset: () => void;
  paused: boolean;
  onTogglePaused: () => void;
  showGuides: boolean;
  onToggleGuides: () => void;
  onSetPeriod: (period: TimeOfDayId) => void;
  onClose: () => void;
}

function targetsFor(layout: PeriodLayout): { id: TargetId; label: string }[] {
  return [
    { id: "hero", label: "Héros" },
    { id: "shadow", label: "Ombre de contact" },
    ...Object.keys(layout.props).map((propId) => ({
      id: `prop:${propId}` as TargetId,
      label: PROP_BY_ID[propId]?.label ?? propId,
    })),
  ];
}

/** Rounds to one decimal so the emitted JSON stays readable — the 0.5% step never needs more. */
function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export default function CampCalibrator({
  period,
  config,
  onChange,
  onReset,
  paused,
  onTogglePaused,
  showGuides,
  onToggleGuides,
  onSetPeriod,
  onClose,
}: CampCalibratorProps) {
  const layout = config[period];
  const targets = targetsFor(layout);
  const [targetId, setTargetId] = useState<TargetId>("hero");
  const [copied, setCopied] = useState(false);

  // The selected target must exist in the period being edited — switching periods swaps the whole
  // prop set, so a `prop:kettle` selection is meaningless once we're editing `night`.
  useEffect(() => {
    if (!targets.some((t) => t.id === targetId)) setTargetId("hero");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  function currentValues() {
    if (targetId === "hero") return layout.hero;
    if (targetId === "shadow") return layout.shadow;
    return layout.props[targetId.slice(5)];
  }

  function patch(changes: Record<string, number>) {
    const next: CampConfig = structuredClone(config);
    const target =
      targetId === "hero"
        ? next[period].hero
        : targetId === "shadow"
          ? next[period].shadow
          : next[period].props[targetId.slice(5)];
    Object.assign(target, changes);
    onChange(next);
  }

  function nudge(dx: number, dy: number) {
    const v = currentValues();
    patch({ x: round(v.x + dx), y: round(v.y + dy) });
  }

  // Arrow keys drive the selected target. Shift = 5x for coarse placement, plain = the 0.5% step.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const mult = e.shiftKey ? 10 : 1;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-STEP * mult, 0],
        ArrowRight: [STEP * mult, 0],
        ArrowUp: [0, -STEP * mult],
        ArrowDown: [0, STEP * mult],
      };
      const move = moves[e.key];
      if (!move) return;
      e.preventDefault();
      nudge(move[0], move[1]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function copyConfig() {
    const json = JSON.stringify(config, null, 2);
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      // Clipboard API needs a secure context / permission; the textarea below is the fallback.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const values = currentValues();
  const isShadow = targetId === "shadow";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 rounded-2xl border border-cyan-400/30 bg-[#0b1220]/95 p-3 backdrop-blur-2xl"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wide text-cyan-300">Calibrateur — Mode Dev</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-[10px] font-bold text-white/70 hover:text-white"
        >
          Fermer
        </button>
      </div>

      {/* Period being edited — independent of the wall clock. */}
      <div className="mt-2 flex flex-wrap gap-1">
        {TIME_PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSetPeriod(p.id)}
            className={
              "rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors " +
              (p.id === period
                ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-200"
                : "border-white/10 bg-black/30 text-white/50 hover:border-white/25")
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Which entity the arrows/sliders drive. */}
      <div className="mt-2 flex flex-wrap gap-1">
        {targets.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTargetId(t.id)}
            className={
              "rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors " +
              (t.id === targetId
                ? "border-lantern/60 bg-lantern/15 text-lantern-glow"
                : "border-white/10 bg-black/30 text-white/50 hover:border-white/25")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* D-pad */}
      <div className="mt-3 flex items-center gap-3">
        <div className="grid grid-cols-3 gap-1">
          <span />
          <NudgeButton label="↑" onClick={() => nudge(0, -STEP)} />
          <span />
          <NudgeButton label="←" onClick={() => nudge(-STEP, 0)} />
          <NudgeButton label="•" onClick={onTogglePaused} title={paused ? "Reprendre" : "Figer"} />
          <NudgeButton label="→" onClick={() => nudge(STEP, 0)} />
          <span />
          <NudgeButton label="↓" onClick={() => nudge(0, STEP)} />
          <span />
        </div>

        <div className="flex-1 space-y-1.5">
          <Slider label="X" value={values.x} min={0} max={100} onChange={(x) => patch({ x })} />
          <Slider label="Y" value={values.y} min={0} max={100} onChange={(y) => patch({ y })} />
          <Slider
            label={isShadow ? "Largeur" : "Taille"}
            value={values.width}
            min={2}
            max={isShadow ? 40 : 40}
            onChange={(width) => patch({ width })}
          />
          {isShadow && (
            <>
              <Slider label="Hauteur" value={layout.shadow.height} min={0.5} max={10} onChange={(height) => patch({ height })} />
              <Slider label="Opacité" value={layout.shadow.opacity} min={0} max={1} step={0.05} onChange={(opacity) => patch({ opacity })} />
            </>
          )}
        </div>
      </div>

      <p className="mt-2 text-[10px] leading-snug text-white/40">
        Flèches = pas de {STEP}% · Maj+Flèches = pas de {STEP * 10}% · Touches 1-4 = période · 0 = horloge réelle
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={copyConfig}
          className="rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-300 px-3 py-1.5 text-[10px] font-bold text-black transition-opacity hover:opacity-90"
        >
          {copied ? "✓ Copié" : "Copier Config"}
        </button>
        <button
          type="button"
          onClick={onToggleGuides}
          className="rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-[10px] font-bold text-white/70 hover:text-white"
        >
          {showGuides ? "Masquer repères" : "Afficher repères"}
        </button>
        <button
          type="button"
          onClick={onTogglePaused}
          className="rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-[10px] font-bold text-white/70 hover:text-white"
        >
          {paused ? "Reprendre anims" : "Figer anims"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-rose-400/30 bg-rose-950/30 px-3 py-1.5 text-[10px] font-bold text-rose-300 hover:bg-rose-950/50"
        >
          Réinitialiser
        </button>
      </div>

      {/* Fallback when the Clipboard API is unavailable (non-secure context), and a live view of
          exactly what would be pasted into campConfig.json. */}
      <textarea
        readOnly
        value={JSON.stringify(config, null, 2)}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-2 h-24 w-full resize-y rounded-lg border border-white/10 bg-black/50 p-2 font-mono text-[9px] leading-tight text-cyan-200/80"
      />
    </motion.div>
  );
}

function NudgeButton({ label, onClick, title }: { label: string; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-black/40 text-xs font-bold text-white/75 transition-colors hover:border-cyan-400/50 hover:text-white active:scale-95"
    >
      {label}
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 0.5,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-12 flex-none text-[9px] font-bold uppercase tracking-wide text-white/45">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-cyan-400"
      />
      <span className="w-9 flex-none text-right font-mono text-[9px] text-cyan-200">{value}</span>
    </label>
  );
}
