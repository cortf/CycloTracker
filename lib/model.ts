/**
 * model.ts — build the reconciled case model once, reused by the coverage report
 * and every API endpoint. Groups candidates by (state, year, week), applies
 * precedence reconciliation, and derives the 3-month window.
 */
import { recentWindow, WINDOW_WEEKS, yearWeekKey, type YearWeek } from "./mmwr";
import { getCaseCandidates, type CaseCandidateRow } from "./queries";
import { reconcilePoint, type Candidate, type Reconciled } from "./reconcile";

export interface ReconPoint extends Reconciled {
  year: number;
  week: number;
}
/** fips -> (yearWeekKey -> reconciled point) */
export type Series = Map<string, Map<number, ReconPoint>>;

export function reconcileSeries(
  candidates: CaseCandidateRow[],
  countType: "weekly" | "cumulative_ytd",
): Series {
  const groups = new Map<string, { fips: string; year: number; week: number; cands: Candidate[] }>();
  for (const c of candidates) {
    if (c.countType !== countType) continue;
    const key = `${c.stateFips}|${c.year}|${c.week}`;
    let g = groups.get(key);
    if (!g) {
      g = { fips: c.stateFips, year: c.year, week: c.week, cands: [] };
      groups.set(key, g);
    }
    g.cands.push({ sourceKey: c.sourceKey, precedence: c.precedence, caseCount: c.caseCount, status: c.status });
  }
  const series: Series = new Map();
  for (const g of groups.values()) {
    const rec = reconcilePoint(g.cands);
    if (!series.has(g.fips)) series.set(g.fips, new Map());
    series.get(g.fips)!.set(yearWeekKey(g.year, g.week), { ...rec, year: g.year, week: g.week });
  }
  return series;
}

export interface Model {
  weekly: Series;
  cumulative: Series;
  window: YearWeek[];
  latest: YearWeek | null;
  years: number[];
}

export function buildModel(): Model {
  const candidates = getCaseCandidates();
  const weekly = reconcileSeries(candidates, "weekly");
  const cumulative = reconcileSeries(candidates, "cumulative_ytd");
  const pairs = candidates.filter((c) => c.countType === "weekly").map((c) => ({ year: c.year, week: c.week }));
  const { window, latest } = recentWindow(pairs, WINDOW_WEEKS);
  const years = [...new Set(candidates.map((c) => c.year))].sort((a, b) => a - b);
  return { weekly, cumulative, window, latest, years };
}

/** Reconciled weekly points for a state that fall inside the window. */
export function windowPointsForState(series: Series, fips: string, winKeys: Set<number>): ReconPoint[] {
  const s = series.get(fips);
  if (!s) return [];
  return [...s.values()].filter((p) => winKeys.has(yearWeekKey(p.year, p.week)));
}

/** Year total = max reconciled cumulative-YTD value for that year (null if no data). */
export function yearTotal(cumulative: Series, fips: string, year: number): { total: number | null; hasData: boolean } {
  const s = cumulative.get(fips);
  if (!s) return { total: null, hasData: false };
  const vals = [...s.values()].filter((p) => p.year === year && p.caseCount !== null).map((p) => p.caseCount!);
  if (!vals.length) return { total: null, hasData: false };
  return { total: Math.max(...vals), hasData: true };
}
