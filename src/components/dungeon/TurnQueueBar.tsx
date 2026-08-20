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
    <div className="flex items-center gap-1.5 overflow-x-auto rounded-full border border-white/10 bg-black/30 px-2 py-1.5 backdrop-blur">
      <span className="flex-none px-1 text-[9px] font-bold uppercase tracking-wide text-white/40">Tours</span>
      {upcoming.map((id) => {
        const c = byId[id];
        const active = id === activeId;
        return (
          <div
            key={id}
            className={
              "flex h-7 w-7 flex-none items-center justify-center rounded-full border transition-all " +
              (active
                ? "scale-110 border-lantern bg-lantern/20 shadow-[0_0_10px_rgba(255,179,71,0.6)]"
                : "border-white/15 bg-black/30 opacity-70")
            }
          >
            <img src={c.portrait} alt={c.name} className="h-5 w-5 object-contain" style={{ imageRendering: "pixelated" }} />
          </div>
        );
      })}
    </div>
  );
}
