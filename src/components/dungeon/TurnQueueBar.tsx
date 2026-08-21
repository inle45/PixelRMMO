import type { Combatant } from "../../data/battleEngine";

interface TurnQueueBarProps {
  order: string[];
  combatants: Combatant[];
  activeId: string | null;
}

export default function TurnQueueBar({ order, combatants, activeId }: TurnQueueBarProps) {
  const byId = Object.fromEntries(combatants.map((c) => [c.instanceId, c]));
  const upcoming = order.filter((id) => byId[id]?.alive);

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto">
      {upcoming.map((id) => {
        const c = byId[id];
        const active = id === activeId;
        return (
          <div
            key={id}
            className={
              "flex h-7 w-7 flex-none items-center justify-center rounded-full transition-all " +
              (active
                ? "scale-110 bg-lantern/25 shadow-[0_0_10px_rgba(255,179,71,0.75)] ring-2 ring-lantern"
                : "bg-black/30 opacity-60 ring-1 ring-white/15")
            }
          >
            <img src={c.portrait} alt={c.name} className="h-5 w-5 object-contain" style={{ imageRendering: "pixelated" }} />
          </div>
        );
      })}
    </div>
  );
}
