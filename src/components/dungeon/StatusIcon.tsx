import { STATUS_BY_ID } from "../../data/typeSystem";
import type { ActiveStatus } from "../../data/battleEngine";

export default function StatusIcon({ status }: { status: ActiveStatus }) {
  const def = STATUS_BY_ID[status.id];
  if (!def) return null;

  return (
    <div
      title={`${def.name} (${status.turnsLeft} tour${status.turnsLeft > 1 ? "s" : ""})`}
      className="relative flex h-6 w-6 items-center justify-center rounded-md border border-white/15 bg-black/60"
    >
      {def.icon ? (
        <img src={def.icon} alt={def.name} className="h-4 w-4 object-contain" style={{ imageRendering: "pixelated" }} />
      ) : (
        <span className="text-[10px]">{def.emoji}</span>
      )}
      {status.stacks > 1 && (
        <span className="absolute -bottom-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black text-[8px] font-bold text-white ring-1 ring-white/20">
          {status.stacks}
        </span>
      )}
    </div>
  );
}
