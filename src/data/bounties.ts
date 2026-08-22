import { dailySeedFor, mulberry32, pickDistinct } from "./seededRandom";
import { applyRewards, getInventory, removeOwned, type ApplyRewardsResult } from "./inventory";
import { MATERIAL_BY_ID } from "./materials";

export interface BountyRequirement {
  materialId: string;
  qty: number;
}

export interface BountyTemplate {
  id: string;
  title: string;
  description: string;
  /** What the player hands in as proof of the deed. This is what makes a bounty *claimable* rather
   * than a free button: there's no kill tracker in this game, but the loot table already is one —
   * you can only own a Glande de Venin if you actually fought a tomb spider for it. */
  requires: BountyRequirement[];
  ecus: number;
  xp: number;
}

/** Rewards are scaled off the turn-in cost (see materials.json `value`) so a bounty is always worth
 * more in Écus than selling the same materials outright — that premium is the whole reason to take
 * a contract instead of dumping loot on the Marché. */
const BOUNTY_POOL: BountyTemplate[] = [
  {
    id: "vermin_purge",
    title: "Chasse aux Vermines",
    description: "Les rats pestiférés pullulent sous la cité. Rapportez leurs ossements comme preuve.",
    requires: [{ materialId: "brittle_bone", qty: 3 }],
    ecus: 30,
    xp: 40,
  },
  {
    id: "scrap_recovery",
    title: "Récupération de Ferraille",
    description: "La forge royale manque de métal. Toute ferraille récupérée dans la Crypte fera l'affaire.",
    requires: [{ materialId: "rusty_scrap", qty: 4 }],
    ecus: 28,
    xp: 30,
  },
  {
    id: "guard_supplies",
    title: "Fournitures de la Garde",
    description: "L'intendance a besoin de cuir et de chitine pour rééquiper la milice.",
    requires: [
      { materialId: "scraped_leather", qty: 2 },
      { materialId: "chitin_scale", qty: 2 },
    ],
    ecus: 45,
    xp: 45,
  },
  {
    id: "royal_armory",
    title: "Commande de l'Armurerie",
    description: "L'armurier royal réclame du fer ancien pour reforger les lames de la garde.",
    requires: [{ materialId: "ancient_iron_scrap", qty: 2 }],
    ecus: 60,
    xp: 50,
  },
  {
    id: "spear_shafts",
    title: "Ravitaillement en Hampes",
    description: "Les lanciers ont brisé leurs hampes lors de la dernière sortie. Il en faut de neuves.",
    requires: [{ materialId: "hardened_bone_shaft", qty: 2 }],
    ecus: 55,
    xp: 45,
  },
  {
    id: "alchemist_order",
    title: "Commande de l'Alchimiste",
    description: "L'apothicaire de la cité prépare un antidote et lui manque un venin concentré.",
    requires: [{ materialId: "venom_gland", qty: 1 }],
    ecus: 80,
    xp: 65,
  },
  {
    id: "profane_relics",
    title: "Reliques Profanes",
    description: "Le clergé veut confisquer la soie tissée entre les sarcophages avant qu'elle ne se répande.",
    requires: [{ materialId: "necrotic_silk", qty: 1 }],
    ecus: 70,
    xp: 60,
  },
  {
    id: "spectre_hunt",
    title: "Traque du Spectre",
    description: "Un spectre gémissant hante les remparts. Son ectoplasme prouvera qu'il est tombé.",
    requires: [{ materialId: "cold_ectoplasm", qty: 1 }],
    ecus: 140,
    xp: 110,
  },
];

const BOUNTIES_PER_DAY = 3;

export function getDailyBounties(date: Date = new Date()): BountyTemplate[] {
  const random = mulberry32(dailySeedFor(date));
  return pickDistinct(BOUNTY_POOL, BOUNTIES_PER_DAY, random);
}

/** Resolves a requirement against the MATERIALS catalog + what the bag currently holds, for the
 * "2/3" progress pills the board renders. */
export function resolveRequirements(bounty: BountyTemplate) {
  const inv = getInventory();
  return bounty.requires.map((req) => ({
    req,
    material: MATERIAL_BY_ID[req.materialId],
    owned: inv.materials[req.materialId] ?? 0,
  }));
}

export function canCompleteBounty(bounty: BountyTemplate): boolean {
  const inv = getInventory();
  return bounty.requires.every((req) => (inv.materials[req.materialId] ?? 0) >= req.qty);
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

/** Hands in the required materials, applies the reward, and marks the bounty done for today.
 * Refuses (returns null) if already claimed or if the bag can't cover the turn-in. */
export function claimBounty(bounty: BountyTemplate, date: Date = new Date()): ApplyRewardsResult | null {
  const state = readState(date);
  if (state.claimedIds.includes(bounty.id)) return null;
  if (!canCompleteBounty(bounty)) return null;

  for (const req of bounty.requires) removeOwned("material", req.materialId, req.qty);
  const result = applyRewards({ ecus: bounty.ecus, xp: bounty.xp });
  state.claimedIds.push(bounty.id);
  writeState(state);
  return result;
}
