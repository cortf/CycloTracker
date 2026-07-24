/**
 * coverage.ts — classify a state's data as has-data / zero / no-data. Pure, no DB.
 *
 * The explicit distinction the brief requires:
 *   has-data : at least one usable week with count > 0
 *   zero     : has usable weeks, but they sum to 0 (a real "no cases reported")
 *   no-data  : no usable weeks at all (all missing / not-notifiable) — NOT zero
 */
import type { Status } from "./reconcile";

export type Classification = "has-data" | "zero" | "no-data";

export interface ReconciledPoint {
  caseCount: number | null;
  status: Status;
}

export interface WindowSummary {
  total: number;
  weeksWithData: number;
  weeksInWindow: number;
  classification: Classification;
}

/**
 * Summarize reconciled weekly points over the window. A "usable" week is one with
 * a real number (status zero or reported). Missing weeks are counted as gaps —
 * never as zero.
 */
export function summarizeWindow(
  points: ReconciledPoint[],
  weeksInWindow: number,
): WindowSummary {
  const usable = points.filter((p) => p.caseCount !== null);
  const total = usable.reduce((a, p) => a + (p.caseCount ?? 0), 0);
  const classification: Classification =
    usable.length === 0 ? "no-data" : total === 0 ? "zero" : "has-data";
  return { total, weeksWithData: usable.length, weeksInWindow, classification };
}
