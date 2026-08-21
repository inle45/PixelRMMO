import { useState } from "react";
import { motion } from "framer-motion";
import type { MapNodeDef } from "../../data/worldMap";

const STEP = 0.5;

interface MapCalibratorProps {
  nodes: MapNodeDef[];
  onChange: (nodes: MapNodeDef[]) => void;
  onReset: () => void;
  /** Selecting a node here also drives which pin a map click repositions. */
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Dev-only pin placement tool: pick a node below, then either click anywhere on the map itself
 * (WorldMap forwards that click here when the calibrator is open and a target is selected) or nudge
 * with the D-pad, then copy the resulting array back into mapNodes.json. Mirrors CampCalibrator's
 * proven "edit a working copy, paste the export back in by hand" flow. */
export default function MapCalibrator({ nodes, onChange, onReset, selectedId, onSelect, onClose }: MapCalibratorProps) {
  const [copied, setCopied] = useState(false);
  const selected = nodes.find((n) => n.id === selectedId) ?? nodes[0];

  function patch(id: string, changes: Partial<Pick<MapNodeDef, "x" | "y">>) {
    onChange(nodes.map((n) => (n.id === id ? { ...n, ...changes } : n)));
  }

  function nudge(dx: number, dy: number) {
    if (!selected) return;
    patch(selected.id, { x: round(selected.x + dx), y: round(selected.y + dy) });
  }

  async function copyConfig() {
    const json = JSON.stringify({ nodes }, null, 2);
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      // Clipboard API needs a secure context — the textarea below is the fallback.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-auto rounded-2xl border border-cyan-400/30 bg-[#0b1220]/95 p-3 backdrop-blur-2xl"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wide text-cyan-300">Calibrateur — Carte</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-[10px] font-bold text-white/70 hover:text-white"
        >
          Fermer
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {nodes.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => onSelect(n.id)}
            className={
              "rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors " +
              (n.id === selected?.id
                ? "border-lantern/60 bg-lantern/15 text-lantern-glow"
                : "border-white/10 bg-black/30 text-white/50 hover:border-white/25")
            }
          >
            {n.name}
          </button>
        ))}
      </div>

      {selected && (
        <div className="mt-3 flex items-center gap-3">
          <div className="grid grid-cols-3 gap-1">
            <span />
            <NudgeButton label="↑" onClick={() => nudge(0, -STEP)} />
            <span />
            <NudgeButton label="←" onClick={() => nudge(-STEP, 0)} />
            <span className="flex h-7 w-7 items-center justify-center text-[8px] text-white/40">clic</span>
            <NudgeButton label="→" onClick={() => nudge(STEP, 0)} />
            <span />
            <NudgeButton label="↓" onClick={() => nudge(0, STEP)} />
            <span />
          </div>
          <div className="flex-1 text-[10px] text-white/60">
            <p>
              X <span className="font-mono text-cyan-200">{selected.x}</span>
            </p>
            <p>
              Y <span className="font-mono text-cyan-200">{selected.y}</span>
            </p>
            <p className="mt-1 leading-snug text-white/35">Ou clique directement sur la carte pour déplacer l'épingle sélectionnée.</p>
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={copyConfig}
          className="rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-300 px-3 py-1.5 text-[10px] font-bold text-black transition-opacity hover:opacity-90"
        >
          {copied ? "✓ Copié" : "Copier JSON"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-rose-400/30 bg-rose-950/30 px-3 py-1.5 text-[10px] font-bold text-rose-300 hover:bg-rose-950/50"
        >
          Réinitialiser
        </button>
      </div>

      <textarea
        readOnly
        value={JSON.stringify({ nodes }, null, 2)}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-2 h-24 w-full resize-y rounded-lg border border-white/10 bg-black/50 p-2 font-mono text-[9px] leading-tight text-cyan-200/80"
      />
    </motion.div>
  );
}

function NudgeButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-black/40 text-xs font-bold text-white/75 transition-colors hover:border-cyan-400/50 hover:text-white active:scale-95"
    >
      {label}
    </button>
  );
}
