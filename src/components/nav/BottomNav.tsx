import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TABS, type TabId } from "../../data/tabs";

interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const FRAME_INTERVAL_MS = 180;

export default function BottomNav({ active, onChange }: BottomNavProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), FRAME_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around border-t border-white/10 bg-white/[0.06] px-2 pt-3 pb-2 backdrop-blur-2xl">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          const frame = tab.frames[tick % tab.frames.length];
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(tab.id)}
              className="relative flex flex-1 flex-col items-center gap-1 py-1 focus-visible:outline-none"
            >
              <motion.span
                animate={{ y: isActive ? -6 : 0, scale: isActive ? 1.15 : 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
                className="relative z-10 flex h-7 w-7 items-center justify-center"
              >
                <img
                  src={frame}
                  alt=""
                  className={
                    "h-full w-full object-contain " +
                    (isActive ? "drop-shadow-[0_0_7px_rgba(255,207,107,0.9)]" : "opacity-70")
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
              {isActive && (
                <motion.span
                  layoutId="activeTabUnderline"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute bottom-0 h-0.5 w-8 rounded-full bg-lantern-glow shadow-[0_0_6px_rgba(255,207,107,0.8)]"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
