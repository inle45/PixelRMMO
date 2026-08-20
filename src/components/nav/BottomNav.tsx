import { motion } from "framer-motion";
import { TABS, type TabId } from "../../data/tabs";

interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around border-t border-white/10 bg-white/[0.06] px-2 pt-4 pb-2 backdrop-blur-2xl">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(tab.id)}
              className="relative flex flex-1 flex-col items-center gap-1 py-1 focus-visible:outline-none"
            >
              {isActive && (
                <motion.span
                  layoutId="activeTabDome"
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  className="absolute -top-7 left-1/2 h-14 w-14 -translate-x-1/2 rounded-full border-2 border-white/50 bg-gradient-to-b from-lantern-glow to-mercenary shadow-[0_0_10px_rgba(255,207,107,0.9),0_0_28px_rgba(255,179,71,0.55)]"
                />
              )}
              <motion.span
                animate={{ y: isActive ? -24 : 0, scale: isActive ? 1.15 : 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
                className="relative z-10 flex h-6 w-6 items-center justify-center"
              >
                <img
                  src={tab.icon}
                  alt=""
                  className={
                    "h-full w-full object-contain " +
                    (isActive ? "drop-shadow-[0_0_6px_rgba(255,207,107,0.9)]" : "opacity-75")
                  }
                  style={{ imageRendering: "pixelated" }}
                />
              </motion.span>
              <span
                className={
                  "relative z-10 text-[10px] font-semibold tracking-wide transition-colors " +
                  (isActive ? "text-lantern-glow" : "text-white/50")
                }
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
