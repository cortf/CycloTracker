/**
 * nors.normalize.ts — PURE normalization for CDC NORS outbreak records.
 * No DB imports. `dedupeKey` gives idempotency (NORS has no stable outbreak id).
 */
import { createHash } from "node:crypto";
import { resolveReportingArea } from "../resolve-state";
import type { NormalizeResult, OutbreakInput } from "../types";

interface NorsRow {
  year?: string;
  month?: string;
  state?: string;
  primary_mode?: string;
  etiology?: string;
  etiology_status?: string;
  setting?: string;
  illnesses?: string;
  hospitalizations?: string;
  deaths?: string;
  food_vehicle?: string;
  food_contaminated_ingredient?: string;
  ifsac_category?: string;
}

const intOrNull = (v: string | undefined): number | null => {
  if (v === undefined || `${v}`.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};

export function norsDedupeKey(r: NorsRow): string {
  const parts = [r.year, r.month, r.state, r.etiology, r.setting, r.illnesses, r.food_vehicle];
  return createHash("sha256").update(parts.map((p) => p ?? "").join("|")).digest("hex").slice(0, 32);
}

export function normalizeNors(body: string, _requestUrl?: string): NormalizeResult<OutbreakInput> {
  const rows = JSON.parse(body) as NorsRow[];
  const warnings: string[] = [];
  const records: OutbreakInput[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  for (const r of rows) {
    if (!/cyclospora/i.test(r.etiology ?? "")) {
      skipped++; // defensive: query already filters, but never trust blindly
      continue;
    }
    const year = Number(r.year);
    if (!Number.isFinite(year)) {
      skipped++;
      warnings.push(`NORS row with bad year: ${r.year}`);
      continue;
    }
    const res = resolveReportingArea(r.state ?? "");
    const stateFips = res.kind === "state" ? res.fips : null;
    if (res.kind === "unknown" && (r.state ?? "").trim() !== "")
      warnings.push(`NORS state not mapped to FIPS (kept, fips=null): ${r.state}`);

    const dedupeKey = norsDedupeKey(r);
    if (seen.has(dedupeKey)) {
      skipped++; // duplicate within this payload
      continue;
    }
    seen.add(dedupeKey);

    records.push({
      dedupeKey,
      stateFips,
      stateName: r.state ?? "Unknown",
      year,
      month: intOrNull(r.month),
      etiology: r.etiology ?? null,
      etiologyStatus: r.etiology_status ?? null,
      primaryMode: r.primary_mode ?? null,
      setting: r.setting ?? null,
      illnesses: intOrNull(r.illnesses),
      hospitalizations: intOrNull(r.hospitalizations),
      deaths: intOrNull(r.deaths),
      foodVehicle: r.food_vehicle ?? null,
      foodContaminatedIngredient: r.food_contaminated_ingredient ?? null,
      ifsacCategory: r.ifsac_category ?? null,
    });
  }
  return { records, warnings, skipped };
}
