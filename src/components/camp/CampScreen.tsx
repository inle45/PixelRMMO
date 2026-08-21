import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import CampDayCycle from "./CampDayCycle";
import WorldMapOverlay from "./WorldMapOverlay";

/**
 * The Camp tab: a full-bleed, non-scrolling window onto the hero's camp and nothing else.
 *
 * The Écus/Marché header, the hero status panel and the backpack grid that used to live here were
 * removed outright rather than relocated — Écus and level are already in the Inventaire header, and
 * the paper doll plus the 30-slot bag cover equipment and inventory far better than the three
 * read-only slots and 16 cells here ever did. Camp is now purely the ambient scene.
 *
 * `absolute inset-0` (not `h-full`) because App mounts this inside a fixed, height-constrained
 * region; filling that region absolutely means no intermediate element has to forward a height for
 * the scene's own `h-full` to resolve against.
 */
export default function CampScreen() {
  const [mapOpen, setMapOpen] = useState(false);

  return (
    <>
      <CampDayCycle onOpenMap={() => setMapOpen(true)} />
      <AnimatePresence>{mapOpen && <WorldMapOverlay onClose={() => setMapOpen(false)} />}</AnimatePresence>
    </>
  );
}
