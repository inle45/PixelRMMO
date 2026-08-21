import { motion } from "framer-motion";
import { PROJECTILE_BOLT, type Projectile } from "../../data/battleVfx";

/** Approximate stage-relative endpoints — hero always anchors bottom-left, enemies cluster top-right (see TurnBattleArena's stage layout). Precise DOM measurement isn't worth it for a fast diagonal streak. */
const HERO_POINT = { left: "16%", top: "80%" };
const ENEMY_POINT = { left: "80%", top: "22%" };

export default function ProjectileFx({ projectile, onDone }: { projectile: Projectile; onDone: () => void }) {
  const from = projectile.from === "hero" ? HERO_POINT : ENEMY_POINT;
  const to = projectile.from === "hero" ? ENEMY_POINT : HERO_POINT;
  const rotate = projectile.from === "hero" ? -40 : 140;

  return (
    <motion.div
      className="pointer-events-none absolute z-10 h-4 w-10 -translate-x-1/2 -translate-y-1/2"
      initial={{ left: from.left, top: from.top, opacity: 0 }}
      animate={{ left: [from.left, to.left], top: [from.top, to.top], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 0.32, ease: "easeIn" }}
      onAnimationComplete={onDone}
      style={{ rotate }}
    >
      <div
        className="absolute inset-0 rounded-full blur-[2px]"
        style={{ background: `radial-gradient(ellipse, ${projectile.color}cc, transparent 75%)` }}
      />
      <img
        src={PROJECTILE_BOLT}
        alt=""
        className="absolute inset-0 h-full w-full object-contain"
        style={{ imageRendering: "pixelated", mixBlendMode: "screen" }}
      />
    </motion.div>
  );
}
