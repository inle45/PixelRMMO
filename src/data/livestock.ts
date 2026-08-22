import rawSpecies from "./livestock.json";
import { addOwned, removeOwned, getInventory, spendEcus } from "./inventory";
import { MONSTER_BY_ID } from "./bestiary";

/**
 * Le Domaine d'Élevage — the camp's right-hand panel.
 *
 * Structurally this is the same settle-on-read shape as `energy.ts` (key recharge), `gathering.ts`
 * (toxicity decay) and `mining.ts` (node cooldowns): nothing ticks a timer to make production or
 * gestation advance, every read reconciles the stored timestamps against `now`. That is what lets a
 * pen keep producing with the tab closed, and it is why `getPen()` is the only thing the UI ever
 * calls — it settles births before returning.
 *
 * The species' *sprites* are not globbed here. Every one of the 15 is a real `bestiary.json` entry
 * (family `faune`, section "Élevage & Faune Domestique"), so `MONSTER_BY_ID` already carries its
 * portrait and idle frames — the pen reads them straight off the Codex rather than maintaining a
 * second asset table that could drift out of sync with it.
 */

export type LivestockTier = 1 | 2 | 3;

export interface SpeciesProduct {
  materialId: string;
  name: string;
  qty: number;
  /** Percent chance this line lands on a collection. The headline product of the rarer species is
   * deliberately NOT guaranteed — the same rarity-must-match-drop-rate rule the gathering zones
   * had to learn twice. */
  chance: number;
}

export interface SpeciesDef {
  id: string;
  name: string;
  tier: LivestockTier;
  tierLabel: string;
  levelRequired: number;
  feedId: string;
  feedName: string;
  /** Units drawn from the trough to start one production cycle. */
  feedPerCycle: number;
  products: SpeciesProduct[];
  cycleMs: number;
  gestationMs: number;
  /** Collections a newborn must live through before it counts as an adult (and can breed). */
  growthHarvests: number;
  cost: number;
  accent: string;
}

export const SPECIES: SpeciesDef[] = rawSpecies as SpeciesDef[];
export const SPECIES_BY_ID: Record<string, SpeciesDef> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

export const TIER_LABELS: Record<LivestockTier, string> = {
  1: "Basse-cour",
  2: "Étable des Bois",
  3: "Ménagerie Mystique",
};

/** Pen slots per tier. Breeding refuses when the tier's pen is already full, which is what stops a
 * fully-fed barn from growing without bound. */
export const PEN_CAPACITY: Record<LivestockTier, number> = { 1: 8, 2: 6, 3: 4 };

/** One trough per species. "Mangeoire remplie à 100 %" — the breeding precondition — means exactly
 * this many units sitting in it. */
export const TROUGH_CAPACITY = 10;

/**
 * What a gestation actually draws out of the full trough.
 *
 * Deliberately NOT the whole thing. The first pass zeroed the trough on breeding, which technically
 * satisfies "requires a full trough" but left the player unable to feed anything the moment they
 * bred — the same feed pays for both production and reproduction, so emptying it stalls the pen.
 * Half keeps the requirement meaningful (you still have to stock up to 100 %) without turning a
 * breeding into a production outage.
 */
export const BREEDING_FEED_COST = TROUGH_CAPACITY / 2;

export function speciesSprite(speciesId: string): string {
  return MONSTER_BY_ID[speciesId]?.portrait ?? "";
}

export function speciesFrames(speciesId: string): string[] {
  return MONSTER_BY_ID[speciesId]?.idleFrames ?? [];
}

/* --------------------------------------------------------------------------------- persistence */

export interface AnimalInstance {
  uid: string;
  speciesId: string;
  adult: boolean;
  /** Collections completed since birth; a baby becomes an adult at `growthHarvests`. */
  growth: number;
  /** When the current production cycle started, or 0 while the animal is unfed. */
  fedAt: number;
  bornAt: number;
}

export interface Gestation {
  speciesId: string;
  startedAt: number;
}

export interface LivestockState {
  animals: AnimalInstance[];
  troughs: Record<string, number>;
  gestations: Gestation[];
}

const STORAGE_KEY = "pixelrmmo:livestock";
const DEFAULT_STATE: LivestockState = { animals: [], troughs: {}, gestations: [] };

