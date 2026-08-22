import { useCallback, useEffect, useState } from "react";
import { isDebugEnabled } from "./useTimeOfDay";

/**
 * The Town's own day-cycle buckets — deliberately a separate hook from useTimeOfDay rather than a
 * shared parameterized one: the spec calls for different hour boundaries (Aube 06-09, Jour 09-18,
 * Crépuscule 18-21, Nuit 21-06) and different labels than the Camp's morning/noon/sunset/night, and
 * merging two label sets with different boundaries behind one generic hook would add indirection for
 * exactly two call sites — the same "small duplication over a cross-cutting abstraction" call this
 * codebase already makes elsewhere (DungeonScreen's duplicated hero read, CampStage's duplicated
 * weather banner).
 */
export type TownTimeId = "dawn" | "day" | "dusk" | "night";

export interface TownTimeDef {
  id: TownTimeId;
  label: string;
  startHour: number;
  endHour: number;
  range: string;
}

export const TOWN_TIME_PERIODS: TownTimeDef[] = [
  { id: "dawn", label: "Aube", startHour: 6, endHour: 9, range: "06h — 09h" },
  { id: "day", label: "Jour", startHour: 9, endHour: 18, range: "09h — 18h" },
  { id: "dusk", label: "Crépuscule", startHour: 18, endHour: 21, range: "18h — 21h" },
  { id: "night", label: "Nuit", startHour: 21, endHour: 6, range: "21h — 06h" },
];

export const TOWN_PERIOD_BY_ID: Record<TownTimeId, TownTimeDef> = Object.fromEntries(
  TOWN_TIME_PERIODS.map((p) => [p.id, p])
) as Record<TownTimeId, TownTimeDef>;

export function resolveTownTime(date: Date = new Date()): TownTimeId {
  const h = date.getHours();
  if (h >= 6 && h < 9) return "dawn";
  if (h >= 9 && h < 18) return "day";
  if (h >= 18 && h < 21) return "dusk";
  return "night";
}

const KEY_TO_PERIOD: Record<string, TownTimeId> = { "1": "dawn", "2": "day", "3": "dusk", "4": "night" };

export interface UseTownTimeOfDayResult {
  period: TownTimeId;
  clockPeriod: TownTimeId;
  override: TownTimeId | null;
  setOverride: (period: TownTimeId | null) => void;
  debugEnabled: boolean;
}

export function useTownTimeOfDay(): UseTownTimeOfDayResult {
  const [clockPeriod, setClockPeriod] = useState<TownTimeId>(() => resolveTownTime());
  const [override, setOverride] = useState<TownTimeId | null>(null);
  const [debugEnabled] = useState(() => isDebugEnabled());

  useEffect(() => {
    const id = setInterval(() => setClockPeriod(resolveTownTime()), 30_000);
    return () => clearInterval(id);
  }, []);

  const handleKey = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const mapped = KEY_TO_PERIOD[e.key];
    if (mapped) setOverride(mapped);
    else if (e.key === "0" || e.key === "Escape") setOverride(null);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return { period: override ?? clockPeriod, clockPeriod, override, setOverride, debugEnabled };
}
