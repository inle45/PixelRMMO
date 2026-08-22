import { useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTownTimeOfDay, TOWN_PERIOD_BY_ID, TOWN_TIME_PERIODS, type TownTimeId } from "../../hooks/useTownTimeOfDay";
import { TOWN_ZONES, TOWN_BACKGROUNDS, FOUNTAIN_PLACEMENT, FOUNTAIN_FRAMES, ZONE_FRAMES, type TownZoneId, type TownZoneDef } from "../../data/town";
import LoopSprite from "../camp/LoopSprite";
import TownZoneMarker from "./TownZoneMarker";
import ForgeModal from "./ForgeModal";
import EnchantModal from "./EnchantModal";
import TavernModal from "./TavernModal";
import GuardModal from "./GuardModal";
import MarketplaceModal from "./MarketplaceModal";

interface TownSceneProps {
  onClose: () => void;
  onOpenMap?: () => void;
  /** Set when the town is entered from the Marché/Crafting nav tabs — jumps straight to that zone's
   * modal on mount instead of landing on the bare plaza. */
  initialZone?: TownZoneId;
}

const BOX_SIZE = "100cqw";

/** Sampled from each backdrop's own top pixel row (see CLAUDE.md) so the gradient's last stop joins
 * the artwork with no visible seam — same technique as CampStage's SKY_EXTENSION. */
const SKY_EXTENSION: Record<TownTimeId, string> = {
  dawn: "linear-gradient(180deg, #f0c9b8 0%, #d99f95 55%, #c4847e 100%)",
  day: "linear-gradient(180deg, #2f6fb0 0%, #4a7fa0 55%, #597189 100%)",
  dusk: "linear-gradient(180deg, #2b1030 0%, #3f2438 55%, #553646 100%)",
  night: "linear-gradient(180deg, #05060f 0%, #0b0e1c 55%, #101324 100%)",
};

const SKY_SEAM_COLOR: Record<TownTimeId, string> = {
  dawn: "#c4847e",
  day: "#597189",
  dusk: "#553646",
  night: "#101324",
};

export default function TownScene({ onClose, onOpenMap, initialZone }: TownSceneProps) {
  const { period, clockPeriod, override, setOverride, debugEnabled } = useTownTimeOfDay();
  const [activeZone, setActiveZone] = useState<TownZoneDef | null>(() => TOWN_ZONES.find((z) => z.id === initialZone) ?? null);

  const periodDef = TOWN_PERIOD_BY_ID[period];
  const boxStyle: CSSProperties = useMemo(
    () => ({ width: BOX_SIZE, height: BOX_SIZE, aspectRatio: "1 / 1" }),
    []
  );

  return (
    <motion.div
      className="fixed inset-0 z-[100]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ backgroundColor: SKY_SEAM_COLOR[period] }}
    >
      <div className="relative h-full w-full overflow-hidden" style={{ containerType: "size", imageRendering: "pixelated" }}>
        {/* -------------------------------------------------------------- sky fill above the square art */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 transition-[background] duration-1000"
          style={{ height: `max(0px, calc(100cqh - ${BOX_SIZE}))`, background: SKY_EXTENSION[period] }}
        />

        {/* --------------------------------------------------------------------- background + zones */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={boxStyle}>
          <AnimatePresence>
            <motion.img
              key={period}
              src={TOWN_BACKGROUNDS[period]}
              alt=""
              className="absolute inset-0 h-full w-full"
              style={{ imageRendering: "pixelated" }}
              draggable={false}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
            />
          </AnimatePresence>

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_40%,transparent_55%,rgba(0,0,0,0.45)_100%)]" />

          <div
            className="pointer-events-none absolute z-[5]"
            style={{ left: `${FOUNTAIN_PLACEMENT.x}%`, top: `${FOUNTAIN_PLACEMENT.y}%`, transform: "translate(-50%, -100%)" }}
          >
            <LoopSprite frames={FOUNTAIN_FRAMES} frameDuration={220} alt="" className="h-14 w-14" />
          </div>

          {TOWN_ZONES.map((zone) => (
            <TownZoneMarker key={zone.id} zone={zone} frames={ZONE_FRAMES[zone.id]} onSelect={setActiveZone} />
          ))}
        </div>

        {/* ------------------------------------------------------------------------- floating HUD */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Quitter la Cité"
          className="absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-30 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-xs font-bold text-white/85 backdrop-blur-md transition-colors hover:border-white/35 hover:bg-black/70"
        >
          ✕ Quitter
        </button>

        {onOpenMap && (
          <button
            type="button"
            onClick={onOpenMap}
            className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-30 flex items-center gap-1.5 rounded-full border border-lantern/35 bg-black/55 px-3 py-1.5 text-xs font-bold text-lantern-glow backdrop-blur-md transition-colors hover:border-lantern/70 hover:bg-black/70"
          >
            Carte du Monde
          </button>
        )}

        <p
          className="pointer-events-none absolute inset-x-0 bottom-4 px-6 text-center text-xs italic leading-snug text-white/80"
          style={{ textShadow: "0 2px 6px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)" }}
        >
          La Cité Royale grouille de vie — {periodDef.label.toLowerCase()} sur la grand-place.
        </p>

        {debugEnabled && (
          <div className="absolute bottom-3 left-3 z-30 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setOverride(null)}
              title={`Horloge réelle (${TOWN_PERIOD_BY_ID[clockPeriod].label})`}
              className={
                "rounded-full border px-2 py-1 text-[10px] font-bold backdrop-blur-md transition-colors " +
                (!override ? "border-lantern/50 bg-lantern/20 text-lantern-glow" : "border-white/15 bg-black/45 text-white/60 hover:border-white/35")
              }
            >
              Auto
            </button>
            {TOWN_TIME_PERIODS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setOverride(p.id)}
                title={p.label}
                className={
                  "rounded-full border px-2 py-1 text-[10px] font-bold backdrop-blur-md transition-colors " +
                  (override === p.id ? "border-cyan-400/60 bg-cyan-400/20 text-cyan-200" : "border-white/15 bg-black/45 text-white/60 hover:border-white/35")
                }
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {activeZone?.id === "forge" && <ForgeModal onClose={() => setActiveZone(null)} />}
        {activeZone?.id === "enchant" && <EnchantModal onClose={() => setActiveZone(null)} />}
        {activeZone?.id === "tavern" && <TavernModal onClose={() => setActiveZone(null)} />}
        {activeZone?.id === "guard" && <GuardModal onClose={() => setActiveZone(null)} />}
        {activeZone?.id === "market" && <MarketplaceModal onClose={() => setActiveZone(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}
