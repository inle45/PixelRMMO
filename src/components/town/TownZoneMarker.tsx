import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { TownZoneDef } from "../../data/town";

interface TownZoneMarkerProps {
  zone: TownZoneDef;
  onSelect: (zone: TownZoneDef) => void;
}

/**
 * A district hotspot sitting directly on the building it opens.
 *
 * Anchored by its CENTRE (`translate(-50%,-50%)`) rather than bottom-anchored the way CampStage's
 * and MapNode's sprites are: those place a character standing *on* a ground line, whereas this marks
 * a door or a rooftop, so the measured coordinate is the thing's middle, not its feet.
 *
 * It carries no decorative sprite of its own. An earlier version hung a 64px prop (lantern, guard,
 * orb…) above every pin, which is what produced lanterns floating in the sky and a flag sitting on
 * top of a neighbouring label — the building underneath is already drawn, so the pin's only job is
 * to say "this is tappable".
 */
export default function TownZoneMarker({ zone, onSelect }: TownZoneMarkerProps) {
  const [flashKey, setFlashKey] = useState(0);
  const reduceMotion = useReducedMotion();

  return (
    <div className="absolute z-20" style={{ left: `${zone.x}%`, top: `${zone.y}%`, transform: "translate(-50%, -50%)" }}>
      <button
        type="button"
        onClick={() => {
          setFlashKey((k) => k + 1);
          onSelect(zone);
        }}
        aria-label={zone.name}
        className="group relative flex flex-col items-center"
      >
        {!reduceMotion && (
          <motion.span
            className="pointer-events-none absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 rounded-full border-2 border-lantern/70"
            animate={{ scale: [1, 1.6, 1], opacity: [0.85, 0, 0.85] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        {/* One-shot gold burst on tap — the spec's "surbrillance dorée", replayed by remounting on
            each click rather than by toggling a boolean back and forth. */}
        <motion.span
          key={flashKey}
          className="pointer-events-none absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 rounded-full bg-lantern"
          initial={{ opacity: flashKey > 0 ? 0.85 : 0, scale: 0.5 }}
          animate={{ opacity: 0, scale: 2.4 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        />
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-lantern-glow/85 bg-black/55 shadow-[0_2px_10px_rgba(0,0,0,0.7)] backdrop-blur-[2px] transition-colors group-hover:border-lantern group-hover:bg-black/75">
          <span className="h-2 w-2 rounded-full bg-lantern" />
        </span>
        <span
          className="mt-1 whitespace-nowrap rounded-full bg-black/65 px-1.5 py-0.5 text-[9px] font-bold text-white/90 backdrop-blur-sm"
          style={{ textShadow: "0 1px 3px rgba(0,0,0,0.95)" }}
        >
          {zone.label}
        </span>
      </button>
    </div>
  );
}
