import type { ClassDefinition, Gender } from "../../data/classes";
import StatBar from "../ui/StatBar";

interface ClassCardProps {
  classDef: ClassDefinition;
  gender: Gender;
  selected: boolean;
  onSelect: () => void;
}

export default function ClassCard({ classDef, gender, selected, onSelect }: ClassCardProps) {
  const { theme } = classDef;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={
        "group relative flex flex-col rounded-2xl border bg-white/[0.05] p-5 text-left backdrop-blur-2xl " +
        "transition-all duration-300 ease-out focus-visible:outline-none " +
        (selected
          ? `-translate-y-2 scale-[1.02] border-transparent ring-2 ${theme.ring} ${theme.glow}`
          : `${theme.border} hover:-translate-y-1 hover:bg-white/[0.08]`)
      }
    >
      <span
        className={`absolute right-4 top-4 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider ${theme.badgeBg} ${theme.badgeText}`}
      >
        {classDef.icon} {classDef.badge}
      </span>

      <div className="mx-auto flex h-28 w-28 items-center justify-center">
        <img
          src={classDef.sprites[gender]}
          alt={classDef.names[gender]}
          className="h-full w-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)]"
          style={{ imageRendering: "pixelated" }}
        />
      </div>

      <div className="pt-2 text-center">
        <h3 className="text-lg font-bold text-white">{classDef.names[gender]}</h3>
        <p className="mt-0.5 text-xs text-white/55">{classDef.role}</p>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {classDef.stats.map((s) => (
          <StatBar key={s.label} {...s} />
        ))}
      </div>

      <p className="mt-2 text-[11px] font-medium text-white/45">{classDef.infoLine}</p>

      <div className={`mt-4 rounded-xl border ${theme.border} bg-black/20 p-3`}>
        <p className={`text-[11px] font-bold uppercase tracking-wide ${theme.badgeText}`}>
          Passif · {classDef.passive.name}
        </p>
        <p className="mt-1 text-xs leading-snug text-white/65">{classDef.passive.description}</p>
      </div>
    </button>
  );
}
