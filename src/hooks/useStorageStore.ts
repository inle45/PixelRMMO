import { useCallback, useMemo, useState } from "react";
import { getInventory, type DiscardableKind } from "../data/inventory";
import { getChest, depositToChest, withdrawFromChest, depositAllMaterials, type ChestBuckets } from "../data/campChest";
import { EQUIPMENT_BY_ID } from "../data/equipment";
import { MATERIAL_BY_ID } from "../data/materials";
import { BATTLE_ITEM_BY_ID } from "../data/items";
import type { ClassId } from "../data/classes";
import type { InventoryEntry } from "../components/inventory/InventoryGrid";

function entriesFromBuckets(buckets: ChestBuckets, classId: ClassId): InventoryEntry[] {
  const entries: InventoryEntry[] = [];
  for (const [id, count] of Object.entries(buckets.equipment)) {
    if (count <= 0) continue;
    const item = EQUIPMENT_BY_ID[id];
    if (!item) continue;
    entries.push({
      kind: "equipment",
      id,
      name: item.name,
      icon: item.icon,
      rarity: item.rarity,
      count,
      equipment: item,
      locked: !item.classes.includes(classId),
    });
  }
  for (const [id, count] of Object.entries(buckets.materials)) {
    if (count <= 0) continue;
    const material = MATERIAL_BY_ID[id];
    if (!material) continue;
    entries.push({ kind: "material", id, name: material.name, icon: material.icon, rarity: material.rarity, count, material });
  }
  for (const [id, count] of Object.entries(buckets.consumables)) {
    if (count <= 0) continue;
    const item = BATTLE_ITEM_BY_ID[id];
    if (!item) continue;
    entries.push({ kind: "consumable", id, name: item.name, icon: item.icon, rarity: item.rarity, count, consumable: item });
  }
  return entries;
}

/**
 * Reactive front for the two localStorage-backed containers (the bag in inventory.ts, the camp
 * chest in campChest.ts) that the storage modal transfers items between. Mirrors the
 * version-counter-forces-a-reread pattern InventoryScreen.tsx already uses for the same bag data —
 * every mutator here is a plain synchronous write to localStorage, not real component state, so
 * bumping `version` is what tells the two `useMemo`s below to go re-read it.
 */
export function useStorageStore(classId: ClassId) {
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  // `version` is a cache-busting key, not a real dependency.
  const bagEntries = useMemo(() => {
    const inv = getInventory();
    return entriesFromBuckets({ equipment: inv.ownedEquipment, materials: inv.materials, consumables: inv.ownedConsumables }, classId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, classId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const chestEntries = useMemo(() => entriesFromBuckets(getChest(), classId), [version, classId]);

  const moveToChest = useCallback(
    (kind: DiscardableKind, itemId: string, qty: number) => {
      depositToChest(kind, itemId, qty);
      refresh();
    },
    [refresh]
  );

  const moveToBag = useCallback(
    (kind: DiscardableKind, itemId: string, qty: number) => {
      withdrawFromChest(kind, itemId, qty);
      refresh();
    },
    [refresh]
  );

  const depositAll = useCallback(() => {
    depositAllMaterials();
    refresh();
  }, [refresh]);

  return { bagEntries, chestEntries, moveToChest, moveToBag, depositAll };
}
