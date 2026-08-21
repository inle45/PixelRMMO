import { STATUS_BY_ID } from "../../data/typeSystem";
import type { ActiveStatus } from "../../data/battleEngine";

export default function StatusIcon({ status }: { status: ActiveStatus }) {
  const def = STATUS_BY_ID[status.id];
  if (!def) return null;

  return (
    <div
      title={`${def.name} (${status.turnsLeft} tour${status.turnsLeft > 1 ? "s" : ""})`}
      className="relative flex h-5 w-5 items-center justify-center rounded-full bg-black/50 shadow-[0_0_5px_rgba(0,0,0,0.7)] ring-1 ring-white/20 backdrop-blur-sm"
    >
      {def.icon ? (
        <img src={def.icon} alt={def.name} className="h-3.5 w-3.5 object-contain" style={{ imageRendering: "pixelated" }} />
      ) : (
        // Every status ships a badge, so this is only a defensive fallback for a missing asset —
        // a plain dot rather than an emoji stand-in.
        <span className="h-2 w-2 rounded-full bg-white/70" />
      )}
      <span className="absolute -top-1.5 -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-black/80 text-[7px] font-bold text-white/80 ring-1 ring-white/15">
        {status.turnsLeft}
      </span>
      {status.stacks > 1 && (
        <span className="absolute -bottom-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-black text-[7px] font-bold text-white ring-1 ring-white/20">
          {status.stacks}
        </span>
      )}
    </div>
  );
}
