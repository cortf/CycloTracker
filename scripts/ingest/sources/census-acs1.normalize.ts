/**
 * census-acs1.normalize.ts — PURE normalization for the Census ACS 1-year
 * population response (JSON array-of-arrays). No DB imports.
 */
import { SEED_STATES } from "../../../db/seed/states";
import type { NormalizeResult, PopulationInput } from "../types";

const VALID_FIPS = new Set(SEED_STATES.map((s) => s.fips));

/** ACS URLs look like .../data/2024/acs/acs1?...  — the vintage year lives there. */
export function yearFromUrl(url: string): number | null {
  const m = url.match(/\/data\/(\d{4})\/acs/);
  return m ? Number(m[1]) : null;
}

export function normalizeAcs1(body: string, requestUrl: string): NormalizeResult<PopulationInput> {
  const table = JSON.parse(body) as string[][];
  const warnings: string[] = [];
  if (!Array.isArray(table) || table.length < 2) {
    return { records: [], warnings: ["Empty or malformed ACS response"], skipped: 0 };
  }
  const header = table[0]!;
  const popIdx = header.indexOf("B01001_001E");
  const stateIdx = header.indexOf("state");
  const year = yearFromUrl(requestUrl);
  if (popIdx < 0 || stateIdx < 0 || year === null) {
    return { records: [], warnings: [`Missing columns/year in ACS response header: ${header.join(",")}`], skipped: 0 };
  }

  const records: PopulationInput[] = [];
  let skipped = 0;
  for (const row of table.slice(1)) {
    const fips = row[stateIdx]!;
    const pop = Number(row[popIdx]);
    if (!VALID_FIPS.has(fips)) {
      skipped++; // e.g. a FIPS we don't seed — surfaced, not silently kept
      warnings.push(`ACS FIPS not in seed, skipped: ${fips}`);
      continue;
    }
    if (!Number.isFinite(pop)) {
      skipped++;
      warnings.push(`Non-numeric population for FIPS ${fips}: ${row[popIdx]}`);
      continue;
    }
    records.push({ stateFips: fips, year, population: Math.round(pop) });
  }
  return { records, warnings, skipped };
}
