export type RarityId =
  | "poor"
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "mythic"
  | "legendary"
  | "transcendent";

export interface RarityDef {
  id: RarityId;
  tier: number;
  label: string;
  emoji: string;
  color: string;
}

export const RARITIES: RarityDef[] = [
  { id: "poor", tier: 1, label: "Brisé / Abîmé", emoji: "🟤", color: "#78716c" },
  { id: "common", tier: 2, label: "Commun", emoji: "⚪", color: "#f8fafc" },
  { id: "uncommon", tier: 3, label: "Peu Commun", emoji: "🟢", color: "#22c55e" },
  { id: "rare", tier: 4, label: "Rare", emoji: "🔵", color: "#3b82f6" },
  { id: "epic", tier: 5, label: "Épique", emoji: "🟣", color: "#a855f7" },
  { id: "mythic", tier: 6, label: "Mythique", emoji: "🔴", color: "#ef4444" },
  { id: "legendary", tier: 7, label: "Légendaire", emoji: "🟡", color: "#eab308" },
  { id: "transcendent", tier: 8, label: "Transcendant", emoji: "🌌", color: "#06b6d4" },
];

export const RARITY_BY_ID: Record<RarityId, RarityDef> = Object.fromEntries(
  RARITIES.map((r) => [r.id, r])
) as Record<RarityId, RarityDef>;
