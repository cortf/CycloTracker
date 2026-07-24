/** Adapter: Census ACS 1-year population -> state_population (one URL per year). */
import { cachedFetch } from "../http";
import { upsertPopulation } from "../persist";
import type { Adapter, PopulationInput, RawFetch } from "../types";
import { normalizeAcs1 } from "./census-acs1.normalize";

// Ingest a few recent vintages so Step-6 rates can match the case year (or fall
// back to nearest). ACS 1-year has no 2020 vintage (pandemic data-collection gap).
const YEARS = [2024, 2023, 2022];

function buildUrl(year: number): string {
  const key = process.env.CENSUS_API_KEY;
  const base = `https://api.census.gov/data/${year}/acs/acs1?get=NAME,B01001_001E&for=state:*`;
  return key ? `${base}&key=${key}` : base;
}

export const censusAcs1: Adapter<PopulationInput> = {
  key: "census-acs1",
  targetTable: "state_population",
  async fetch(): Promise<RawFetch[]> {
    const out: RawFetch[] = [];
    for (const year of YEARS) {
      const res = await cachedFetch(buildUrl(year));
      let rowCount: number | null = null;
      try {
        rowCount = Math.max(0, (JSON.parse(res.body) as unknown[]).length - 1); // minus header
      } catch {
        /* leave null */
      }
      out.push({ ...res, rowCount });
    }
    return out;
  },
  normalize: normalizeAcs1,
  persist: upsertPopulation,
};
