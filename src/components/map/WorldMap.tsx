import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { isDebugEnabled } from "../../hooks/useTimeOfDay";
import {
  DIALOGUE_BY_NODE,
  MAP_NODES,
  NODE_BY_ID,
  WORLD_MAP_BG,
  talkBubbleIcon,
  type MapNodeDef,
  type NodeStatus,
} from "../../data/worldMap";
import { getWorldState, hasSeenDialogue, markDialogueSeen, travelToNode, type WorldState } from "../../data/worldState";
import FogOfWar from "./FogOfWar";
import MapNode from "./MapNode";
import HeroToken from "./HeroToken";
import DialogueBox from "./DialogueBox";
import MapCalibrator from "./MapCalibrator";
import birdIcon from "../../assets/camp/props/bird-0.png";

interface WorldMapProps {
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const DRAG_CLICK_THRESHOLD = 6;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function statusFor(node: MapNodeDef, state: WorldState): NodeStatus {
  if (node.id === state.currentNodeId) return "current";
  return state.unlockedNodeIds.includes(node.id) ? "accessible" : "locked";
}

/** Fixed drift specs for the ambient sky/fauna/water layers — stable across renders, same call as
 * every other "a few absolutely-positioned decorative divs" layer in this app. */
const CLOUD_SHADOWS = [
  { x: 20, y: 15, w: 26, duration: 70, delay: 0 },
  { x: 60, y: 30, w: 34, duration: 90, delay: -20 },
  { x: 40, y: 55, w: 22, duration: 60, delay: -40 },
];
const WATER_SHIMMER = [
  { x: 26, y: 66, w: 14, h: 6, rotate: -12 },
  { x: 52, y: 24, w: 10, h: 5, rotate: 20 },
];
const LEAVES = Array.from({ length: 10 }, (_, i) => ({
  x: 10 + ((i * 37) % 80),
  y: 60 + ((i * 23) % 30),
  dur: 6 + (i % 4),
  delay: -(i * 1.3),
}));

export default function WorldMap({ onClose }: WorldMapProps) {
  const reduceMotion = useReducedMotion();
  const debugEnabled = useMemo(() => isDebugEnabled(), []);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const [worldState, setWorldState] = useState<WorldState>(() => getWorldState());
  const [nodes, setNodes] = useState<MapNodeDef[]>(() => structuredClone(MAP_NODES));
  const [travelingTo, setTravelingTo] = useState<MapNodeDef | null>(null);
  const [heroFrom, setHeroFrom] = useState<{ x: number; y: number }>(() => {
    const current = NODE_BY_ID[getWorldState().currentNodeId];
    return current ? { x: current.x, y: current.y } : { x: 50, y: 80 };
  });
  const [activeDialogueNodeId, setActiveDialogueNodeId] = useState<string | null>(null);

  const [calibratorOpen, setCalibratorOpen] = useState(false);
  const [calibSelectedId, setCalibSelectedId] = useState<string | null>(null);

  // Pan/zoom state.
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const pinchStartDist = useRef<number | null>(null);
  const movedDistance = useRef(0);

  const currentNode = NODE_BY_ID[worldState.currentNodeId];

  // Recenters the pan so `node` sits at the viewport's centre, at the *current* zoom level — the
  // square world box is almost always wider than a portrait viewport (see SCENE_BOX_STYLE's own
  // note in CampStage for the same 16:9-into-9:18 problem), so leaving pan wherever it happened to
  // be can land a node outside the visible crop with no indication the player needs to drag to find
  // it. `scale` multiplies the offset because translate(tx,ty) here sits *inside* the box's own
  // scale() transform (see the transform string below) — panning at 2x zoom needs twice the raw
  // pixel offset to move a box-local point the same visual distance.
  function centerOn(node: { x: number; y: number }) {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const boxPx = Math.max(rect.width, rect.height);
    setTx(scale * boxPx * (0.5 - node.x / 100));
    setTy(scale * boxPx * (0.5 - node.y / 100));
  }

  // Center on the hero's current node the instant the map opens, once the viewport has its real
  // size — never on the box's own geometric center by default.
  useEffect(() => {
    const node = NODE_BY_ID[getWorldState().currentNodeId];
    if (node) centerOn(node);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // First-arrival dialogue: fires once on open if the hero's current spot has an unseen NPC line.
  useEffect(() => {
    if (!currentNode?.dialogueId || hasSeenDialogue(currentNode.id)) return;
    const id = setTimeout(() => {
      setActiveDialogueNodeId(currentNode.id);
      markDialogueSeen(currentNode.id);
    }, 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectNode(node: MapNodeDef) {
    if (node.id === worldState.currentNodeId) {
      if (node.dialogueId) setActiveDialogueNodeId(node.id);
      return;
    }
    if (!currentNode) return;
    setHeroFrom({ x: currentNode.x, y: currentNode.y });
    setTravelingTo(node);
  }

  function handleArrive() {
    if (!travelingTo) return;
    const next = travelToNode(travelingTo.id);
    setWorldState(next);
    const arrived = travelingTo;
    setTravelingTo(null);
    centerOn(arrived);
    if (arrived.dialogueId && !hasSeenDialogue(arrived.id)) {
      setActiveDialogueNodeId(arrived.id);
      markDialogueSeen(arrived.id);
    }
  }

  const displayNode = travelingTo ?? currentNode;
  const heroTo = displayNode ? { x: displayNode.x, y: displayNode.y } : heroFrom;

  const unlockedNodes = nodes.filter((n) => worldState.unlockedNodeIds.includes(n.id));
  const revealX = unlockedNodes.length ? unlockedNodes.reduce((s, n) => s + n.x, 0) / unlockedNodes.length : 50;
  const revealY = unlockedNodes.length ? unlockedNodes.reduce((s, n) => s + n.y, 0) / unlockedNodes.length : 80;
  const spread = unlockedNodes.length
    ? Math.max(...unlockedNodes.map((n) => distance(n, { x: revealX, y: revealY })))
    : 20;
  const volcano = nodes.find((n) => n.kind === "volcano");
  const activeDialogue = activeDialogueNodeId ? DIALOGUE_BY_NODE[activeDialogueNodeId] : null;
  const talkTarget = currentNode?.dialogueId ? currentNode : null;

  /* ---------------------------------------------------------------------- pan / zoom handlers */

  function pinchDistance(): number | null {
    const pts = Array.from(pointers.current.values());
    if (pts.length < 2) return null;
    return distance(pts[0], pts[1]);
  }

  function clampOffset(v: number): number {
    const bound = (scale - 1) * 260 + 40;
    return clamp(v, -bound, bound);
  }

  // Pointer capture is only taken once a gesture has PROVEN itself to be a drag (moved past
  // DRAG_CLICK_THRESHOLD) — never on the bare pointerdown. Capturing immediately on pointerdown
  // (the first version of this) redirects every subsequent pointer/mouse/click event to whatever
  // called setPointerCapture, regardless of what's actually under the finger — which silently
  // swallowed every tap on every node/button anywhere inside the map, since the outer viewport div
  // itself has no onClick to hand them off to. A plain tap that never crosses the threshold is never
  // captured, so the browser's native click synthesis still lands on the button that was pressed.
  function onPointerDown(e: ReactPointerEvent) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    movedDistance.current = 0;
    if (pointers.current.size === 1) {
      dragStart.current = { x: e.clientX, y: e.clientY, tx, ty };
    } else if (pointers.current.size === 2) {
      // A second finger landing is an unambiguous pinch — no tap is going to follow, so capture now.
      pinchStartDist.current = pinchDistance();
      pointers.current.forEach((_, id) => (e.currentTarget as HTMLElement).setPointerCapture(id));
    }
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const dist = pinchDistance();
      if (dist && pinchStartDist.current) {
        setScale((s) => clamp(s * (dist / pinchStartDist.current!), MIN_SCALE, MAX_SCALE));
      }
      pinchStartDist.current = dist;
    } else if (pointers.current.size === 1 && dragStart.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const moved = Math.hypot(dx, dy);
      movedDistance.current = Math.max(movedDistance.current, moved);
      if (moved > DRAG_CLICK_THRESHOLD) {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }
        setTx(clampOffset(dragStart.current.tx + dx));
        setTy(clampOffset(dragStart.current.ty + dy));
      }
    }
  }

  function onPointerUp(e: ReactPointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStartDist.current = null;
    if (pointers.current.size === 0) dragStart.current = null;
  }

  function onWheel(e: ReactWheelEvent) {
    e.preventDefault();
    setScale((s) => clamp(s * (1 - e.deltaY * 0.0015), MIN_SCALE, MAX_SCALE));
  }

  function onBoxClick(e: ReactMouseEvent) {
    if (!calibratorOpen || !calibSelectedId) return;
    if (e.target !== e.currentTarget) return; // a node/button click, not the bare background
    if (movedDistance.current > DRAG_CLICK_THRESHOLD) return; // was a pan, not a tap
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.round(clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100) * 10) / 10;
    const y = Math.round(clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100) * 10) / 10;
    setNodes((prev) => prev.map((n) => (n.id === calibSelectedId ? { ...n, x, y } : n)));
  }

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-[#05060b]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        ref={viewportRef}
        className="absolute inset-0 touch-none select-none overflow-hidden"
        style={{ containerType: "size", cursor: dragStart.current ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div
          ref={boxRef}
          onClick={onBoxClick}
          className="absolute left-1/2 top-1/2"
          style={{
            width: "max(100cqw, 100cqh)",
            aspectRatio: "1 / 1",
            transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px) scale(${scale})`,
          }}
        >
          <img
            src={WORLD_MAP_BG}
            alt="Carte du Monde"
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ imageRendering: "pixelated" }}
            draggable={false}
          />

          {/* --------------------------------------------------- ambient: cloud shadows on the relief */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {CLOUD_SHADOWS.map((c, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-black/25"
                style={{ left: `${c.x}%`, top: `${c.y}%`, width: `${c.w}%`, aspectRatio: "2.2 / 1", filter: "blur(14px)", mixBlendMode: "multiply" }}
                animate={reduceMotion ? { x: "0%" } : { x: ["-6%", "6%", "-6%"] }}
                transition={reduceMotion ? { duration: 0 } : { duration: c.duration, repeat: Infinity, ease: "easeInOut", delay: c.delay }}
              />
            ))}
          </div>

          {/* ------------------------------------------------------------- ambient: water shimmer */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {WATER_SHIMMER.map((w, i) => (
              <div
                key={i}
                className="animate-water absolute rounded-full bg-cyan-100/40"
                style={{ left: `${w.x}%`, top: `${w.y}%`, width: `${w.w}%`, aspectRatio: `${w.w} / ${w.h}`, transform: `rotate(${w.rotate}deg)`, filter: "blur(2px)" }}
              />
            ))}
          </div>

          {/* --------------------------------------------------------------- ambient: drifting leaves */}
          {!reduceMotion && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {LEAVES.map((l, i) => (
                <span
                  key={i}
                  className="animate-float-up absolute h-1 w-1.5 rounded-sm bg-emerald-300/70"
                  style={{ left: `${l.x}%`, top: `${l.y}%`, "--dur": `${l.dur}s`, "--delay": `${l.delay}s` } as CSSProperties}
                />
              ))}
            </div>
          )}

          {/* --------------------------------------------------------------- ambient: bird flock */}
          {!reduceMotion && (
            <motion.div
              className="pointer-events-none absolute flex gap-2"
              style={{ left: "8%", top: "58%" }}
              animate={{ x: ["0%", "420%"], y: ["0%", "-18%"] }}
              transition={{ duration: 26, repeat: Infinity, ease: "linear", repeatDelay: 6 }}
            >
              {[0, 1, 2].map((i) => (
                <img key={i} src={birdIcon} alt="" className="h-3 w-3 opacity-80" style={{ imageRendering: "pixelated" }} />
              ))}
            </motion.div>
          )}

          {/* Path trails between the currently-unlocked nodes. */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
            {unlockedNodes.flatMap((n) =>
              n.connectsTo
                .filter((id) => worldState.unlockedNodeIds.includes(id))
                .map((id) => {
                  const target = NODE_BY_ID[id];
                  if (!target) return null;
                  return (
                    <line
                      key={`${n.id}-${id}`}
                      x1={n.x}
                      y1={n.y}
                      x2={target.x}
                      y2={target.y}
                      stroke="#ffcf6b"
                      strokeOpacity={0.55}
                      strokeWidth={0.6}
                      strokeDasharray="1.6 1.4"
                      strokeLinecap="round"
                    />
                  );
                })
            )}
          </svg>

          <FogOfWar
            reveal={{ x: revealX, y: revealY, rx: spread + 14, ry: spread + 8 }}
            hints={volcano ? [{ x: volcano.x, y: volcano.y }] : []}
          />

          {nodes.map((node) => (
            <MapNode key={node.id} node={node} status={statusFor(node, worldState)} onSelect={handleSelectNode} />
          ))}

          {currentNode && <HeroToken from={heroFrom} to={heroTo} traveling={!!travelingTo} onArrive={handleArrive} />}
        </div>
      </div>

      {/* ------------------------------------------------------------------------- floating HUD */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer la carte"
        className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-30 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-xs font-bold text-white/85 backdrop-blur-md transition-colors hover:border-white/35 hover:bg-black/70"
      >
        ✕ Retour au Camp
      </button>

      {talkTarget && !activeDialogue && !travelingTo && (
        <button
          type="button"
          onClick={() => setActiveDialogueNodeId(talkTarget.id)}
          className="absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-30 flex items-center gap-1.5 rounded-full border border-lantern/35 bg-black/55 px-3 py-1.5 text-xs font-bold text-lantern-glow backdrop-blur-md transition-colors hover:border-lantern/70 hover:bg-black/70"
        >
          {talkBubbleIcon && <img src={talkBubbleIcon} alt="" className="h-4 w-4" style={{ imageRendering: "pixelated" }} />}
          Parler
        </button>
      )}

      {debugEnabled && !calibratorOpen && (
        <button
          type="button"
          onClick={() => setCalibratorOpen(true)}
          className="absolute bottom-3 right-3 z-30 rounded-full border border-cyan-400/40 bg-black/55 px-2 py-1 text-[10px] font-bold text-cyan-300 backdrop-blur-md hover:bg-cyan-400/20"
        >
          Calibrateur
        </button>
      )}
      {debugEnabled && calibratorOpen && (
        <div className="absolute inset-x-2 bottom-2 z-30 max-h-[65%] overflow-y-auto sm:left-auto sm:right-2 sm:w-96">
          <MapCalibrator
            nodes={nodes}
            onChange={setNodes}
            onReset={() => setNodes(structuredClone(MAP_NODES))}
            selectedId={calibSelectedId}
            onSelect={setCalibSelectedId}
            onClose={() => setCalibratorOpen(false)}
          />
        </div>
      )}

      <AnimatePresence>
        {activeDialogue && <DialogueBox dialogue={activeDialogue} onClose={() => setActiveDialogueNodeId(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}
