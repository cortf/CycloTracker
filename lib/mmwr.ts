/**
 * mmwr.ts — MMWR (year, week) helpers. Pure, no DB.
 *
 * The "past 3 months" window is defined data-drivenly as the most recent
 * WINDOW_WEEKS distinct (year, week) pairs actually present in the data. This
 * avoids brittle MMWR-calendar math (52 vs 53-week years) and stays correct
 * across year boundaries.
 */

export const WINDOW_WEEKS = 13; // ~3 months of weekly MMWR data

export interface YearWeek {
  year: number;
  week: number;
}

/** Sortable integer key, e.g. 2026 wk 8 -> 202608. */
export function yearWeekKey(y: number, w: number): number {
  return y * 100 + w;
}

export function formatYearWeek(yw: YearWeek): string {
  return `${yw.year}-W${String(yw.week).padStart(2, "0")}`;
}

/**
 * From all present (year, week) pairs, return the most recent `n` (newest first)
 * and the single latest pair.
 */
export function recentWindow(
  pairs: YearWeek[],
  n: number = WINDOW_WEEKS,
): { window: YearWeek[]; latest: YearWeek | null } {
  const uniq = new Map<number, YearWeek>();
  for (const p of pairs) uniq.set(yearWeekKey(p.year, p.week), p);
  const sorted = [...uniq.values()].sort(
    (a, b) => yearWeekKey(b.year, b.week) - yearWeekKey(a.year, a.week),
  );
  return { window: sorted.slice(0, n), latest: sorted[0] ?? null };
}

/** Set of "year*100+week" keys for fast membership tests. */
export function windowKeySet(window: YearWeek[]): Set<number> {
  return new Set(window.map((w) => yearWeekKey(w.year, w.week)));
}
