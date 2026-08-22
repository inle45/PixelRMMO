import RarityFrame from "../codex/RarityFrame";
import type { InventoryEntry } from "../inventory/InventoryGrid";

const GRID_SIZE = 30;

export type StorageSide = "bag" | "chest";

interface DraggedRef {
  side: StorageSide;
  kind: InventoryEntry["kind"];
  id: string;
}

interface StorageGridProps {
  side: StorageSide;
  entries: InventoryEntry[];
  /** Click (or drag from this pane onto the other one) moves the whole stack across. */
  onTransfer: (entry: InventoryEntry) => void;
  /** A stack from the OTHER pane was dropped here — StorageModal resolves it against its own
   * source-of-truth lists (this pane's `entries` never contains it, so this grid can't). */
  onDropFromOtherSide: (ref: DraggedRef) => void;
}

/**
 * One pane of the storage modal's dual-volet layout — a compact 30-slot grid, drag-and-drop capable
 * in both directions. Deliberately a plain presentational grid rather than a second copy of
 * InventoryGrid: this modal's filter tabs live once at the modal level (applied to both panes
 * identically), so there's no per-pane filter/sort UI to own here.
 */
export default function StorageGrid({ side, entries, onTransfer, onDropFromOtherSide }: StorageGridProps) {
  const slots: (InventoryEntry | null)[] = [...entries];
  while (slots.length < GRID_SIZE) slots.push(null);

  return (
    <div
      className="grid grid-cols-4 gap-1.5 sm:grid-cols-5"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const raw = e.dataTransfer.getData("application/x-pixelrmmo-storage-entry");
        if (!raw) return;
        const ref = JSON.parse(raw) as DraggedRef;
        if (ref.side === side) return; // dropped back onto its own pane — no-op
        onDropFromOtherSide(ref);
      }}
    >
      {slots.map((entry, i) =>
        entry ? (
          <RarityFrame key={`${entry.kind}-${entry.id}`} rarity={entry.rarity} radius="rounded-lg" onClick={() => onTransfer(entry)}>
            <div
              draggable
              onDragStart={(e) => {
                const ref: DraggedRef = { side, kind: entry.kind, id: entry.id };
                e.dataTransfer.setData("application/x-pixelrmmo-storage-entry", JSON.stringify(ref));
              }}
              className={
                "relative flex aspect-square w-full cursor-grab items-center justify-center rounded-lg bg-black/30 p-1 active:cursor-grabbing " +
                (entry.locked ? "opacity-45" : "")
              }
              title={entry.name}
            >
              <img
                src={entry.icon}
                alt={entry.name}
                className="h-full w-full object-contain"
                style={{ imageRendering: "pixelated" }}
                draggable={false}
              />
              {entry.count > 1 && (
                <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[9px] font-bold text-white">
                  x{entry.count}
                </span>
              )}
            </div>
          </RarityFrame>
        ) : (
          <div key={`empty-${side}-${i}`} className="aspect-square w-full rounded-lg border border-white/5 bg-black/10" />
        )
      )}
    </div>
  );
}
