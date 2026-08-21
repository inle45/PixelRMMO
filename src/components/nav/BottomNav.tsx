import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TABS, type TabId } from "../../data/tabs";

interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const FRAME_INTERVAL_MS = 180;

export default function BottomNav({ active, onChange }: BottomNavProps) {
  const [tick, setTick] = useState(0);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), FRAME_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Publishes the bar's real rendered height as `--nav-height`, which the fullscreen Camp scene
  // sizes itself against. Measured rather than hardcoded because the bar isn't a fixed height: on a
  // narrow phone a longer tab label ("Marché C2C") wraps to two lines and the bar grows ~15px,
  // which as a constant would have put the scene's caption underneath it on exactly the devices
  // this is meant to look right on. A ResizeObserver also covers safe-area and late font loads.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const publish = () => document.documentElement.style.setProperty("--nav-height", `${el.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      ref={navRef}
      // The bar's surface (border/tint/blur) spans the full width while the tab row stays capped at
      // max-w-md and centred. Previously the surface itself was the capped element, which on a
      // desktop viewport left the page background showing as black gutters either side of it —
      // harmless when a scrolling page sat behind, obvious against the fullscreen Camp scene.
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-white/[0.06] backdrop-blur-2xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-3 pb-2">
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
