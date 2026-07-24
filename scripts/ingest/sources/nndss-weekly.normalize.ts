/**
 * nndss-weekly.normalize.ts — PURE normalization for the CDC NNDSS weekly feed.
 * No DB imports. Every branch here is unit-tested (see __tests__).
 *
 * Produces two count_type rows per state-week: `weekly` (m1 = current week) and
 * `cumulative_ytd` (m3 = cumulative YTD). New York + New York City rows are
 * summed into FIPS 36. Zero and missing are kept distinct — never invented.
 */
import { resolveReportingArea } from "../resolve-state";
import type { CaseRecordInput, CountType, NormalizeResult } from "../types";

interface Measure {
  caseCount: number | null;
  status: CaseRecordInput["status"];
  flag: string | null;
}

/**
 * Turn one NNDSS value+flag into a count/status.
 * Numeric wins; otherwise the flag decides. NNDSS flag conventions:
 *   "-" no reported cases (ZERO) · "U" unavailable · "N"/"NN" not (nationally)
 *   notifiable · "NP"/"NC" not published/calculated. Unknown/blank -> missing.
 */
export function nndssMeasure(
  rawValue: string | number | null | undefined,
  flag: string | null | undefined,
): Measure {
  const f = (flag ?? "").toString().trim();
  const hasValue = rawValue !== null && rawValue !== undefined && `${rawValue}`.trim() !== "";
  const num = hasValue ? Number(rawValue) : NaN;
  if (Number.isFinite(num)) {
    const c = Math.round(num);
    return { caseCount: c, status: c > 0 ? "reported" : "zero", flag: f || null };
  }
  if (f === "-") return { caseCount: 0, status: "zero", flag: "-" };
  if (f === "N" || f === "NN") return { caseCount: null, status: "not_notifiable", flag: f };
  return { caseCount: null, status: "missing", flag: f || null }; // U/NP/NC/blank/unknown
}

/**
 * Merge components that map to the same (fips, year, week, countType) — i.e.
 * New York + New York City. Sums reported numbers; only "missing" when *nothing*
 * is reported (we never impute a missing component as zero).
 */
export function mergeCaseComponents(components: Measure[]): Measure {
  const numeric = components.filter((c) => c.caseCount !== null) as Array<
    Measure & { caseCount: number }
  >;
  const merged = components.length > 1;
  if (numeric.length > 0) {
    const sum = numeric.reduce((a, c) => a + c.caseCount, 0);
    return { caseCount: sum, status: sum > 0 ? "reported" : "zero", flag: merged ? null : components[0]!.flag };
  }
  const allNotNotifiable = components.every((c) => c.status === "not_notifiable");
  return {
    caseCount: null,
    status: allNotNotifiable ? "not_notifiable" : "missing",
    flag: merged ? null : components[0]!.flag,
  };
}

interface NndssRow {
  states?: string;
  year?: string;
  week?: string;
  label?: string;
  m1?: string;
  m1_flag?: string;
  m3?: string;
  m3_flag?: string;
}

export function normalizeNndss(body: string, _requestUrl?: string): NormalizeResult<CaseRecordInput> {
  const rows = JSON.parse(body) as NndssRow[];
  const warnings: string[] = [];
  const unknown = new Set<string>();
  let skipped = 0;

  // Group components by natural key so NY + NYC collapse into one FIPS-36 row.
  interface Bucket {
    stateFips: string;
    stateName: string;
    year: number;
    week: number;
    countType: CountType;
    components: Measure[];
  }
  const buckets = new Map<string, Bucket>();

  for (const row of rows) {
    const area = row.states ?? "";
    const res = resolveReportingArea(area);
    if (res.kind === "excluded") {
      skipped++;
      continue;
    }
    if (res.kind === "unknown") {
      skipped++;
      unknown.add(area);
      continue;
    }
    const year = Number(row.year);
    const week = Number(row.week);
    if (!Number.isFinite(year) || !Number.isFinite(week)) {
      skipped++;
      warnings.push(`Bad year/week for ${area}: ${row.year}/${row.week}`);
      continue;
    }
    const measures: Array<[CountType, Measure]> = [
      ["weekly", nndssMeasure(row.m1, row.m1_flag)],
      ["cumulative_ytd", nndssMeasure(row.m3, row.m3_flag)],
    ];
    for (const [countType, measure] of measures) {
      const key = `${res.fips}|${year}|${week}|${countType}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { stateFips: res.fips, stateName: res.canonicalName, year, week, countType, components: [] };
        buckets.set(key, bucket);
      }
      bucket.components.push(measure);
    }
  }

  if (unknown.size > 0)
    warnings.push(`Unrecognized reporting areas (skipped, NOT counted as zero): ${[...unknown].join(", ")}`);

  const records: CaseRecordInput[] = [];
  for (const b of buckets.values()) {
    const m = mergeCaseComponents(b.components);
    records.push({
      stateFips: b.stateFips,
      stateName: b.stateName,
      year: b.year,
      week: b.week,
      countType: b.countType,
      caseCount: m.caseCount,
      flag: m.flag,
      status: m.status,
      confidence: "medium", // NNDSS weekly is provisional
    });
  }
  return { records, warnings, skipped };
}
