import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { PERIOD_BY_ID, TIME_PERIODS, useTimeOfDay, type TimeOfDayId } from "../../hooks/useTimeOfDay";
import { CAMP_CONFIG, CAMP_SCENES, type CampConfig } from "../../data/campScene";
import CampStage from "./CampStage";
import CampCalibrator from "./CampCalibrator";

interface CampDayCycleProps {
  onOpenMap?: () => void;
}

/**
 * Owns everything time-of-day for the Camp tab: which period is showing (real clock, or a debug
 * override), the live-editable layout the calibrator mutates, and the stage itself.
 */
export default function CampDayCycle({ onOpenMap }: CampDayCycleProps) {
  const { period, clockPeriod, override, setOverride, debugEnabled } = useTimeOfDay();
  // The calibrator edits a working copy; campConfig.json is only updated by pasting the copied
  // output back into the file, so a stray drag can never silently become the shipped layout.
  const [config, setConfig] = useState<CampConfig>(() => structuredClone(CAMP_CONFIG));
  const [calibratorOpen, setCalibratorOpen] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [paused, setPaused] = useState(false);

  const scene = CAMP_SCENES[period];
  const periodDef = PERIOD_BY_ID[period];

  return (
    <div>
      <div className="relative">
        <CampStage
          period={period}
          layout={config[period]}
          showGuides={calibratorOpen && showGuides}
          paused={calibratorOpen && paused}
          onOpenMap={onOpenMap}
        />

        {/* Live period badge — makes the day cycle legible instead of the scene just silently
            being different at 9pm than it was at 9am. */}
        <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wide text-lantern-glow">{periodDef.label}</span>
          <span className="text-[9px] text-white/45">{periodDef.range}</span>
          {override && (
            <span className="rounded-full bg-cyan-400/20 px-1.5 text-[8px] font-bold text-cyan-200">DEBUG</span>
          )}
        </div>
      </div>

      <p className="mt-2 px-1 text-center text-[11px] italic text-white/45">{scene.caption}</p>

      {debugEnabled && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setOverride(null)}
            className={
              "rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors " +
              (!override
                ? "border-lantern/50 bg-lantern/15 text-lantern-glow"
                : "border-white/10 bg-black/25 text-white/50 hover:border-white/25")
            }
          >
            Auto ({PERIOD_BY_ID[clockPeriod].label})
          </button>
          {TIME_PERIODS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOverride(p.id)}
              className={
                "rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors " +
                (override === p.id
                  ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-200"
                  : "border-white/10 bg-black/25 text-white/50 hover:border-white/25")
              }
            >
              {i + 1}. {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCalibratorOpen((o) => !o)}
            className="ml-auto rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300 transition-colors hover:bg-cyan-400/20"
          >
            {calibratorOpen ? "Fermer calibrateur" : "Calibrateur"}
          </button>
        </div>
      )}

      <AnimatePresence>
        {debugEnabled && calibratorOpen && (
          <CampCalibrator
            period={period}
            config={config}
            onChange={setConfig}
            onReset={() => setConfig(structuredClone(CAMP_CONFIG))}
            paused={paused}
            onTogglePaused={() => setPaused((p) => !p)}
            showGuides={showGuides}
            onToggleGuides={() => setShowGuides((g) => !g)}
            onSetPeriod={(p: TimeOfDayId) => setOverride(p)}
            onClose={() => setCalibratorOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
