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
import MapNode from "./MapNode";
import HeroToken from "./HeroToken";
import DialogueBox from "./DialogueBox";
import MapCalibrator from "./MapCalibrator";
import LoopSprite from "../camp/LoopSprite";
import { BIRD_FRAMES, DEER_FRAMES, SMOKE_FRAMES } from "../../data/worldMap";

interface WorldMapProps {
  onClose: () => void;
  /** Only the city node currently has an actual scene to enter — omitted, the button below never
   * renders, same optional-prop-gates-a-feature pattern CampScreen/DungeonScreen use for onOpenMap. */
  onEnterTown?: () => void;
}

// Zoomed all the way out, the box shrinks to well under the viewport's size — the Ocean layer (see
// below) fills the rest, so "zoom out" reads as the island shrinking into open water rather than
// hitting a wall at "the map exactly fills the screen".
const MIN_SCALE = 0.4;
const MAX_SCALE = 3;
const DRAG_CLICK_THRESHOLD = 6;
// The world box is oversized relative to the viewport's dominant dimension, not just matched to it
// (CampStage's `max(100cqw, 100cqh)` rule for a *static*, never-panned scene). On a portrait phone
// the viewport's height already IS the box's side length at a bare 100% factor — meaning zero slack
// to pan vertically at all: centering on any node not dead-center (e.g. the Campement, near the
// map's southern edge) shifts the box straight past the viewport's edge. 150% leaves enough slack to
// pan freely and to mostly-center near-edge nodes; true edge cases are still clamped (see
// clampX/clampY), and the Ocean layer means even hitting that clamp never exposes bare black.
const BOX_SIZE_CQ = "max(150cqw, 150cqh)";
const BOX_MULTIPLIER = 1.5;

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
/** A loose two-bird group drifting across the sky over the forest, on a long diagonal loop. Each
 * bird gets its own frameDuration so the pair doesn't flap in perfect lockstep — a small thing, but
 * it's the difference between "a flock" and "one sprite duplicated". */
const BIRDS = [
  { dx: 0, dy: 0, frameDuration: 150 },
  { dx: 14, dy: -6, frameDuration: 170 },
];
/** Small ash/ember specks drifting up out of the volcano's crater alongside the smoke puffs — reuses
 * the same float-up-and-fade technique as the forest's LEAVES, just recoloured. */
const EMBERS = Array.from({ length: 5 }, (_, i) => ({
  x: -4 + i * 2.2,
  y: -2 - (i % 3),
  dur: 3 + (i % 3),
  delay: -(i * 0.6),
}));
/** Snow flurries confined to the snowy mountain band of the map (roughly where the painted peaks
 * sit) — plain CSS particles, not a PixelLab asset, matching the fireflies/leaves technique already
 * established for "a scattering of small ambient specks" throughout this app. */
const SNOW = Array.from({ length: 14 }, (_, i) => ({
  x: 44 + ((i * 17) % 34),
  y: 6 + ((i * 11) % 26),
  dur: 5 + (i % 4),
  delay: -(i * 0.9),
}));
/** Large, slow shimmer bands for the open-water Ocean layer, positioned in plain viewport percentages
 * (this layer never pans/zooms with the box) — reuses the same `.animate-water` keyframe as the
 * in-box river/lake shimmer, just bigger and dimmer to read as open sea rather than a river glint. */
const OCEAN_SHIMMER = [
  { x: 5, y: 10, w: 55, h: 10, delay: 0 },
  { x: 40, y: 70, w: 60, h: 12, delay: -2 },
  { x: -10, y: 40, w: 45, h: 9, delay: -4 },
  { x: 55, y: 20, w: 40, h: 8, delay: -1.5 },
];
/** A patch of forest near the Campement, clear of any node's own pin/decoration — where the ambient
 * deer grazes into view every so often. */
const DEER_SPOT = { x: 27, y: 80 };

