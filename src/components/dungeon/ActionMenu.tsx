import { motion } from "framer-motion";
import attackIcon from "../../assets/icons/dungeon/attack.png";
import skillsIcon from "../../assets/icons/dungeon/skills.png";
import guardIcon from "../../assets/icons/dungeon/guard.png";
import backpackIcon from "../../assets/icons/dungeon/backpack.png";

interface ActionMenuProps {
  disabled: boolean;
  onBasicAttack: () => void;
  onOpenSkills: () => void;
  onGuard: () => void;
  onOpenItems: () => void;
}

const BUTTONS = [
  { key: "attack", label: "Attaque", icon: attackIcon, glow: "shadow-[0_0_18px_rgba(248,113,113,0.35)] hover:shadow-[0_0_24px_rgba(248,113,113,0.55)]", ring: "border-rose-400/30" },
  { key: "skills", label: "Sorts", icon: skillsIcon, glow: "shadow-[0_0_18px_rgba(167,139,250,0.35)] hover:shadow-[0_0_24px_rgba(167,139,250,0.55)]", ring: "border-violet-400/30" },
  { key: "guard", label: "Garde", icon: guardIcon, glow: "shadow-[0_0_18px_rgba(96,165,250,0.35)] hover:shadow-[0_0_24px_rgba(96,165,250,0.55)]", ring: "border-blue-400/30" },
  { key: "items", label: "Sac", icon: backpackIcon, glow: "shadow-[0_0_18px_rgba(52,211,153,0.35)] hover:shadow-[0_0_24px_rgba(52,211,153,0.55)]", ring: "border-emerald-400/30" },
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
        <motion.button
          key={b.key}
          type="button"
          disabled={disabled}
          onClick={handlers[b.key]}
          whileTap={{ scale: 0.9 }}
          className={
            "flex flex-col items-center gap-1 rounded-2xl border bg-black/40 py-2.5 text-white backdrop-blur-md transition-all disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none " +
            b.ring +
            " " +
            b.glow
          }
        >
          <img src={b.icon} alt="" className="h-6 w-6 object-contain" style={{ imageRendering: "pixelated" }} />
          <span className="text-[9px] font-bold uppercase tracking-wide">{b.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
