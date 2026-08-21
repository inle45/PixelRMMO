import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CLASSES, type ClassId, type Gender } from "../../data/classes";
import {
  getInventory,
  getOwnedEquipment,
  getOwnedMaterials,
  getOwnedConsumables,
  equipItem,
  unequipSlot,
  consumeConsumable,
  discardItem,
  type DiscardableKind,
} from "../../data/inventory";
import type { EquipmentSlotId } from "../../data/equipment";
import HeroPaperDoll from "./HeroPaperDoll";
import InventoryGrid, { type InventoryEntry } from "./InventoryGrid";
import ItemDetailsModal from "./ItemDetailsModal";
import ecuIcon from "../../assets/icons/ecu.png";

const HERO_STORAGE_KEY = "pixelrmmo:hero";

interface StoredHero {
  classId: ClassId;
  gender: Gender;
}

function readStoredHero(): StoredHero | null {
  try {
    const raw = localStorage.getItem(HERO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredHero;
    return parsed?.classId && parsed?.gender ? parsed : null;
  } catch {
    return null;
  }
}

function buildEntries(): InventoryEntry[] {
  const entries: InventoryEntry[] = [];
  for (const { item, count } of getOwnedEquipment()) {
    entries.push({ kind: "equipment", id: item.id, name: item.name, icon: item.icon, rarity: item.rarity, count, equipment: item });
  }
  for (const { material, count } of getOwnedMaterials()) {
    entries.push({ kind: "material", id: material.id, name: material.name, icon: material.icon, rarity: material.rarity, count, material });
  }
  for (const { item, count } of getOwnedConsumables()) {
    entries.push({ kind: "consumable", id: item.id, name: item.name, icon: item.icon, rarity: item.rarity, count, consumable: item });
  }
  return entries;
}

export default function InventoryScreen() {
  const hero = useMemo(() => readStoredHero(), []);
  const classDef = hero ? CLASSES.find((c) => c.id === hero.classId) : undefined;

  // Equip/unequip/consume/discard mutate localStorage directly (same pattern as the rest of the
  // app's data layer) — bumping this version forces the derived reads below to recompute.
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<InventoryEntry | null>(null);
  const refresh = () => setVersion((v) => v + 1);

  // `version` is a cache-busting key, not a real dependency — it forces these to re-read
  // localStorage after equip/unequip/consume/discard mutate it directly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const inventory = useMemo(() => getInventory(), [version]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const entries = useMemo(() => buildEntries(), [version]);

  if (!classDef || !hero) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-8 text-center backdrop-blur-2xl">
        <p className="text-sm text-white/55">Choisis d'abord un héros pour consulter ton inventaire.</p>
      </div>
    );
  }

  function handleUnequipSlot(slot: EquipmentSlotId) {
    unequipSlot(slot);
    refresh();
  }

  function handleEquip() {
    if (!selected) return;
    equipItem(selected.id);
    refresh();
    setSelected(null);
  }

  function handleConsume() {
    if (!selected) return;
    consumeConsumable(selected.id);
    refresh();
    setSelected(null);
  }

  function handleDiscard() {
    if (!selected) return;
    const kind: DiscardableKind = selected.kind === "material" ? "material" : selected.kind;
    discardItem(kind, selected.id);
    refresh();
    setSelected(null);
  }

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          <img src={ecuIcon} alt="" className="h-7 w-7" style={{ imageRendering: "pixelated" }} />
          <span className="text-sm font-bold text-white">{inventory.ecus} Écus</span>
        </div>
        <span className="rounded-full bg-lantern/15 px-2.5 py-1 text-[10px] font-bold text-lantern-glow">
          NIV. {inventory.level}
        </span>
      </div>

      <HeroPaperDoll
        classDef={classDef}
        gender={hero.gender}
        level={inventory.level}
        equippedItemIds={inventory.equippedItems}
        onUnequipSlot={handleUnequipSlot}
      />

      <InventoryGrid entries={entries} onSelect={setSelected} />

      <AnimatePresence>
        {selected && (
          <ItemDetailsModal
            entry={selected}
            onClose={() => setSelected(null)}
            onEquip={handleEquip}
            onConsume={handleConsume}
            onDiscard={handleDiscard}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
