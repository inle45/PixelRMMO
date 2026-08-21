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
  color: string;
}

export const RARITIES: RarityDef[] = [
  { id: "poor", tier: 1, label: "Brisé / Abîmé", color: "#78716c" },
  { id: "common", tier: 2, label: "Commun", color: "#f8fafc" },
  { id: "uncommon", tier: 3, label: "Peu Commun", color: "#22c55e" },
  { id: "rare", tier: 4, label: "Rare", color: "#3b82f6" },
  { id: "epic", tier: 5, label: "Épique", color: "#a855f7" },
  { id: "mythic", tier: 6, label: "Mythique", color: "#ef4444" },
  { id: "legendary", tier: 7, label: "Légendaire", color: "#eab308" },
  { id: "transcendent", tier: 8, label: "Transcendant", color: "#06b6d4" },
];

export const RARITY_BY_ID: Record<RarityId, RarityDef> = Object.fromEntries(
  RARITIES.map((r) => [r.id, r])
) as Record<RarityId, RarityDef>;
