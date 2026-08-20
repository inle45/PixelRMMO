interface ActionMenuProps {
  disabled: boolean;
  onBasicAttack: () => void;
  onOpenSkills: () => void;
  onGuard: () => void;
  onOpenItems: () => void;
}

const BUTTONS = [
  { key: "attack", label: "Attaque", icon: "⚔️" },
  { key: "skills", label: "Sorts", icon: "✨" },
  { key: "guard", label: "Garde", icon: "🛡️" },
  { key: "items", label: "Sac", icon: "🎒" },
] as const;

export default function ActionMenu({ disabled, onBasicAttack, onOpenSkills, onGuard, onOpenItems }: ActionMenuProps) {
  const handlers: Record<(typeof BUTTONS)[number]["key"], () => void> = {
    attack: onBasicAttack,
    skills: onOpenSkills,
    guard: onGuard,
    items: onOpenItems,
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      {BUTTONS.map((b) => (
        <button
          key={b.key}
          type="button"
          disabled={disabled}
          onClick={handlers[b.key]}
          className="flex flex-col items-center gap-1 rounded-xl border border-white/15 bg-white/[0.07] py-2.5 text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <span className="text-lg">{b.icon}</span>
          <span className="text-[9px] font-bold uppercase tracking-wide">{b.label}</span>
        </button>
      ))}
    </div>
  );
}
