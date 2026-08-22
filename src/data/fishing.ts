import { addOwned, applyRewards, spendEcus, getInventory } from "./inventory";
import { MONSTER_BY_ID } from "./bestiary";

/**
 * Le Bassin du Cratère — the second gathering zone, and a deliberate structural echo of
 * `gathering.ts` rather than a new set of conventions: tiers described by data, a settle-on-read
 * consumable resource (rod durability instead of a sickle), chance-rolled drop tables, and a
 * guardian ambush that mounts the SHARED battle engine (see EncounterDef in waves.ts).
 *
 * What differs is the pressure model. The cave punishes lingering (toxicity climbs on a clock);
 * the lake punishes *failure* — a snapped line costs the bait outright, so the bait economy is the
 * gate. That keeps the two zones from feeling like the same loop with different art.
 */

export type FishingTier = 1 | 2 | 3;

export interface FishingDrop {
  materialId: string;
  /** Percent chance this line lands on a landed catch. */
  chance: number;
  qty: number;
}

export interface FishingSpotDef {
  id: string;
  tier: FishingTier;
  name: string;
  levelRequired: number;
  /** Consumable id of the bait this spot demands — no bait, no cast. */
  baitId: string;
  /** Bestiary id of the creature that can ambush here. */
  guardianId: string;
  /** The spot's catch table. The headline fish is a roll, never a guarantee — same rule the cave's
   * nodes had to learn: a Rare/Épique badge on a 100%-drop item is a lie. */
  drops: FishingDrop[];
  xp: number;
  /** Seconds the `!` reflex window stays open. Tightens sharply with tier. */
  reflexWindow: number;
  /** Seconds of tug-of-war on the tension gauge. */
  fightDuration: number;
  /** How fast the safe zone slides up and down the gauge (percent per second). */
  zoneSpeed: number;
  /** Height of the safe zone as a percentage of the gauge — smaller is harder. */
  zoneSize: number;
  /** Percentage position on the crater-lake backdrop. Measured against the artwork's own rings:
   * the shallow stone shelf by the dock, the misty mid-water, and the black abyss at the centre. */
  x: number;
  y: number;
  accent: string;
  /** Only castable between 21h and 06h. */
  nightOnly?: boolean;
}

export const FISHING_SPOTS: FishingSpotDef[] = [
  {
    id: "shore_waters",
    tier: 1,
    name: "Eaux de Rive",
    levelRequired: 1,
    baitId: "plant_bait",
    guardianId: "marsh_leech_toad",
    drops: [{ materialId: "golden_carp", chance: 80, qty: 1 }],
    xp: 25,
    reflexWindow: 1.5,
    fightDuration: 5,
    zoneSpeed: 26,
    zoneSize: 30,
    x: 50,
    y: 74,
    accent: "#6ee7a0",
  },
  {
    id: "misty_heart",
    tier: 2,
    name: "Cœur Brumeux",
    levelRequired: 10,
    baitId: "glow_bait",
    guardianId: "mist_stalker",
    drops: [
      { materialId: "golden_carp", chance: 55, qty: 1 },
      { materialId: "spectral_eel", chance: 40, qty: 1 },
    ],
    xp: 70,
    reflexWindow: 1.0,
    fightDuration: 7,
    zoneSpeed: 40,
    zoneSize: 22,
    x: 31,
    y: 44,
    accent: "#5eead4",
    nightOnly: true,
  },
  {
    id: "abyssal_pit",
    tier: 3,
    name: "Fosse Abyssale",
    levelRequired: 20,
    baitId: "toxic_harpoon",
    guardianId: "crater_leviathan",
    drops: [
      { materialId: "spectral_eel", chance: 50, qty: 1 },
      { materialId: "ancestral_catfish", chance: 22, qty: 1 },
      { materialId: "sunken_chest", chance: 12, qty: 1 },
    ],
    xp: 160,
    reflexWindow: 0.6,
    fightDuration: 9,
    zoneSpeed: 58,
    zoneSize: 16,
    x: 50,
    y: 40,
    accent: "#c084fc",
  },
];

export const SPOT_BY_ID: Record<string, FishingSpotDef> = Object.fromEntries(
  FISHING_SPOTS.map((s) => [s.id, s])
);

/** Flat bonus added to every catch line's odds on a perfect landing — playing well buys better
 * odds on the prestige fish, not merely more of the bulk one (the cave's `PERFECT_CHANCE_BONUS`
 * rule, applied here too so the two zones read consistently). */
export const PERFECT_CHANCE_BONUS = 15;
/** A perfect landing also multiplies quantity, per the spec's "+50 % de rendement". */
export const PERFECT_YIELD_MULT = 1.5;

