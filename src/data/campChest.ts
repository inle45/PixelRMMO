import { addOwned, getInventory, removeOwned, type DiscardableKind } from "./inventory";

const STORAGE_KEY = "pixelrmmo:chest";

/** Same three-bucket shape as the bag's own equipment/materials/consumables in inventory.ts — the
 * camp chest is just a second location items can sit in, not a different kind of container. */
export interface ChestBuckets {
  equipment: Record<string, number>;
  materials: Record<string, number>;
  consumables: Record<string, number>;
}

const DEFAULT_STATE: ChestBuckets = { equipment: {}, materials: {}, consumables: {} };

export function getChest(): ChestBuckets {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw) as Partial<ChestBuckets>;
    return {
      equipment: parsed.equipment ?? {},
      materials: parsed.materials ?? {},
      consumables: parsed.consumables ?? {},
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function write(state: ChestBuckets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bucketFor(state: ChestBuckets, kind: DiscardableKind): Record<string, number> {
  return kind === "equipment" ? state.equipment : kind === "material" ? state.materials : state.consumables;
}

/** Moves `qty` copies of an owned bag item into the camp chest. No-ops if the bag doesn't actually
 * hold that many (defends against a stale `count` snapshot from a re-render race). */
export function depositToChest(kind: DiscardableKind, itemId: string, qty: number): void {
  if (!removeOwned(kind, itemId, qty)) return;
  const chest = getChest();
  const bucket = bucketFor(chest, kind);
  bucket[itemId] = (bucket[itemId] ?? 0) + qty;
  write(chest);
}

/** Moves `qty` copies of a chest item back into the bag. No-ops if the chest doesn't hold that many. */
export function withdrawFromChest(kind: DiscardableKind, itemId: string, qty: number): void {
  const chest = getChest();
  const bucket = bucketFor(chest, kind);
  if ((bucket[itemId] ?? 0) < qty) return;
  bucket[itemId] -= qty;
  if (bucket[itemId] <= 0) delete bucket[itemId];
  write(chest);
  addOwned(kind, itemId, qty);
}

/** "Déposer tous les matériaux" — moves every owned material (reliques included, they're still
 * `kind: "material"`) into the chest in one pass. Returns how many individual units moved. */
export function depositAllMaterials(): number {
  const inv = getInventory();
  let moved = 0;
  for (const [id, qty] of Object.entries(inv.materials)) {
    if (qty <= 0) continue;
    depositToChest("material", id, qty);
    moved += qty;
  }
  return moved;
}
