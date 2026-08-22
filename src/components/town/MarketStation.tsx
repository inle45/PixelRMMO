import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { EQUIPMENT_BY_ID } from "../../data/equipment";
import { MATERIAL_BY_ID } from "../../data/materials";
import { BATTLE_ITEM_BY_ID } from "../../data/items";
import { RARITY_BY_ID, type RarityId } from "../../data/rarity";
import { getOwnedEquipment, getOwnedMaterials, getOwnedConsumables, type DiscardableKind } from "../../data/inventory";
import {
  getDailyNpcListings,
  isListingPurchased,
  buyNpcListing,
  getMyListings,
  listItem,
  cancelListing,
  SELL_DELAY_MS,
  MARKET_TAX_RATE,
  type NpcListingTemplate,
  type MyListing,
} from "../../data/marketListings";
import TownPanel from "./TownPanel";
import ecuIcon from "../../assets/icons/ecu.png";
import marketIcon from "../../assets/inventory/filters/all.png";

interface MarketStationProps {
  /** Omitted = inline (Marché nav tab). Present = modal (tapped the stalls on the plaza). */
  onClose?: () => void;
}

type MarketTab = "acheter" | "vendre" | "mesVentes";

const TABS: { id: MarketTab; label: string }[] = [
  { id: "acheter", label: "Acheter" },
  { id: "vendre", label: "Vendre" },
  { id: "mesVentes", label: "Mes Ventes" },
];

interface Display {
  name: string;
  icon: string;
  rarity: RarityId;
}