/** Chance per cast that the tier's creature takes the bait instead of a fish. */
export const AMBUSH_CHANCE = 0.15;

export const ROD_MAX_DURABILITY = 30;
/** A snapped line costs durability; a clean landing costs none. */
export const ROD_BREAK_COST = 2;
export const ROD_REPAIR_COST = 75;

/** The Harpon Toxique's own effect, applied when fishing the abyss: marine guardians hit softer. */
export const HARPOON_ATK_REDUCTION = 0.4;

const STORAGE_KEY = "pixelrmmo:fishing";

export interface FishingState {
  rodDurability: number;
  /** Total catches landed, purely for the zone's own progress readout. */
  catches: number;
}

const DEFAULT_STATE: FishingState = { rodDurability: ROD_MAX_DURABILITY, catches: 0 };

export function getFishingState(): FishingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<FishingState>;
    return {
      rodDurability: typeof parsed.rodDurability === "number" ? parsed.rodDurability : ROD_MAX_DURABILITY,
      catches: typeof parsed.catches === "number" ? parsed.catches : 0,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function write(state: FishingState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** 21h–06h, the window the Appât Phosphorescent exists for. Wraps midnight, so it can't be a plain
 * `start <= h < end` test — same shape as useTimeOfDay's `night` fallthrough. */
export function isNight(now: Date = new Date()): boolean {
  const h = now.getHours();
  return h >= 21 || h < 6;
}

export function baitCount(baitId: string): number {
  return getInventory().ownedConsumables[baitId] ?? 0;
}

export type CastRefusal = "level" | "bait" | "rod" | "night" | null;

/** Everything that can stop a cast before it starts, resolved in one place so the spot pin, the
 * cast button and the HUD hint can never disagree about why the player is blocked. */
export function whyCannotCast(spot: FishingSpotDef, now: Date = new Date()): CastRefusal {
  if (getInventory().level < spot.levelRequired) return "level";
  if (getFishingState().rodDurability <= 0) return "rod";
  if (baitCount(spot.baitId) <= 0) return "bait";
  if (spot.nightOnly && !isNight(now)) return "night";
  return null;
}

/** Spends the bait. Called the moment the line goes out — a lost fight does NOT refund it, which is
 * the whole cost model of this zone. */
export function consumeBait(spot: FishingSpotDef): boolean {
  const state = getInventory();
  if ((state.ownedConsumables[spot.baitId] ?? 0) <= 0) return false;
  addOwned("consumable", spot.baitId, -1);
  return true;
}

export function breakLine(): void {
  const state = getFishingState();
  state.rodDurability = Math.max(0, state.rodDurability - ROD_BREAK_COST);
  write(state);
}

export function repairRod(): boolean {
  if (!spendEcus(ROD_REPAIR_COST)) return false;
  const state = getFishingState();
  state.rodDurability = ROD_MAX_DURABILITY;
  write(state);
  return true;
}

export interface CatchOutcome {
  granted: { materialId: string; amount: number }[];
  xp: number;
  perfect: boolean;
}

/** Banks a landed catch by rolling the spot's own table. */
export function grantCatch(spot: FishingSpotDef, perfect: boolean): CatchOutcome {
  const granted: { materialId: string; amount: number }[] = [];
  for (const drop of spot.drops) {
    const chance = perfect ? Math.min(100, drop.chance + PERFECT_CHANCE_BONUS) : drop.chance;
    if (Math.random() * 100 >= chance) continue;
    const amount = perfect ? Math.ceil(drop.qty * PERFECT_YIELD_MULT) : drop.qty;
    addOwned("material", drop.materialId, amount);
    granted.push({ materialId: drop.materialId, amount });
  }
  const xp = perfect ? spot.xp * 2 : spot.xp;
  applyRewards({ xp });
  const state = getFishingState();
  state.catches += 1;
  write(state);
  return { granted, xp, perfect };
}

export function spotGuardian(spot: FishingSpotDef) {
  return MONSTER_BY_ID[spot.guardianId];
}

/* ------------------------------------------------------------------------------- scene assets */

const fishingModules = import.meta.glob("../assets/gathering/fishing/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function asset(name: string): string {
  const entry = Object.entries(fishingModules).find(([p]) => p.endsWith(`/${name}.png`));
  return entry?.[1] ?? "";
}

export const bobberIcon = asset("bobber");

/** Lives in /public for the same single-large-consumer reason as the cave and town backdrops. */
export const LAKE_BACKGROUND = "/assets/gathering/crater_lake_bg.png";
export const LAKE_ASPECT = 384 / 680;
