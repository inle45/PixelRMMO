import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { PERIOD_BY_ID, TIME_PERIODS, useTimeOfDay, type TimeOfDayId } from "../../hooks/useTimeOfDay";
import { CAMP_CONFIG, CAMP_SCENES, type CampConfig } from "../../data/campScene";
import CampStage, { MapButton } from "./CampStage";
import CampCalibrator from "./CampCalibrator";
import CampChest, { type ChestVisualState } from "./CampChest";
import StorageModal from "../storage/StorageModal";

interface CampDayCycleProps {
  onOpenMap?: () => void;
}

/**
 * The Camp tab, edge to edge: nothing but the living scene, with the HUD floating over it.
 * Owns which period is showing (real clock, or a debug override) and the live-editable layout the
 * calibrator mutates.
 */
export default function CampDayCycle({ onOpenMap }: CampDayCycleProps) {
  const { period, clockPeriod, override, setOverride, debugEnabled } = useTimeOfDay();
  // The calibrator edits a working copy; campConfig.json is only updated by pasting the copied
  // output back into the file, so a stray drag can never silently become the shipped layout.
  const [config, setConfig] = useState<CampConfig>(() => structuredClone(CAMP_CONFIG));
  const [calibratorOpen, setCalibratorOpen] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [paused, setPaused] = useState(false);

  // The chest's own little state machine: a click starts the opening sweep, whose `animationend`
  // (CampChest's onAnimationEnd) is what actually reveals the modal — not the click itself — so the
  // lid visibly finishes opening before the storage screen appears over it. Closing the modal mirrors
  // that in reverse: it flips to "closing" first, and only the reverse animation's end returns the
  // chest to "closed".
  const [chestVisual, setChestVisual] = useState<ChestVisualState>("closed");

  const scene = CAMP_SCENES[period];
  const periodDef = PERIOD_BY_ID[period];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <CampStage
        period={period}
        layout={config[period]}
        showGuides={calibratorOpen && showGuides}
        paused={calibratorOpen && paused}
      />

      {/* ------------------------------------- top left — period badge + time selector, stacked */}
      {/* Grouped together, and kept off the right side entirely, so nothing here ever crowds the
          Carte button — the two used to share the same top offset on the right and visually
          collided. */}
      <div className="absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top))] flex max-w-[70%] flex-col items-start gap-1.5">
        <div className="pointer-events-none flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 backdrop-blur-md">
          <span className="text-[11px] font-bold uppercase tracking-wide text-lantern-glow">{periodDef.label}</span>
          <span className="text-[10px] text-white/50">{periodDef.range}</span>
          {override && <span className="rounded-full bg-cyan-400/20 px-1.5 text-[8px] font-bold text-cyan-200">DEBUG</span>}
        </div>

        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setOverride(null)}
            title={`Horloge réelle (${PERIOD_BY_ID[clockPeriod].label})`}
            className={
              "rounded-full border px-2.5 py-1 text-[11px] font-bold backdrop-blur-md transition-colors " +
              (!override
                ? "border-lantern/50 bg-lantern/20 text-lantern-glow"
                : "border-white/15 bg-black/45 text-white/60 hover:border-white/35")
            }
          >
            Auto
          </button>
          {TIME_PERIODS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOverride(p.id)}
              title={p.label}
              className={
                "rounded-full border px-2.5 py-1 text-[11px] font-bold backdrop-blur-md transition-colors " +
                (override === p.id
                  ? "border-cyan-400/60 bg-cyan-400/20 text-cyan-200"
                  : "border-white/15 bg-black/45 text-white/60 hover:border-white/35")
              }
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------- top right — world map, alone */}
      {onOpenMap && (
        <div className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))]">
          <MapButton onClick={onOpenMap} />
        </div>
      )}

      {/* ----------------------------------------------- bottom left — storage chest, alone */}
      <div className="absolute bottom-3 left-3">
        <CampChest
          visual={chestVisual}
          onActivate={() => setChestVisual("opening")}
          onAnimationEnd={() => setChestVisual((v) => (v === "opening" ? "open" : v === "closing" ? "closed" : v))}
        />
      </div>

      {/* ------------------------------------------------- bottom centre — ambience */}
      <p
        className="pointer-events-none absolute inset-x-0 bottom-4 px-6 text-center text-xs italic leading-snug text-white/80"
        style={{ textShadow: "0 2px 6px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)" }}
      >
        {scene.caption}
      </p>

      {/* --------------------------------------------------------- dev tools only — bottom right */}
      {debugEnabled && !calibratorOpen && (
        <button
          type="button"
          onClick={() => setCalibratorOpen(true)}
          className="absolute bottom-3 right-3 rounded-full border border-cyan-400/40 bg-black/45 px-2.5 py-1 text-[10px] font-bold text-cyan-300 backdrop-blur-md transition-colors hover:bg-cyan-400/20"
        >
          Calibrateur
        </button>
      )}

      <AnimatePresence>
        {debugEnabled && calibratorOpen && (
          <div className="absolute inset-x-2 bottom-2 max-h-[70%] overflow-y-auto sm:left-auto sm:right-2 sm:w-96">
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
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chestVisual === "open" && <StorageModal onClose={() => setChestVisual("closing")} />}
      </AnimatePresence>
    </div>
  );
}
