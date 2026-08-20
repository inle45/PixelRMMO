import { motion } from "framer-motion";
import { RARITY_LABELS, type MonsterRarity } from "../../data/bestiary";
import { RARITY_THEME } from "./theme";

export default function RarityBadge({ rarity }: { rarity: MonsterRarity }) {
  const theme = RARITY_THEME[rarity];

  return (
    <motion.span
      animate={
        theme.pulse
          ? { opacity: [0.85, 1, 0.85], scale: [1, 1.04, 1] }
          : { opacity: 1, scale: 1 }
      }
      transition={theme.pulse ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : undefined}
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider ring-1 ${theme.bg} ${theme.text} ${theme.ring}`}
    >
      {RARITY_LABELS[rarity]}
    </motion.span>
  );
}
