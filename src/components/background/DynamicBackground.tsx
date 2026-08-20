import { AnimatePresence, motion } from "framer-motion";
import { TABS, type TabId } from "../../data/tabs";

interface DynamicBackgroundProps {
  active: TabId;
}

export default function DynamicBackground({ active }: DynamicBackgroundProps) {
  const bg = TABS.find((t) => t.id === active)?.background;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#0b0f1a]" aria-hidden="true">
      <AnimatePresence>
        <motion.img
          key={active}
          src={bg}
          alt=""
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ imageRendering: "pixelated" }}
        />
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-0 bg-black/45" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(5,7,15,0.65)_100%)]" />
    </div>
  );
}
