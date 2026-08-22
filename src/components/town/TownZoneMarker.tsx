import { useState } from "react";
import { motion } from "framer-motion";
import LoopSprite from "../camp/LoopSprite";
import type { TownZoneDef } from "../../data/town";

interface TownZoneMarkerProps {
  zone: TownZoneDef;
  frames: string[];
  onSelect: (zone: TownZoneDef) => void;
}

/**
 * A clickable district marker over the Town plaza — same bottom-anchored placement convention as
 * CampStage/MapNode (translate(-50%,-100%) so `y` is the ground line), a continuously looping prop
 * sprite above it, a pulsing gold ring inviting a tap (same accessible-node affordance as MapNode),
 * and a name pill that's always visible rather than a hover-only tooltip — hover doesn't exist on the
 * touch devices this app targets first, so the label just stays on.
 */
export default function TownZoneMarker({ zone, frames, onSelect }: TownZoneMarkerProps) {
  const [flashKey, setFlashKey] = useState(0);

  function handleClick() {
    setFlashKey((k) => k + 1);
    onSelect(zone);
  }

  return (
    <div
      className="absolute z-10"
      style={{ left: `${zone.x}%`, top: `${zone.y}%`, transform: "translate(-50%, -100%)" }}
    >
      {frames.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-full mb-1 flex justify-center">
          <LoopSprite frames={frames} frameDuration={180} alt="" className="h-10 w-10" />
        </div>
      )}

      <button type="button" onClick={handleClick} aria-label={zone.name} className="group relative flex flex-col items-center">
        <motion.span
          className="absolute -inset-2.5 rounded-full border-2 border-lantern/70"
          animate={{ scale: [1, 1.35, 1], opacity: [0.9, 0, 0.9] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
        {/* Click flash — a quick bright gold pulse layered on top of the standing ring, per spec's
            "effet de surbrillance dorée" on click, distinct from the always-on idle ring above. */}
        <motion.span
          key={flashKey}
          className="pointer-events-none absolute -inset-3 rounded-full bg-lantern/50"
          initial={{ opacity: flashKey > 0 ? 0.9 : 0, scale: 0.6 }}
          animate={{ opacity: 0, scale: 1.6 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-lantern-glow/80 bg-black/55 shadow-[0_2px_10px_rgba(0,0,0,0.6)] transition-colors group-hover:border-lantern group-hover:bg-black/70">
          <span className="h-2.5 w-2.5 rounded-full bg-lantern" />
        </span>
        <span
          className="mt-1 whitespace-nowrap rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold text-white/90 backdrop-blur-sm"
          style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
        >
          {zone.name}
        </span>
      </button>
    </div>
  );
}
