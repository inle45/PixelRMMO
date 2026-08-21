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
  { key: "attack", label: "Attaque", icon: attackIcon, rgb: "248,113,113", ring: "border-rose-400/30" },
  { key: "skills", label: "Sorts", icon: skillsIcon, rgb: "167,139,250", ring: "border-violet-400/30" },
  { key: "guard", label: "Garde", icon: guardIcon, rgb: "96,165,250", ring: "border-blue-400/30" },
  { key: "items", label: "Sac", icon: backpackIcon, rgb: "52,211,153", ring: "border-emerald-400/30" },
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
          animate={
            disabled
              ? { boxShadow: `0 0 0px rgba(${b.rgb},0)` }
              : { boxShadow: [`0 0 10px rgba(${b.rgb},0.25)`, `0 0 20px rgba(${b.rgb},0.5)`, `0 0 10px rgba(${b.rgb},0.25)`] }
          }
          transition={disabled ? { duration: 0.3 } : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className={
            "flex flex-col items-center gap-1 rounded-2xl border bg-black/40 py-2.5 text-white backdrop-blur-md disabled:cursor-not-allowed disabled:opacity-30 " +
            b.ring
          }
        >
          <img src={b.icon} alt="" className="h-6 w-6 object-contain" style={{ imageRendering: "pixelated" }} />
          <span className="text-[9px] font-bold uppercase tracking-wide">{b.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
