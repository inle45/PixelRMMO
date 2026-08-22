import { dailySeedFor, mulberry32, pickDistinct } from "./seededRandom";
import { EQUIPMENT_BY_ID } from "./equipment";
import { MATERIAL_BY_ID } from "./materials";
import { BATTLE_ITEM_BY_ID } from "./items";
import { addOwned, removeOwned, spendEcus, earnEcus, type DiscardableKind } from "./inventory";

/**
 * A simulated C2C marketplace — this app has no backend and no other real players, so "other
 * mercenaries' listings" are a deterministic daily-seeded catalog rather than actual peer offers,
 * and a player's own listing "sells itself" after a short delay instead of waiting for a real buyer.
 * Both halves reuse patterns already established elsewhere: the daily rotation is the same
 * dailySeedFor/mulberry32 determinism bounties.ts and weather.ts's cycle rely on, and the
 * elapsed-time settle-on-read is the same shape energy.ts uses for key recharge.
 */

export interface NpcListingTemplate {
  kind: DiscardableKind;
  itemId: string;
  basePrice: number;
  sellerName: string;
}

const SELLER_NAMES = ["Grimjaw le Marchand", "Yolanda la Rôdeuse", "Baristan Sous-le-Pont", "Elowen la Discrète", "Cassius Ferblanc", "Mira l'Éclaireuse"];

/** Only items with no other acquisition path in a fresh save are worth buying — the catalog leans
 * on uncommon equipment (also forgeable, this is just a second route) and a handful of crypt
 * materials/consumables for a player who doesn't want to run the dungeon for one more stack. */
const NPC_CATALOG: { kind: DiscardableKind; itemId: string }[] = [
  { kind: "equipment", itemId: "reinforced_bone_helm" },
  { kind: "equipment", itemId: "reinforced_chitin_plate" },
  { kind: "equipment", itemId: "reinforced_scale_greaves" },
  { kind: "equipment", itemId: "tempered_steel_sword" },
  { kind: "equipment", itemId: "reinforced_longbow" },
  { kind: "equipment", itemId: "runic_staff" },
  { kind: "material", itemId: "ancient_iron_scrap" },
  { kind: "material", itemId: "chitin_scale" },
  { kind: "material", itemId: "hardened_bone_shaft" },
  { kind: "material", itemId: "scraped_leather" },
  { kind: "consumable", itemId: "heal_potion" },
  { kind: "consumable", itemId: "remedy" },
];

function priceFor(kind: DiscardableKind, itemId: string): number {
  if (kind === "equipment") return EQUIPMENT_BY_ID[itemId]?.value ?? 50;
  if (kind === "material") return (MATERIAL_BY_ID[itemId]?.value ?? 5) * 3; // a stack, not a single unit
  return BATTLE_ITEM_BY_ID[itemId]?.sellValue ?? 10;
}

const LISTINGS_PER_DAY = 6;

/** Deterministic "today's offers" — same for every session until the calendar day rolls over. Price
 * jitters ±15% off the base per listing (seeded, not random per render) so the board doesn't look
 * like a flat price list despite being fully reproducible. */
export function getDailyNpcListings(date: Date = new Date()): NpcListingTemplate[] {
  const random = mulberry32(dailySeedFor(date) ^ 0x5eed);
  const chosen = pickDistinct(NPC_CATALOG, LISTINGS_PER_DAY, random);
  return chosen.map((entry, i) => {
    const jitter = 0.85 + random() * 0.3;
    const seller = SELLER_NAMES[(dailySeedFor(date) + i) % SELLER_NAMES.length];
    return { ...entry, basePrice: Math.round(priceFor(entry.kind, entry.itemId) * jitter), sellerName: seller };
  });
}

/* ------------------------------------------------------------------ purchases (NPC -> player) */

const PURCHASED_KEY = "pixelrmmo:marketPurchased";

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function readPurchased(date: Date): Set<string> {
  try {
    const raw = localStorage.getItem(PURCHASED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { day?: string; ids?: string[] };
    if (parsed.day !== dayKey(date)) return new Set();
    return new Set(parsed.ids ?? []);
  } catch {
    return new Set();
  }
}

function writePurchased(date: Date, ids: Set<string>) {
  localStorage.setItem(PURCHASED_KEY, JSON.stringify({ day: dayKey(date), ids: [...ids] }));
}

export function isListingPurchased(itemId: string, date: Date = new Date()): boolean {
  return readPurchased(date).has(itemId);
}

/** Buys a single day-listing — each NPC offer is a one-of-a-kind, not restocked stock. */
export function buyNpcListing(listing: NpcListingTemplate, date: Date = new Date()): boolean {
  const purchased = readPurchased(date);
  if (purchased.has(listing.itemId)) return false;
  if (!spendEcus(listing.basePrice)) return false;
  addOwned(listing.kind, listing.itemId, 1);
  purchased.add(listing.itemId);
  writePurchased(date, purchased);
  return true;
}

/* ------------------------------------------------------------------- own listings (player -> "buyer") */

export interface MyListing {
  id: string;
  kind: DiscardableKind;
  itemId: string;
  price: number;
  listedAt: number;
}

const MY_LISTINGS_KEY = "pixelrmmo:myListings";

/** A listed item "sells" this long after being posted — short enough to actually resolve inside one
 * play session (unlike the 15-minute dungeon key recharge, which is deliberately slow), long enough
 * that it doesn't read as an instant sale either. */
export const SELL_DELAY_MS = 2 * 60 * 1000;
export const MARKET_TAX_RATE = 0.05;

function readMyListings(): MyListing[] {
  try {
    const raw = localStorage.getItem(MY_LISTINGS_KEY);
    return raw ? (JSON.parse(raw) as MyListing[]) : [];
  } catch {
    return [];
  }
}

function writeMyListings(listings: MyListing[]) {
  localStorage.setItem(MY_LISTINGS_KEY, JSON.stringify(listings));
}

/** Settles every listing older than SELL_DELAY_MS (credits price minus the 5% tax, same as
 * energy.ts's settle() applying owed recharge ticks on read) and returns what's left pending. Safe
 * to call on every render — it only writes when something actually resolved. */
export function getMyListings(now: number = Date.now()): MyListing[] {
  const listings = readMyListings();
  const pending: MyListing[] = [];
  let sold = false;
  for (const listing of listings) {
    if (now - listing.listedAt >= SELL_DELAY_MS) {
      earnEcus(Math.round(listing.price * (1 - MARKET_TAX_RATE)));
      sold = true;
    } else {
      pending.push(listing);
    }
  }
  if (sold) writeMyListings(pending);
  return pending;
}

/** Lists one unit of an owned item at `price` — removed from the bag immediately, same as handing
 * it to an auctioneer. Returns false if the bag doesn't actually hold one. */
export function listItem(kind: DiscardableKind, itemId: string, price: number, now: number = Date.now()): boolean {
  if (!removeOwned(kind, itemId, 1)) return false;
  const listings = readMyListings();
  listings.push({ id: `${kind}:${itemId}:${now}`, kind, itemId, price, listedAt: now });
  writeMyListings(listings);
  return true;
}

/** Pulls a still-pending listing back — the item returns to the bag, no tax charged since it never sold. */
export function cancelListing(id: string): boolean {
  const listings = readMyListings();
  const listing = listings.find((l) => l.id === id);
  if (!listing) return false;
  addOwned(listing.kind, listing.itemId, 1);
  writeMyListings(listings.filter((l) => l.id !== id));
  return true;
}
