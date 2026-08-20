import type { Gender } from "../../data/classes";

interface GenderToggleProps {
  value: Gender;
  onChange: (gender: Gender) => void;
}

export default function GenderToggle({ value, onChange }: GenderToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Genre du personnage"
      className="relative inline-flex rounded-full border border-white/15 bg-white/[0.06] p-1 backdrop-blur-xl"
    >
      <div
        className="absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-lantern via-lantern-glow to-mercenary transition-transform duration-300 ease-out"
        style={{ transform: value === "male" ? "translateX(0%)" : "translateX(calc(100% + 8px))" }}
      />
      {(
        [
          { key: "male" as const, icon: "♂", label: "Masculin" },
          { key: "female" as const, icon: "♀", label: "Féminin" },
        ]
      ).map((opt) => (
        <button
          key={opt.key}
          type="button"
          role="tab"
          aria-selected={value === opt.key}
          onClick={() => onChange(opt.key)}
          className={
            "relative z-10 flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-200 " +
            (value === opt.key ? "text-[#1a1004]" : "text-white/60 hover:text-white/85")
          }
        >
          <span aria-hidden="true" className="text-base leading-none">
            {opt.icon}
          </span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
