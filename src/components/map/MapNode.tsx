import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LoopSprite from "../camp/LoopSprite";
import { isNight } from "../../data/fishing";

/** Lives in /public alongside the other world-map overlay art. */
const FISH_SPLASH = "/assets/worldmap/fish_splash.png";
import {
  BANNER_FRAMES,
  BAT_FRAMES,
  CAMPFIRE_FRAMES,
  MIST_FRAMES,
  NODE_ICON_BY_KIND,
  type MapNodeDef,
  type NodeStatus,
} from "../../data/worldMap";

interface MapNodeProps {
  node: MapNodeDef;
  status: NodeStatus;
  paused?: boolean;
  onSelect: (node: MapNodeDef) => void;
}

const STATUS_LABEL: Record<NodeStatus, string> = {
  accessible: "Accessible",
  locked: "Verrouillé",
  current: "Vous êtes ici",
};

/** Kind-specific ambient flourishes, layered behind the pin itself. Every one of these reuses an
 * existing asset or a plain CSS glow — none of it commissions new PixelLab art at the node scale. */
function NodeDecoration({ kind, paused }: { kind: MapNodeDef["kind"]; paused?: boolean }) {
  const [batVisible, setBatVisible] = useState(true);
  const [splashing, setSplashing] = useState(false);
  const isNightNow = isNight();

  // "Chauves-souris périodiques": on-screen for ~2s out of every ~6s rather than a constant loop.
  useEffect(() => {
    if (kind !== "dungeon" || paused) return;
    const id = setInterval(() => setBatVisible((v) => !v), 2000);
    return () => clearInterval(id);
  }, [kind, paused]);

  // A fish breaks the surface every 8-12s, per spec. Self-rescheduling rather than a fixed
  // setInterval so the gap is genuinely irregular instead of metronomic.
  useEffect(() => {
    if (kind !== "lake" || paused) return;
    let showTimer: ReturnType<typeof setTimeout>;
    let nextTimer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      nextTimer = setTimeout(() => {
        setSplashing(true);
        showTimer = setTimeout(() => {
          setSplashing(false);
          schedule();
        }, 700);
      }, 8000 + Math.random() * 4000);
    };
    schedule();
    return () => {
      clearTimeout(showTimer);
      clearTimeout(nextTimer);
    };
  }, [kind, paused]);

  if (kind === "camp") {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-full flex justify-center gap-1">
        <LoopSprite frames={CAMPFIRE_FRAMES} frameDuration={130} alt="" paused={paused} className="h-8 w-8" />
        <LoopSprite frames={BANNER_FRAMES} frameDuration={180} alt="" paused={paused} className="h-8 w-8 -translate-y-1" />
      </div>
    );
  }

  if (kind === "dungeon") {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-full flex justify-center">
        {/* mixBlendMode "screen" + a soft blur + lower opacity is what turns this from a flat sticker
            pasted over the scene into something that reads as glowing haze reacting with the dark
            colours underneath — a sprite dropped in at full alpha/contrast never blends with a
            desaturated backdrop no matter how good the source art is, the same lesson as the battle
            arena's own sprite-integration pass. */}
        <LoopSprite
          frames={MIST_FRAMES}
          frameDuration={260}
          alt=""
          paused={paused}
          className="h-10 w-10"
          style={{ opacity: 0.5, mixBlendMode: "screen", filter: "blur(1.5px) saturate(0.7)" }}
        />
        {batVisible && <LoopSprite frames={BAT_FRAMES} frameDuration={140} alt="" paused={paused} className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-6" />}
        <motion.div
          className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/40 blur-lg"
          animate={paused ? {} : { opacity: [0.3, 0.65, 0.3] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }

  if (kind === "city") {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-full flex items-end justify-center gap-1">
        <LoopSprite frames={BANNER_FRAMES} frameDuration={180} alt="" paused={paused} className="h-8 w-8" />
        <span className="animate-lantern h-3 w-3 rounded-full bg-lantern" />
      </div>
    );
  }

  if (kind === "lake") {
    // Ripples and the night glow are CSS, not generated spritesheets — one animated ring scales
    // cleanly at map-marker size where a 64px sprite would just be a blur, and it is the same call
    // the Cité's LIGHT_SOURCES made. Only the periodic fish jump gets real art, because a leaping
    // fish is a *shape* CSS cannot fake.
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {[0, 1].map((i) => (
          <motion.span
            key={i}
            className="absolute rounded-full border border-cyan-300/50"
            initial={{ width: 8, height: 8, opacity: 0.65 }}
            animate={paused ? {} : { width: 44, height: 44, opacity: 0 }}
            transition={{ duration: 3.4, repeat: Infinity, delay: i * 1.7, ease: "easeOut" }}
          />
        ))}
        {/* Night-only bluish haze over the water, matching the 21h-06h fishing window. */}
        {isNightNow && (
          <motion.span
            className="absolute h-10 w-10 rounded-full bg-cyan-300/25 blur-md"
            animate={paused ? {} : { opacity: [0.25, 0.6, 0.25], scale: [1, 1.15, 1] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <AnimatePresence>
          {splashing && (
            <motion.img
              src={FISH_SPLASH}
              alt=""
              className="absolute h-8 w-8 object-contain"
              style={{ imageRendering: "pixelated" }}
              initial={{ opacity: 0, y: 4, scale: 0.6 }}
              animate={{ opacity: 1, y: -8, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.8 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (kind === "cave") {
    // Spore-green breathing glow. Reuses the crypt's mist loop tinted by the blend mode rather than
    // commissioning a second haze sprite at map-marker scale.
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-full flex justify-center">
        <LoopSprite
          frames={MIST_FRAMES}
          frameDuration={300}
          alt=""
          paused={paused}
          className="h-9 w-9"
          style={{ opacity: 0.45, mixBlendMode: "screen", filter: "blur(1.5px) hue-rotate(85deg) saturate(1.4)" }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/40 blur-lg"
          animate={paused ? {} : { opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }

  // volcano — a distant, mostly-fogged silhouette: just a slow reddish pulse, no sprite.
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-600/40 blur-lg"
      animate={paused ? {} : { opacity: [0.35, 0.75, 0.35], scale: [1, 1.15, 1] }}
      transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export default function MapNode({ node, status, paused, onSelect }: MapNodeProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const icon = NODE_ICON_BY_KIND[node.kind];
  const locked = status === "locked";

  return (
    <div
      className="absolute z-10"
      style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -100%)" }}
    >
      <NodeDecoration kind={node.kind} paused={paused} />

      <button
        type="button"
        onClick={() => {
          setTooltipOpen((o) => !o);
          if (!locked) onSelect(node);
        }}
        aria-label={node.name}
        className="relative flex flex-col items-center"
      >
        {status === "accessible" && (
          <motion.span
            className="absolute -inset-2 rounded-full border-2 border-lantern/70"
            animate={{ scale: [1, 1.35, 1], opacity: [0.9, 0, 0.9] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <span
          className={
            "relative flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-[0_2px_8px_rgba(0,0,0,0.6)] " +
            (status === "current"
              ? "border-lantern bg-lantern/25"
              : locked
                ? "border-white/25 bg-black/60"
                : "border-lantern-glow/80 bg-black/55")
          }
        >
          {icon ? (
            <img
              src={icon}
              alt=""
              className={"h-5 w-5 object-contain " + (locked ? "opacity-40 grayscale" : "")}
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <span className={"h-2.5 w-2.5 rounded-full " + (locked ? "bg-white/30" : "bg-rose-400")} />
          )}
          {locked && (
            <svg viewBox="0 0 24 24" className="absolute -bottom-1 -right-1 h-4 w-4 fill-white/70" aria-hidden>
              <path d="M12 1a4 4 0 0 0-4 4v3H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V5a4 4 0 0 0-4-4Zm0 2a2 2 0 0 1 2 2v3h-4V5a2 2 0 0 1 2-2Z" />
            </svg>
          )}
        </span>
        <span
          className="mt-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-bold text-white/85 backdrop-blur-sm"
          style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
        >
          {node.name}
        </span>
      </button>

      {tooltipOpen && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-full left-1/2 z-20 mb-2 w-40 -translate-x-1/2 rounded-xl border border-white/15 bg-black/85 p-2.5 text-center backdrop-blur-md"
        >
          <p className="text-xs font-bold text-white">{node.name}</p>
          <p className="mt-0.5 text-[10px] text-white/50">Niveau {node.levelRecommended} recommandé</p>
          <p
            className={
              "mt-1 text-[10px] font-bold uppercase tracking-wide " +
              (status === "locked" ? "text-white/40" : status === "current" ? "text-lantern-glow" : "text-emerald-300")
            }
          >
            {STATUS_LABEL[status]}
          </p>
        </motion.div>
      )}
    </div>
  );
}