function resolveDisplay(kind: DiscardableKind, itemId: string): Display | null {
  if (kind === "equipment") {
    const e = EQUIPMENT_BY_ID[itemId];
    return e ? { name: e.name, icon: e.icon, rarity: e.rarity } : null;
  }
  if (kind === "material") {
    const m = MATERIAL_BY_ID[itemId];
    return m ? { name: m.name, icon: m.icon, rarity: m.rarity } : null;
  }
  const c = BATTLE_ITEM_BY_ID[itemId];
  return c ? { name: c.name, icon: c.icon, rarity: c.rarity } : null;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Marché C2C — this is a single-player demo with no backend and no real other players, so "other
 * mercenaries' offers" are a deterministic daily catalog and a listed item sells itself after a short
 * delay rather than waiting for a genuine buyer (see marketListings.ts). The three tabs the spec asks
 * for map directly onto that: Acheter reads the daily NPC catalog, Vendre lists an owned item, Mes
 * Ventes shows/cancels what's still pending and lets the settle-on-read pattern resolve the rest.
 */
export default function MarketStation({ onClose }: MarketStationProps) {
  const [tab, setTab] = useState<MarketTab>("acheter");
  const [version, setVersion] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [priceDrafts, setPriceDrafts] = useState<Record<string, number>>({});
  const [flashId, setFlashId] = useState<string | null>(null);

  // Ticks the countdown in "Mes Ventes" and re-triggers getMyListings' settle-on-read so a listing
  // that ages past SELL_DELAY_MS resolves while the tab is actually open, not just on next mount.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const npcListings = useMemo(() => getDailyNpcListings(), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const myListings = useMemo(() => getMyListings(now), [now, version]);
  const ownedEntries = useMemo(() => {
    const listedIds = new Set(myListings.map((l) => `${l.kind}:${l.itemId}`));
    const entries: { kind: DiscardableKind; itemId: string; count: number; display: Display }[] = [];
    for (const { item, count } of getOwnedEquipment()) {
      if (!listedIds.has(`equipment:${item.id}`)) entries.push({ kind: "equipment", itemId: item.id, count, display: { name: item.name, icon: item.icon, rarity: item.rarity } });
    }
    for (const { material, count } of getOwnedMaterials()) {
      entries.push({ kind: "material", itemId: material.id, count, display: { name: material.name, icon: material.icon, rarity: material.rarity } });
    }
    for (const { item, count } of getOwnedConsumables()) {
      entries.push({ kind: "consumable", itemId: item.id, count, display: { name: item.name, icon: item.icon, rarity: item.rarity } });
    }
    return entries;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, myListings]);

  function handleBuy(listing: NpcListingTemplate) {
    if (!buyNpcListing(listing)) return;
    setFlashId(listing.itemId);
    setTimeout(() => setFlashId(null), 500);
    setVersion((v) => v + 1);
  }

  function handleList(kind: DiscardableKind, itemId: string, defaultPrice: number) {
    const key = `${kind}:${itemId}`;
    const price = priceDrafts[key] ?? defaultPrice;
    if (!listItem(kind, itemId, Math.max(1, Math.round(price)))) return;
    setVersion((v) => v + 1);
  }

  function handleCancel(listing: MyListing) {
    if (!cancelListing(listing.id)) return;
    setVersion((v) => v + 1);
  }

  return (
    <TownPanel
      title="Marché C2C"
      subtitle="Hôtel des ventes entre mercenaires."
      icon={marketIcon}
      onClose={onClose}
    >
      <div className="mt-3 flex gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                "flex-1 rounded-full border px-2.5 py-1.5 text-[11px] font-bold transition-colors " +
                (tab === t.id ? "border-lantern/50 bg-lantern/15 text-lantern-glow" : "border-white/10 bg-black/25 text-white/55 hover:border-white/25")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-3 max-h-[420px] space-y-1.5 overflow-y-auto pr-0.5">
          {tab === "acheter" &&
            npcListings.map((listing) => {
              const display = resolveDisplay(listing.kind, listing.itemId);
              if (!display) return null;
              const rarity = RARITY_BY_ID[display.rarity];
              const purchased = isListingPurchased(listing.itemId);
              return (
                <div key={listing.itemId} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                  <motion.div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 bg-black/25"
                    style={{ borderColor: rarity.color }}
                    animate={flashId === listing.itemId ? { scale: [1, 1.15, 1] } : {}}
                  >
                    <img src={display.icon} alt="" className="h-7 w-7 object-contain" style={{ imageRendering: "pixelated" }} />
                  </motion.div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">{display.name}</p>
                    <p className="text-[9px] text-white/40">Vendeur : {listing.sellerName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBuy(listing)}
                    disabled={purchased}
                    className={
                      "flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-2 text-[10px] font-bold transition-opacity " +
                      (purchased ? "cursor-not-allowed bg-white/10 text-white/35" : "bg-gradient-to-r from-lantern to-lantern-glow text-black hover:opacity-90")
                    }
                  >
                    {purchased ? (
                      "Vendu"
                    ) : (
                      <>
                        <img src={ecuIcon} alt="" className="h-3 w-3" style={{ imageRendering: "pixelated" }} />
                        {listing.basePrice}
                      </>
                    )}
                  </button>
                </div>
              );
            })}

          {tab === "vendre" &&
            (ownedEntries.length === 0 ? (
              <p className="py-6 text-center text-xs text-white/40">Rien à vendre pour le moment.</p>
            ) : (
              ownedEntries.map((entry) => {
                const key = `${entry.kind}:${entry.itemId}`;
                const rarity = RARITY_BY_ID[entry.display.rarity];
                const suggested = priceDrafts[key] ?? Math.max(1, Math.round((EQUIPMENT_BY_ID[entry.itemId]?.value ?? MATERIAL_BY_ID[entry.itemId]?.value ?? BATTLE_ITEM_BY_ID[entry.itemId]?.sellValue ?? 10)));
                const receive = Math.round(suggested * (1 - MARKET_TAX_RATE));
                return (
                  <div key={key} className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 bg-black/25" style={{ borderColor: rarity.color }}>
                        <img src={entry.display.icon} alt="" className="h-7 w-7 object-contain" style={{ imageRendering: "pixelated" }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-white">{entry.display.name}</p>
                        <p className="text-[9px] text-white/40">Possédé ×{entry.count}</p>
                      </div>
                      <input
                        type="number"
                        min={1}
                        value={suggested}
                        onChange={(e) => setPriceDrafts((d) => ({ ...d, [key]: Number(e.target.value) }))}
                        className="w-16 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-right text-xs font-bold text-white outline-none focus:border-lantern/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleList(entry.kind, entry.itemId, suggested)}
                        className="shrink-0 rounded-lg bg-gradient-to-r from-lantern to-lantern-glow px-2.5 py-2 text-[10px] font-bold text-black transition-opacity hover:opacity-90"
                      >
                        Vendre
                      </button>
                    </div>
                    <p className="mt-1.5 text-right text-[9px] text-white/35">Vous recevrez {receive} Écus (taxe 5%)</p>
                  </div>
                );
              })
            ))}

          {tab === "mesVentes" &&
            (myListings.length === 0 ? (
              <p className="py-6 text-center text-xs text-white/40">Aucune vente en cours.</p>
            ) : (
              myListings.map((listing) => {
                const display = resolveDisplay(listing.kind, listing.itemId);
                if (!display) return null;
                const rarity = RARITY_BY_ID[display.rarity];
                const remaining = listing.listedAt + SELL_DELAY_MS - now;
                return (
                  <div key={listing.id} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 bg-black/25" style={{ borderColor: rarity.color }}>
                      <img src={display.icon} alt="" className="h-7 w-7 object-contain" style={{ imageRendering: "pixelated" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-white">{display.name}</p>
                      <p className="text-[9px] text-white/40">
                        {listing.price} Écus — vente dans {formatCountdown(remaining)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancel(listing)}
                      className="shrink-0 rounded-lg border border-rose-400/40 bg-rose-950/30 px-2.5 py-2 text-[10px] font-bold text-rose-300 transition-colors hover:bg-rose-950/50"
                    >
                      Retirer
                    </button>
                  </div>
                );
              })
            ))}
      </div>
    </TownPanel>
  );
}