export default function WorldMap({ onClose, onEnterTown }: WorldMapProps) {
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

  // The ambient deer grazes into view for a stretch, then wanders off — a rarer, longer cycle than
  // the crypt's bats, so spotting it feels like a small find rather than a constant fixture.
  const [deerVisible, setDeerVisible] = useState(true);
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setDeerVisible((v) => !v), 9000);
    return () => clearInterval(id);
  }, [reduceMotion]);

  // Pan/zoom state lives in plain refs, not useState: nothing else in the render tree depends on
  // tx/ty/scale (every node/fog/prop position is a plain percentage *inside* the box, unaffected by
  // its own transform), so the transform string is the only thing that ever needs updating on a
  // gesture tick. Driving it through setState would re-render this whole component — nodes, the fog
  // SVG, every ambient layer — on every single pointermove, which on a real phone (not the desktop
  // Chromium this was first tested on) is exactly the dropped-frame/stutter feel reported directly.
  // Mutating boxRef's style.transform straight from the ref, with no re-render at all, is the same
  // "useRef + imperative DOM write for continuous updates" call this app already makes for the
  // battle arena's turn loop — see TurnBattleArena's own note on why useState was wrong there too.
  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const pinchStartDist = useRef<number | null>(null);
  const movedDistance = useRef(0);
  // The world box's own (unscaled) *square* side length in px — the viewport's dominant dimension
  // times BOX_MULTIPLIER, matching BOX_SIZE_CQ. The viewport's own width/height are cached alongside
  // it, since clampX/clampY need to compare against them per-axis (the viewport itself is rarely
  // square, even though the box always is). All three are read via ResizeObserver rather than a
  // fresh getBoundingClientRect() on every pointermove: that forces a layout on every tick, which is
  // exactly the kind of main-thread work that reads as dropped/stuttering frames during a fast drag.
  const boxPxRef = useRef(800);
  const viewportSizeRef = useRef({ w: 400, h: 800 });

  const currentNode = NODE_BY_ID[worldState.currentNodeId];

  // Writes the current ref values straight to the box's transform — the one and only place that
  // reads scaleRef/txRef/tyRef and the one and only DOM write a gesture tick needs to make.
  function applyTransform() {
    const el = boxRef.current;
    if (!el) return;
    el.style.transform = `translate(-50%, -50%) translate(${txRef.current}px, ${tyRef.current}px) scale(${scaleRef.current})`;
  }

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      viewportSizeRef.current = { w: rect.width, h: rect.height };
      boxPxRef.current = Math.max(rect.width, rect.height) * BOX_MULTIPLIER;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Bounded to how far the (scaled) box actually overhangs the viewport on that axis — the box can
  // never be dragged far enough to expose the black backdrop behind it, on either axis, at any zoom.
  // `s` defaults to the current scale but takes an explicit override so applyZoom can clamp against
  // the *target* scale before scaleRef has actually been updated to it.
  function clampX(v: number, s: number = scaleRef.current): number {
    const bound = Math.max(0, (boxPxRef.current * s - viewportSizeRef.current.w) / 2);
    return clamp(v, -bound, bound);
  }
  function clampY(v: number, s: number = scaleRef.current): number {
    const bound = Math.max(0, (boxPxRef.current * s - viewportSizeRef.current.h) / 2);
    return clamp(v, -bound, bound);
  }

  // Changes scale AND compensates tx/ty in the same breath, atomically, so whatever box-local point
  // is currently under `anchor` (a client/screen coordinate — defaults to the viewport's own centre)
  // stays exactly there through the change. Touching scale alone leaves tx/ty untouched, and since
  // the box's own transform-origin is its own centre (not the viewport's), the visible content jumps
  // to a completely different part of the map the instant scale changes, worse the further the anchor
  // is from centre. Anchoring to the *pinch midpoint* (or the wheel cursor) rather than always the
  // viewport centre is what makes a pinch off to one side of the screen feel like zooming under your
  // fingers instead of the whole map appearing to leap sideways to re-centre on something else —
  // exactly what read as "teleporting" when pinching anywhere but dead-centre.
  //
  // Derivation: a box-local point p, at scale s and pan t, lands on screen (relative to viewport
  // centre) at `t + s*(p - boxCenter)`. Holding that fixed at a target `anchor` (also relative to
  // viewport centre) across a scale change from oldS to newS solves to
  // `newT = anchor*(1 - newS/oldS) + oldT*(newS/oldS)` — the oldS terms cancel entirely, so this
  // never needs to know where `p` actually was, only the anchor and the old/new pan+scale.
  function applyZoom(rawScale: number, anchorClientX?: number, anchorClientY?: number) {
    const newScale = clamp(rawScale, MIN_SCALE, MAX_SCALE);
    const ratio = newScale / scaleRef.current;
    const rect = viewportRef.current?.getBoundingClientRect();
    const anchorX = rect && anchorClientX !== undefined ? anchorClientX - rect.left - rect.width / 2 : 0;
    const anchorY = rect && anchorClientY !== undefined ? anchorClientY - rect.top - rect.height / 2 : 0;
    scaleRef.current = newScale;
    txRef.current = clampX(anchorX * (1 - ratio) + txRef.current * ratio, newScale);
    tyRef.current = clampY(anchorY * (1 - ratio) + tyRef.current * ratio, newScale);
    applyTransform();
  }

  // Recenters the pan so `node` sits at the viewport's centre, at the *current* zoom level — never
  // exactly centering a node near the map's edge (that would require the box to extend past its own
  // border to reach the viewport's far side), just as close to centered as the box's overhang
  // allows, via the same clampX/clampY every drag already respects. `scale` multiplies the offset
  // because translate(tx,ty) here sits *inside* the box's own scale() transform (see the transform
  // string below) — panning at 2x zoom needs twice the raw pixel offset to move a box-local point
  // the same visual distance.
  function centerOn(node: { x: number; y: number }) {
    txRef.current = clampX(scaleRef.current * boxPxRef.current * (0.5 - node.x / 100));
    tyRef.current = clampY(scaleRef.current * boxPxRef.current * (0.5 - node.y / 100));
    applyTransform();
  }

  // Center on the hero's current node the instant the map opens, once the viewport has its real
  // size — never on the box's own geometric center by default.
  useEffect(() => {
    const el = viewportRef.current;
    const node = NODE_BY_ID[getWorldState().currentNodeId];
    if (!el || !node) return;
    const rect = el.getBoundingClientRect();
    viewportSizeRef.current = { w: rect.width, h: rect.height };
    boxPxRef.current = Math.max(rect.width, rect.height) * BOX_MULTIPLIER;
    centerOn(node);
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
  const volcano = nodes.find((n) => n.kind === "volcano");
  const activeDialogue = activeDialogueNodeId ? DIALOGUE_BY_NODE[activeDialogueNodeId] : null;
  const talkTarget = currentNode?.dialogueId ? currentNode : null;

  /* ---------------------------------------------------------------------- pan / zoom handlers */

  function pinchDistance(): number | null {
    const pts = Array.from(pointers.current.values());
    if (pts.length < 2) return null;
    return distance(pts[0], pts[1]);
  }

  function pinchMidpoint(): { x: number; y: number } | null {
    const pts = Array.from(pointers.current.values());
    if (pts.length < 2) return null;
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
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
      dragStart.current = { x: e.clientX, y: e.clientY, tx: txRef.current, ty: tyRef.current };
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
      const mid = pinchMidpoint();
      if (dist && pinchStartDist.current && mid) {
        applyZoom(scaleRef.current * (dist / pinchStartDist.current), mid.x, mid.y);
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
          viewportRef.current?.style.setProperty("cursor", "grabbing");
        }
        txRef.current = clampX(dragStart.current.tx + dx);
        tyRef.current = clampY(dragStart.current.ty + dy);
        applyTransform();
      }
    }
  }

  function onPointerUp(e: ReactPointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStartDist.current = null;
    if (pointers.current.size === 0) {
      dragStart.current = null;
      viewportRef.current?.style.setProperty("cursor", "grab");
    } else if (pointers.current.size === 1) {
      // Lifting one finger out of a pinch leaves a single finger still down — re-baseline the drag
      // from ITS current tracked position, not whatever dragStart held before the pinch started (or
      // null). Without this the very next move computes its delta against a stale/nonexistent
      // baseline and the pan jumps instantly to wherever that stale math points.
      const [remaining] = pointers.current.values();
      dragStart.current = { x: remaining.x, y: remaining.y, tx: txRef.current, ty: tyRef.current };
    }
  }

  function onWheel(e: ReactWheelEvent) {
    e.preventDefault();
    applyZoom(scaleRef.current * (1 - e.deltaY * 0.0015), e.clientX, e.clientY);
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
        style={{ containerType: "size", cursor: "grab", backgroundColor: "#0a2438" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {/* Ocean: fixed to the viewport, never part of the pannable/zoomable box below, so it always
            fills the screen edge to edge no matter how far out the island is zoomed or panned — the
            island shrinks into open water at low zoom instead of hitting a wall of flat black. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(130% 110% at 50% 45%, #1c5b7a 0%, #123f57 48%, #081c2c 100%)" }}
          />
          {OCEAN_SHIMMER.map((b, i) => (
            <div
              key={i}
              className="animate-water absolute rounded-full bg-cyan-100/[0.06]"
              style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, aspectRatio: `${b.w} / ${b.h}`, filter: "blur(18px)", animationDelay: `${b.delay}s` }}
            />
          ))}
        </div>

        <div
          ref={boxRef}
          onClick={onBoxClick}
          className="absolute left-1/2 top-1/2"
          style={{
            width: BOX_SIZE_CQ,
            aspectRatio: "1 / 1",
            transform: `translate(-50%, -50%) translate(${txRef.current}px, ${tyRef.current}px) scale(${scaleRef.current})`,
            boxShadow: "0 0 60px 20px rgba(6,20,32,0.55)",
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
          {/* A real flap-cycle loop (LoopSprite over BIRD_FRAMES), not a single static perched-bird
              sprite translated across the screen — the earlier version reused the Camp diorama's
              perched-bird icon with no wing motion at all, which read as "stakes sliding" rather
              than birds flying. */}
          {!reduceMotion && BIRD_FRAMES.length > 0 && (
            <motion.div
              className="pointer-events-none absolute"
              style={{ left: "6%", top: "16%" }}
              animate={{ x: ["0%", "520%"], y: ["0%", "24%", "8%"] }}
              transition={{ duration: 34, repeat: Infinity, ease: "linear", repeatDelay: 8 }}
            >
              {BIRDS.map((b, i) => (
                <LoopSprite
                  key={i}
                  frames={BIRD_FRAMES}
                  frameDuration={b.frameDuration}
                  alt=""
                  className="absolute h-3 w-3 opacity-75"
                  style={{ left: `${b.dx}px`, top: `${b.dy}px` }}
                />
              ))}
            </motion.div>
          )}

          {/* ------------------------------------------------------------ ambient: volcano smoke */}
          {volcano && SMOKE_FRAMES.length > 0 && (
            <div className="pointer-events-none absolute" style={{ left: `${volcano.x}%`, top: `${volcano.y}%` }}>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute -translate-x-1/2"
                  style={{ bottom: 0 }}
                  animate={reduceMotion ? { opacity: 0.5 } : { y: [0, -34], x: [0, i % 2 === 0 ? 6 : -5], opacity: [0, 0.65, 0] }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 5, repeat: Infinity, ease: "easeOut", delay: i * 1.7 }}
                >
                  <LoopSprite frames={SMOKE_FRAMES} frameDuration={220} alt="" className="h-8 w-8" />
                </motion.div>
              ))}
              {!reduceMotion &&
                EMBERS.map((e, i) => (
                  <span
                    key={i}
                    className="animate-float-up absolute h-0.5 w-0.5 rounded-full bg-orange-300"
                    style={{ left: `${e.x}%`, top: `${e.y}%`, "--dur": `${e.dur}s`, "--delay": `${e.delay}s` } as CSSProperties}
                  />
                ))}
            </div>
          )}

          {/* -------------------------------------------------------------------- ambient: wildlife */}
          {DEER_FRAMES.length > 0 && (
            <AnimatePresence>
              {deerVisible && (
                <motion.div
                  className="pointer-events-none absolute"
                  style={{ left: `${DEER_SPOT.x}%`, top: `${DEER_SPOT.y}%`, transform: "translate(-50%, -100%)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2 }}
                >
                  <LoopSprite frames={DEER_FRAMES} frameDuration={280} alt="" className="h-7 w-7" style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.5))" }} />
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* ----------------------------------------------------------------------- ambient: snow */}
          {!reduceMotion && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {SNOW.map((s, i) => (
                <span
                  key={i}
                  className="animate-snow-fall absolute h-1 w-1 rounded-full bg-white/80"
                  style={{ left: `${s.x}%`, top: `${s.y}%`, "--dur": `${s.dur}s`, "--delay": `${s.delay}s` } as CSSProperties}
                />
              ))}
            </div>
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

      {onEnterTown && currentNode?.kind === "city" && !activeDialogue && !travelingTo && (
        <button
          type="button"
          onClick={onEnterTown}
          className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 rounded-full border border-lantern/45 bg-black/60 px-3 py-1.5 text-xs font-bold text-lantern-glow backdrop-blur-md transition-colors hover:border-lantern/80 hover:bg-black/75"
        >
          Entrer dans la Cité
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
