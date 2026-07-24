/**
 * queries.ts — DB reads for the reconciliation/coverage layer (and later the API).
 * Thin Drizzle wrappers; the reconciliation logic itself lives in the pure modules.
 */
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { caseRecords, sources, statePopulation, states } from "../db/schema";
import type { Status } from "./reconcile";

export interface CaseCandidateRow {
  stateFips: string;
  year: number;
  week: number;
  countType: "weekly" | "cumulative_ytd" | "annual";
  caseCount: number | null;
  status: Status;
  sourceKey: string;
  precedence: number;
}

/** Every normalized case number joined to its source (for precedence). */
export function getCaseCandidates(): CaseCandidateRow[] {
  return db
    .select({
      stateFips: caseRecords.stateFips,
      year: caseRecords.year,
      week: caseRecords.week,
      countType: caseRecords.countType,
      caseCount: caseRecords.caseCount,
      status: caseRecords.status,
      sourceKey: sources.key,
      precedence: sources.precedence,
    })
    .from(caseRecords)
    .innerJoin(sources, eq(caseRecords.sourceId, sources.id))
    .all() as CaseCandidateRow[];
}

export function getStates() {
  return db.select().from(states).all();
}

/** stateFips -> { year -> population }, for rate denominators. */
export function getPopulationByStateYear(): Map<string, Map<number, number>> {
  const rows = db
    .select({
      stateFips: statePopulation.stateFips,
      year: statePopulation.year,
      population: statePopulation.population,
    })
    .from(statePopulation)
    .all();
  const out = new Map<string, Map<number, number>>();
  for (const r of rows) {
    if (!out.has(r.stateFips)) out.set(r.stateFips, new Map());
    out.get(r.stateFips)!.set(r.year, r.population);
  }
  return out;
}
