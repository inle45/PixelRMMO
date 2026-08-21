import { useCallback, useEffect, useState } from "react";

export type TimeOfDayId = "morning" | "noon" | "sunset" | "night";

export interface TimeOfDayDef {
  id: TimeOfDayId;
  label: string;
  /** Inclusive start hour, exclusive end hour. `night` wraps midnight, hence startHour > endHour. */
  startHour: number;
  endHour: number;
  /** Human-readable range for the debug selector. */
  range: string;
}

export const TIME_PERIODS: TimeOfDayDef[] = [
  { id: "morning", label: "Matin", startHour: 6, endHour: 11, range: "06h — 11h" },
  { id: "noon", label: "Midi", startHour: 11, endHour: 17, range: "11h — 17h" },
  { id: "sunset", label: "Crépuscule", startHour: 17, endHour: 21, range: "17h — 21h" },
  { id: "night", label: "Nuit", startHour: 21, endHour: 6, range: "21h — 06h" },
];

export const PERIOD_BY_ID: Record<TimeOfDayId, TimeOfDayDef> = Object.fromEntries(
  TIME_PERIODS.map((p) => [p.id, p])
) as Record<TimeOfDayId, TimeOfDayDef>;

/** Maps a wall-clock hour onto its period. `night` is the fallthrough since it's the one range
 * that wraps midnight (21h-06h) and so can't be expressed as a simple start <= h < end test. */
export function resolveTimeOfDay(date: Date = new Date()): TimeOfDayId {
  const h = date.getHours();
  if (h >= 6 && h < 11) return "morning";
  if (h >= 11 && h < 17) return "noon";
  if (h >= 17 && h < 21) return "sunset";
  return "night";
}

/** The debug selector is a dev-mode tool, but the deployed build is where this actually gets
 * eyeballed — so `?debug` / `#debug` in the URL opens it in production too, rather than making a
 * local dev server the only way to preview the other three periods. */
export function isDebugEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  return window.location.search.includes("debug") || window.location.hash.includes("debug");
}

const KEY_TO_PERIOD: Record<string, TimeOfDayId> = {
  "1": "morning",
  "2": "noon",
  "3": "sunset",
  "4": "night",
};

export interface UseTimeOfDayResult {
  /** What the stage should actually render — the manual override if set, else the live clock. */
  period: TimeOfDayId;
  /** What the real wall clock says, regardless of any override. */
  clockPeriod: TimeOfDayId;
  override: TimeOfDayId | null;
  setOverride: (period: TimeOfDayId | null) => void;
  debugEnabled: boolean;
}

/**
 * Reads the real local clock into one of the 4 camp periods, re-checking every 30s so the scene
 * rolls over on its own without a reload. A manual override (debug selector, or keys 1-4) previews
 * any period without touching the system clock; key 0 or Escape releases it back to the clock.
 */
export function useTimeOfDay(): UseTimeOfDayResult {
  const [clockPeriod, setClockPeriod] = useState<TimeOfDayId>(() => resolveTimeOfDay());
  const [override, setOverride] = useState<TimeOfDayId | null>(null);
  const [debugEnabled] = useState(() => isDebugEnabled());

  useEffect(() => {
    const id = setInterval(() => setClockPeriod(resolveTimeOfDay()), 30_000);
    return () => clearInterval(id);
  }, []);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      // Never hijack a keystroke the player meant for a text field.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const mapped = KEY_TO_PERIOD[e.key];
      if (mapped) setOverride(mapped);
      else if (e.key === "0" || e.key === "Escape") setOverride(null);
    },
    []
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return {
    period: override ?? clockPeriod,
    clockPeriod,
    override,
    setOverride,
    debugEnabled,
  };
}
