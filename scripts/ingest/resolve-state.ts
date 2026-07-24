/**
 * resolve-state.ts — map a source's reporting-area string to a state FIPS.
 *
 * PURE + TESTED. This is the single riskiest normalization step: a wrong mapping
 * silently corrupts the map. It must never guess — an unrecognized area returns
 * `unknown` (surfaced loudly), never a silent drop or a wrong FIPS.
 *
 * Handles the real NNDSS mess (verified against live data, 2026-07):
 *  - casing variants ("Alabama" / "ALABAMA")  -> uppercase before lookup
 *  - New York City reported separately from New York -> both FIPS 36 (caller sums)
 *  - "Commonwealth of Northern Mariana Islands" -> 69
 *  - census divisions (New England, Pacific, ...) -> excluded (not a state)
 *  - national/other aggregates (U.S. Residents, Total, ...) -> excluded
 */
import { SEED_STATES } from "../../db/seed/states";

export type Resolution =
  | { kind: "state"; fips: string; canonicalName: string }
  | { kind: "excluded"; reason: "region" | "aggregate" }
  | { kind: "unknown"; raw: string };

/** UPPER(name) -> fips, for all 56 seeded jurisdictions. */
const CANONICAL: ReadonlyMap<string, { fips: string; name: string }> = new Map(
  SEED_STATES.map((s) => [s.name.toUpperCase(), { fips: s.fips, name: s.name }]),
);

/** Extra reporting-area spellings that map to a seeded FIPS. */
const ALIASES: Readonly<Record<string, string>> = {
  "NEW YORK CITY": "36", // summed into New York state
  "COMMONWEALTH OF NORTHERN MARIANA ISLANDS": "69",
};

/** Census divisions — real data, but not a single state. Excluded, not unknown. */
const REGIONS = new Set([
  "NEW ENGLAND",
  "MIDDLE ATLANTIC",
  "EAST NORTH CENTRAL",
  "WEST NORTH CENTRAL",
  "SOUTH ATLANTIC",
  "EAST SOUTH CENTRAL",
  "WEST SOUTH CENTRAL",
  "MOUNTAIN",
  "PACIFIC",
]);

/** National / residency roll-ups. Excluded. */
const AGGREGATES = new Set([
  "TOTAL",
  "U.S. RESIDENTS",
  "US RESIDENTS",
  "U.S. TERRITORIES",
  "US TERRITORIES",
  "NON-U.S. RESIDENTS",
  "NON-US RESIDENTS",
]);

const fipsToName = new Map(SEED_STATES.map((s) => [s.fips, s.name]));

export function resolveReportingArea(raw: string): Resolution {
  const key = raw.trim().toUpperCase();
  const canon = CANONICAL.get(key);
  if (canon) return { kind: "state", fips: canon.fips, canonicalName: canon.name };
  const aliasFips = ALIASES[key];
  if (aliasFips)
    return { kind: "state", fips: aliasFips, canonicalName: fipsToName.get(aliasFips)! };
  if (REGIONS.has(key)) return { kind: "excluded", reason: "region" };
  if (AGGREGATES.has(key)) return { kind: "excluded", reason: "aggregate" };
  return { kind: "unknown", raw };
}
