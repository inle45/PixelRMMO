import { dailySeedFor, mulberry32, pickDistinct } from "./seededRandom";
import { applyRewards, type ApplyRewardsResult } from "./inventory";

export interface BountyTemplate {
  id: string;
  title: string;
  description: string;
  ecus: number;
  xp: number;
  materials?: Record<string, number>;
}

/** Flavor-only reward board, same spirit as the rest of this demo's "no real backend" systems — a
 * bounty is claimed outright rather than gated behind tracking an actual kill count, matching how
 * nothing else in the app enforces quest completion either. */
const BOUNTY_POOL: BountyTemplate[] = [
  { id: "vermin_purge", title: "Chasse aux Vermines", description: "Éliminez les rats pestiférés qui infestent les caves de la cité.", ecus: 30, xp: 40 },
  { id: "scrap_recovery", title: "Récupération de Ferraille", description: "Ramenez de la ferraille récupérable pour la forge royale.", ecus: 25, xp: 30, materials: { rusty_scrap: 2 } },
  { id: "bridge_watch", title: "Garde du Pont", description: "Tenez le pont est contre les rôdeurs nocturnes.", ecus: 40, xp: 20 },
  { id: "spectre_hunt", title: "Traque du Spectre", description: "Un spectre gémissant a été aperçu près des remparts.", ecus: 50, xp: 60 },
  { id: "militia_support", title: "Renfort de la Milice", description: "La garde manque de bras pour l'entraînement du matin.", ecus: 20, xp: 50 },
  { id: "bone_king_bounty", title: "Prime sur le Roi Squelette", description: "Le Roi Squelette reste une menace — toute preuve de sa défaite est récompensée.", ecus: 80, xp: 100 },
  { id: "herb_gathering", title: "Collecte d'Ossements Rares", description: "Les alchimistes de la cité recherchent des ossements intacts.", ecus: 15, xp: 15, materials: { brittle_bone: 1 } },
  { id: "night_patrol", title: "Patrouille Nocturne", description: "Accompagnez la garde lors de sa ronde des remparts.", ecus: 35, xp: 35 },
];

const BOUNTIES_PER_DAY = 3;

export function getDailyBounties(date: Date = new Date()): BountyTemplate[] {
  const random = mulberry32(dailySeedFor(date));
  return pickDistinct(BOUNTY_POOL, BOUNTIES_PER_DAY, random);
}

const STORAGE_KEY = "pixelrmmo:guardBounties";

interface GuardState {
  /** Local-date key ("2026-8-22") the claimed set below belongs to — a new day means a fresh set. */
  day: string;
  claimedIds: string[];
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function readState(date: Date): GuardState {
  const today = dayKey(date);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { day: today, claimedIds: [] };
    const parsed = JSON.parse(raw) as Partial<GuardState>;
    // A stale day's claims don't carry over — yesterday's bounties are gone, today's are fresh.
    if (parsed.day !== today) return { day: today, claimedIds: [] };
    return { day: today, claimedIds: parsed.claimedIds ?? [] };
  } catch {
    return { day: today, claimedIds: [] };
  }
}

function writeState(state: GuardState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function isBountyClaimed(bountyId: string, date: Date = new Date()): boolean {
  return readState(date).claimedIds.includes(bountyId);
}

/** Applies the bounty's rewards and marks it claimed for today. No-ops if already claimed. */
export function claimBounty(bounty: BountyTemplate, date: Date = new Date()): ApplyRewardsResult | null {
  const state = readState(date);
  if (state.claimedIds.includes(bounty.id)) return null;
  const result = applyRewards({ ecus: bounty.ecus, xp: bounty.xp, materials: bounty.materials });
  state.claimedIds.push(bounty.id);
  writeState(state);
  return result;
}
