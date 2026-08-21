import rawTypes from "./types.json";
import rawStatuses from "./statuses.json";
import rawWeather from "./weather.json";

export type DamageTypeId = "fire" | "ice" | "lightning" | "nature" | "holy" | "shadow" | "physical";

export interface DamageTypeDef {
  id: DamageTypeId;
  name: string;
  color: string;
  description: string;
  strongVs: DamageTypeId[];
  icon: string;
}

export interface StatusDef {
  id: string;
  name: string;
  category: "dot" | "control" | "debuff" | "buff";
  description: string;
  formula: string;
  icon: string;
}

export interface WeatherModifier {
  label: string;
  value: string;
}

export interface WeatherDef {
  id: string;
  name: string;
  description: string;
  modifiers: WeatherModifier[];
  icon: string;
}

const typeBadgeModules = import.meta.glob("../assets/codex/badges/types/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;
const statusBadgeModules = import.meta.glob("../assets/codex/badges/statuses/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;
const weatherBadgeModules = import.meta.glob("../assets/codex/badges/weather/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function getBadge(modules: Record<string, string>, id: string): string {
  const entry = Object.entries(modules).find(([path]) => path.endsWith(`/${id}.png`));
  return entry?.[1] ?? "";
}

export const DAMAGE_TYPES: DamageTypeDef[] = (rawTypes as Omit<DamageTypeDef, "icon">[]).map((t) => ({
  ...t,
  icon: getBadge(typeBadgeModules, t.id),
})) as unknown as DamageTypeDef[];

export const TYPE_BY_ID: Record<string, DamageTypeDef> = Object.fromEntries(DAMAGE_TYPES.map((t) => [t.id, t]));

/** Everything a type is weak against — the inverse of every other type's strongVs list. */
export const WEAK_VS_BY_ID: Record<string, DamageTypeId[]> = Object.fromEntries(
  DAMAGE_TYPES.map((t) => [
    t.id,
    DAMAGE_TYPES.filter((other) => other.strongVs.includes(t.id)).map((other) => other.id),
  ])
);

export const STATUSES: StatusDef[] = (rawStatuses as Omit<StatusDef, "icon">[]).map((s) => ({
  ...s,
  icon: getBadge(statusBadgeModules, s.id),
})) as StatusDef[];

export const STATUS_BY_ID: Record<string, StatusDef> = Object.fromEntries(STATUSES.map((s) => [s.id, s]));

export const WEATHER: WeatherDef[] = (rawWeather as Omit<WeatherDef, "icon">[]).map((w) => ({
  ...w,
  icon: getBadge(weatherBadgeModules, w.id),
})) as WeatherDef[];

/** Weather cycles deterministically off wall-clock time so every client sees the same active weather
 * without a server — no state to sync, just Date.now() modulo the cycle length. */
export const WEATHER_CYCLE_MS = 10 * 60 * 1000;

export function getActiveWeatherIndex(now: number = Date.now()): number {
  return Math.floor(now / WEATHER_CYCLE_MS) % WEATHER.length;
}

export function getMsUntilNextWeather(now: number = Date.now()): number {
  return WEATHER_CYCLE_MS - (now % WEATHER_CYCLE_MS);
}