function readRaw(): LivestockState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const p = JSON.parse(raw) as Partial<LivestockState>;
    return {
      animals: p.animals ?? [],
      troughs: p.troughs ?? {},
      gestations: p.gestations ?? [],
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function write(state: LivestockState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let uidCounter = 0;
function newUid(speciesId: string): string {
  uidCounter += 1;
  return `${speciesId}-${Date.now().toString(36)}-${uidCounter}`;
}

/**
 * Turns every elapsed gestation into an actual newborn. Called by `getPen`, so a birth lands the
 * first time anyone looks at the barn after its timer ran out — including after a page reload, which
 * is the whole point of storing `startedAt` instead of holding a `setTimeout`.
 */
function settle(state: LivestockState, now: number): LivestockState {
  const stillCooking: Gestation[] = [];
  let changed = false;
  for (const g of state.gestations) {
    const species = SPECIES_BY_ID[g.speciesId];
    if (!species) continue;
    if (now - g.startedAt < species.gestationMs) {
      stillCooking.push(g);
      continue;
    }
    changed = true;
    state.animals.push({
      uid: newUid(g.speciesId),
      speciesId: g.speciesId,
      adult: false,
      growth: 0,
      fedAt: 0,
      bornAt: now,
    });
  }
  if (changed) {
    state.gestations = stillCooking;
    write(state);
  }
  return state;
}

/** The only read the UI should use. Settles births first. */
export function getPen(now: number = Date.now()): LivestockState {
  return settle(readRaw(), now);
}

export function animalsOfTier(state: LivestockState, tier: LivestockTier): AnimalInstance[] {
  return state.animals.filter((a) => SPECIES_BY_ID[a.speciesId]?.tier === tier);
}

export function adultsOf(state: LivestockState, speciesId: string): number {
  return state.animals.filter((a) => a.speciesId === speciesId && a.adult).length;
}

/* ------------------------------------------------------------------------------------ actions */

export function buyAnimal(speciesId: string, now: number = Date.now()): boolean {
  const species = SPECIES_BY_ID[speciesId];
  if (!species) return false;
  const state = getPen(now);
  if (animalsOfTier(state, species.tier).length >= PEN_CAPACITY[species.tier]) return false;
  if (getInventory().level < species.levelRequired) return false;
  if (!spendEcus(species.cost)) return false;
  state.animals.push({ uid: newUid(speciesId), speciesId, adult: true, growth: species.growthHarvests, fedAt: 0, bornAt: now });
  write(state);
  return true;
}

/** Moves feed material out of the bag and into that species' trough. Returns units actually moved,
 * which can be short of `units` when either the bag or the trough's headroom runs out first. */
export function fillTrough(speciesId: string, units: number): number {
  const species = SPECIES_BY_ID[speciesId];
  if (!species) return 0;
  const state = getPen();
  const held = getInventory().materials[species.feedId] ?? 0;
  const room = TROUGH_CAPACITY - (state.troughs[speciesId] ?? 0);
  const moved = Math.max(0, Math.min(units, held, room));
  if (moved === 0) return 0;
  removeOwned("material", species.feedId, moved);
  state.troughs[speciesId] = (state.troughs[speciesId] ?? 0) + moved;
  write(state);
  return moved;
}

/** Starts one production cycle by drawing the species' feed cost out of its trough. */
export function feedAnimal(uid: string, now: number = Date.now()): boolean {
  const state = getPen(now);
  const animal = state.animals.find((a) => a.uid === uid);
  if (!animal || animal.fedAt !== 0) return false;
  const species = SPECIES_BY_ID[animal.speciesId];
  if (!species) return false;
  if ((state.troughs[animal.speciesId] ?? 0) < species.feedPerCycle) return false;
  state.troughs[animal.speciesId] -= species.feedPerCycle;
  animal.fedAt = now;
  write(state);
  return true;
}

export function isReady(animal: AnimalInstance, now: number = Date.now()): boolean {
  const species = SPECIES_BY_ID[animal.speciesId];
  if (!species || animal.fedAt === 0) return false;
  return now - animal.fedAt >= species.cycleMs;
}

export function msUntilReady(animal: AnimalInstance, now: number = Date.now()): number {
  const species = SPECIES_BY_ID[animal.speciesId];
  if (!species || animal.fedAt === 0) return 0;
  return Math.max(0, species.cycleMs - (now - animal.fedAt));
}

export interface CollectOutcome {
  granted: { materialId: string; name: string; amount: number }[];
  grewUp: boolean;
}

/** Banks a finished cycle: rolls the species' product table, advances the animal's growth, and puts
 * it back to being hungry. A baby that crosses `growthHarvests` becomes an adult here — which is the
 * only way new breeding stock ever appears. */
export function collectProduct(uid: string, now: number = Date.now()): CollectOutcome | null {
  const state = getPen(now);
  const animal = state.animals.find((a) => a.uid === uid);
  if (!animal || !isReady(animal, now)) return null;
  const species = SPECIES_BY_ID[animal.speciesId];
  if (!species) return null;

  const granted: CollectOutcome["granted"] = [];
  for (const p of species.products) {
    if (Math.random() * 100 >= p.chance) continue;
    addOwned("material", p.materialId, p.qty);
    granted.push({ materialId: p.materialId, name: p.name, amount: p.qty });
  }

  animal.fedAt = 0;
  let grewUp = false;
  if (!animal.adult) {
    animal.growth += 1;
    if (animal.growth >= species.growthHarvests) {
      animal.adult = true;
      grewUp = true;
    }
  }
  write(state);
  return { granted, grewUp };
}

export type BreedBlocker = "adults" | "trough" | "capacity" | "busy" | null;

/** Why breeding is refused, or null when it is allowed. One function so the button's disabled state
 * and the reason shown next to it can never disagree. */
export function breedBlocker(speciesId: string, now: number = Date.now()): BreedBlocker {
  const species = SPECIES_BY_ID[speciesId];
  if (!species) return "adults";
  const state = getPen(now);
  if (state.gestations.some((g) => g.speciesId === speciesId)) return "busy";
  if (adultsOf(state, speciesId) < 2) return "adults";
  if ((state.troughs[speciesId] ?? 0) < TROUGH_CAPACITY) return "trough";
  if (animalsOfTier(state, species.tier).length >= PEN_CAPACITY[species.tier]) return "capacity";
  return null;
}

export function startBreeding(speciesId: string, now: number = Date.now()): boolean {
  if (breedBlocker(speciesId, now) !== null) return false;
  const state = getPen(now);
  state.troughs[speciesId] = Math.max(0, (state.troughs[speciesId] ?? 0) - BREEDING_FEED_COST);
  state.gestations.push({ speciesId, startedAt: now });
  write(state);
  return true;
}

export function msUntilBirth(speciesId: string, now: number = Date.now()): number {
  const state = getPen(now);
  const g = state.gestations.find((x) => x.speciesId === speciesId);
  const species = SPECIES_BY_ID[speciesId];
  if (!g || !species) return 0;
  return Math.max(0, species.gestationMs - (now - g.startedAt));
}

export function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
