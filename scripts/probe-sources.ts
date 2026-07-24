/**
 * scripts/probe-sources.ts — Step 1: Source Reconnaissance
 *
 * Hits every candidate data source for CycloTracker and reports, for each:
 *   HTTP status · response format · fields we care about · date coverage ·
 *   row counts · a sample record.
 *
 * Raw responses are cached to disk under .cache/probe/ so re-runs don't hammer
 * public APIs (see CONSTRAINTS in the project brief). Delete .cache/ to refetch.
 *
 * Results are printed as a report and written to docs/source-probe-results.json,
 * which backs the human-written docs/DATA_SOURCES.md.
 *
 *   npm run probe                 # probe everything
 *   CENSUS_API_KEY=xxx npm run probe   # also exercise the Census PEP endpoint
 *
 * This script only READS public endpoints. It never writes to the data store.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Auto-load .env (git-ignored) so CENSUS_API_KEY etc. are available locally.
const ENV_FILE = join(ROOT, ".env");
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
const CACHE_DIR = join(ROOT, ".cache", "probe");
const OUT_JSON = join(ROOT, "docs", "source-probe-results.json");

const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h — recon data doesn't move fast
const USER_AGENT =
  "CycloTracker-probe/0.1 (source reconnaissance; contact: maintainer)";

/** How confident we are that this source is usable for automated ingestion. */
type Verdict = "structured" | "scrape-required" | "needs-auth" | "unreachable";

interface ProbeResult {
  id: string;
  name: string;
  category: "primary" | "secondary" | "denominator" | "reference";
  url: string;
  format: string;
  verdict: Verdict;
  httpStatus: number | null;
  updateCadence: string;
  dateCoverage: string;
  rowCount: string;
  fields: string[];
  sampleRecord: unknown;
  notes: string[];
}

// ----------------------------------------------------------------------------
// Cached fetch
// ----------------------------------------------------------------------------

interface FetchResult {
  status: number;
  ok: boolean;
  contentType: string;
  body: string;
  fromCache: boolean;
}

async function cachedFetch(
  url: string,
  init: RequestInit = {},
  { ttlMs = CACHE_TTL_MS, retries = 2 } = {},
): Promise<FetchResult> {
  await mkdir(CACHE_DIR, { recursive: true });
  const key = createHash("sha1")
    .update(url + JSON.stringify(init.headers ?? {}))
    .digest("hex")
    .slice(0, 16);
  const cachePath = join(CACHE_DIR, `${key}.json`);

  if (existsSync(cachePath)) {
    try {
      const cached = JSON.parse(await readFile(cachePath, "utf8"));
      if (Date.now() - cached.fetchedAt < ttlMs) {
        return { ...cached.result, fromCache: true };
      }
    } catch {
      /* fall through and refetch */
    }
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "user-agent": USER_AGENT, ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(30_000),
      });
      const body = await res.text();
      const result: Omit<FetchResult, "fromCache"> = {
        status: res.status,
        ok: res.ok,
        contentType: res.headers.get("content-type") ?? "",
        body,
      };
      await writeFile(
        cachePath,
        JSON.stringify({ url, fetchedAt: Date.now(), result }, null, 2),
      );
      return { ...result, fromCache: false };
    } catch (err) {
      lastErr = err;
      // Back off on transient errors / rate limits before retrying.
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// Socrata (data.cdc.gov, health.data.ny.gov, ...) helpers
// ----------------------------------------------------------------------------

function socrataResourceUrl(
  portal: string,
  id: string,
  params: Record<string, string>,
): string {
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `https://${portal}/resource/${id}.json?${qs}`;
}

async function socrataMeta(portal: string, id: string) {
  const res = await cachedFetch(`https://${portal}/api/views/${id}.json`);
  const meta = parseJson(res.body) as any;
  if (!meta) return null;
  return {
    name: meta.name as string,
    attribution: meta.attribution as string | undefined,
    license: (meta.license?.name as string | undefined) ?? "see portal terms",
    rowsUpdatedAt: meta.rowsUpdatedAt
      ? new Date(meta.rowsUpdatedAt * 1000).toISOString()
      : null,
    columns: (meta.columns ?? [])
      .filter((c: any) => !String(c.fieldName).startsWith(":@"))
      .map((c: any) => ({
        field: c.fieldName as string,
        name: c.name as string,
        desc: (c.description as string | undefined) ?? "",
      })),
  };
}

/**
 * Probe a Socrata dataset filtered to Cyclospora rows.
 * Reports total matching rows, the year range, distinct reporting areas,
 * and a sample record — everything DATA_SOURCES.md needs.
 */
async function probeSocrata(opts: {
  id: string;
  category: ProbeResult["category"];
  portal: string;
  where: string;
  yearField: string;
  geoField: string;
  cadence: string;
  extraNotes?: string[];
}): Promise<ProbeResult> {
  const { id, portal, where, yearField, geoField } = opts;
  const base = `https://${portal}/resource/${id}.json`;
  const meta = await socrataMeta(portal, id);

  const notes = [...(opts.extraNotes ?? [])];
  const result: ProbeResult = {
    id,
    name: meta?.name ?? id,
    category: opts.category,
    url: base,
    format: "Socrata SODA 2.1 JSON (also CSV/GeoJSON)",
    verdict: "structured",
    httpStatus: null,
    updateCadence: meta?.rowsUpdatedAt
      ? `${opts.cadence}; rows updated ${meta.rowsUpdatedAt.slice(0, 10)}`
      : opts.cadence,
    dateCoverage: "unknown",
    rowCount: "unknown",
    fields: (meta?.columns ?? []).map((c: { field: string }) => c.field),
    sampleRecord: null,
    notes,
  };
  if (meta?.attribution) notes.push(`Attribution: ${meta.attribution}`);
  if (meta?.license) notes.push(`License: ${meta.license}`);

  // Aggregate: count + min/max year over Cyclospora rows.
  const aggUrl = socrataResourceUrl(portal, id, {
    $select: `count(*) as n, min(${yearField}) as min_y, max(${yearField}) as max_y`,
    $where: where,
  });
  const agg = await cachedFetch(aggUrl);
  result.httpStatus = agg.status;
  const aggRow = (parseJson(agg.body) as any[])?.[0];
  if (agg.status === 200 && aggRow) {
    result.rowCount = `${aggRow.n} Cyclospora rows`;
    result.dateCoverage = `${aggRow.min_y}–${aggRow.max_y}`;
  } else {
    // A Socrata resource that won't answer a query isn't "structured" for us.
    result.verdict = agg.status === 401 || agg.status === 403 ? "needs-auth" : "unreachable";
    notes.push(`Aggregate query failed (HTTP ${agg.status}); dataset not usable as-is.`);
    return result;
  }

  // Distinct reporting areas (states/regions/national mixed together).
  const geoUrl = socrataResourceUrl(portal, id, {
    $select: `count(distinct ${geoField}) as g`,
    $where: where,
  });
  const geo = await cachedFetch(geoUrl);
  const geoRow = (parseJson(geo.body) as any[])?.[0];
  if (geoRow) notes.push(`Distinct \`${geoField}\` values: ${geoRow.g}`);

  // One recent sample record.
  const sampleUrl = socrataResourceUrl(portal, id, {
    $where: where,
    $order: `${opts.yearField} DESC`,
    $limit: "1",
  });
  const sample = await cachedFetch(sampleUrl);
  result.sampleRecord = (parseJson(sample.body) as any[])?.[0] ?? null;

  return result;
}

// ----------------------------------------------------------------------------
// Census Population Estimates (denominator)
// ----------------------------------------------------------------------------

async function probeCensus(): Promise<ProbeResult> {
  const key = process.env.CENSUS_API_KEY;
  // Denominator for per-100k rates. NOTE: the simple PEP total-population
  // endpoint (/pep/population) only publishes through Vintage 2021 in the API —
  // 2022–2024 return 404. ACS 1-year is current (2024 confirmed) and covers all
  // 50 states + DC + PR, so we use ACS1 `B01001_001E` (total population) as the
  // primary denominator, with PEP Vintage 2021 as a documented fallback.
  const year = "2024";
  const params: Record<string, string> = {
    get: "NAME,B01001_001E",
    for: "state:*",
  };
  if (key) params.key = key;
  const url =
    `https://api.census.gov/data/${year}/acs/acs1?` +
    Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");

  const res = await cachedFetch(url);
  const json = parseJson(res.body) as any[] | null;
  const notes: string[] = [
    "PEP /pep/population caps at Vintage 2021 in the API; using ACS1 (current) instead.",
    "ACS1 covers areas with pop >= 65k: all 50 states + DC + PR (not the small territories).",
    "Population changes slowly — fetch once per year and cache.",
  ];
  let verdict: Verdict = "needs-auth";
  let sample: unknown = null;
  let coverage = "unknown";

  if (Array.isArray(json) && json.length > 1) {
    verdict = "structured";
    coverage = `${json.length - 1} states/DC/PR (ACS 1-year ${year})`;
    sample = { header: json[0], firstRow: json[1] };
  } else if (/Missing Key|valid <em>key/i.test(res.body)) {
    notes.unshift(
      "Requires a free API key (api.census.gov/data/key_signup.html); set CENSUS_API_KEY.",
    );
  } else {
    notes.unshift(`Unexpected response (HTTP ${res.status}): ${res.body.slice(0, 120)}`);
  }

  return {
    id: `census-acs1-${year}`,
    name: "Census ACS 1-year population (denominator; PEP fallback)",
    category: "denominator",
    url: `https://api.census.gov/data/${year}/acs/acs1?get=NAME,B01001_001E&for=state:*`,
    format: "JSON array-of-arrays",
    verdict,
    httpStatus: res.status,
    updateCadence: "Annual (ACS 1-year, ~1yr lag)",
    dateCoverage: coverage,
    rowCount: coverage,
    fields: ["NAME", "B01001_001E (total pop)", "state (FIPS)"],
    sampleRecord: sample,
    notes,
  };
}

// ----------------------------------------------------------------------------
// Generic HTML / page liveness probe (for scrape-only or reference sources)
// ----------------------------------------------------------------------------

async function probeHttp(opts: {
  id: string;
  name: string;
  category: ProbeResult["category"];
  url: string;
  cadence: string;
  coverage: string;
  fields: string[];
  extraNotes?: string[];
}): Promise<ProbeResult> {
  const res = await cachedFetch(opts.url).catch((e) => ({
    status: 0,
    ok: false,
    contentType: "",
    body: String(e),
    fromCache: false,
  }));
  const notes = [...(opts.extraNotes ?? [])];

  const hasTable = /<table[\s>]/i.test(res.body);
  const hasTh = /<th[\s>]/i.test(res.body);
  const mediaDownloads = (res.body.match(/\/media\/\d+\/download/g) ?? []).length;
  const looksJsRendered =
    hasTable === false && /data-drupal|react|__NEXT_DATA__|ng-app/i.test(res.body);

  let verdict: Verdict = "scrape-required";
  if (res.status === 0 || res.status >= 500) verdict = "unreachable";
  else if (res.status === 403 || res.status === 401) {
    verdict = "scrape-required";
    notes.push(`HTTP ${res.status}: bot-protected — inconsistent for automated fetch.`);
  }

  if (mediaDownloads > 0)
    notes.push(`${mediaDownloads} \`/media/<id>/download\` asset links (per-item PDFs).`);
  if (hasTable) notes.push(`Static <table> present${hasTh ? " with <th> headers" : ""}.`);
  else if (looksJsRendered)
    notes.push("No static <table>; data appears client-rendered (needs headless browser).");

  return {
    id: opts.id,
    name: opts.name,
    category: opts.category,
    url: opts.url,
    format: res.contentType || "text/html",
    verdict,
    httpStatus: res.status,
    updateCadence: opts.cadence,
    dateCoverage: opts.coverage,
    rowCount: "n/a (unstructured page)",
    fields: opts.fields,
    sampleRecord: null,
    notes,
  };
}

// ----------------------------------------------------------------------------
// Source registry
// ----------------------------------------------------------------------------

const CYCLO_WHERE = "UPPER(label) like '%CYCLOSPOR%'";
const NORS_WHERE = "UPPER(etiology) like '%CYCLOSPORA%'";

async function runAll(): Promise<ProbeResult[]> {
  const probes: Array<() => Promise<ProbeResult>> = [
    // 1. CDC NNDSS Weekly Data — the backbone: state-level, weekly, current-year.
    () =>
      probeSocrata({
        id: "x9gk-5huc",
        category: "primary",
        portal: "data.cdc.gov",
        where: CYCLO_WHERE,
        yearField: "year",
        geoField: "states",
        cadence: "Weekly (MMWR week), typically Tue/Wed for the prior week",
        extraNotes: [
          "m1=current week, m2=prev 52wk max, m3=cumulative YTD current year, m4=cumulative YTD prior year.",
          "*_flag columns: '-' = 0 reported, 'N'/'NN' = not notifiable, 'U' = unavailable, 'NC' = not calculated.",
          "`states` mixes 50 states + DC + territories + census regions + national totals, and casing varies by era — filter/normalize carefully.",
          "No FIPS column; join state name → FIPS during normalization.",
        ],
      }),
    // 2. CDC NNDSS Annual Summary — largely subsumed by x9gk-5huc cumulative YTD.
    async () => ({
      id: "nndss-annual",
      name: "CDC NNDSS Annual Summary Tables",
      category: "primary" as const,
      url: "https://www.cdc.gov/nndss/data-statistics/index.html",
      format: "MMWR HTML/CSV + historical Socrata 'NNDSS Table' datasets (frozen)",
      verdict: "structured" as const,
      httpStatus: null,
      updateCadence: "Annual (finalized ~2 years after the reporting year)",
      dateCoverage: "Historical baseline",
      rowCount: "n/a",
      fields: ["reporting_area", "disease", "cum_cases", "year"],
      sampleRecord: null,
      notes: [
        "For our 3-month recency window this is redundant with x9gk-5huc's m3 cumulative-YTD column.",
        "Keep only as an optional multi-year baseline; per-year 'NNDSS - Table ...' Socrata datasets are frozen snapshots.",
      ],
    }),
    // 3. FDA CORE Outbreak Investigation Table.
    () =>
      probeHttp({
        id: "fda-core",
        name: "FDA CORE Outbreak Investigation Table",
        category: "primary",
        url: "https://www.fda.gov/food/outbreaks-foodborne-illness/investigations-foodborne-illness-outbreaks",
        cadence: "Updated as investigations progress (roughly weekly)",
        coverage: "Active/recent FDA-led outbreaks; per-outbreak state distribution",
        fields: ["product", "etiology", "states affected", "case count", "status", "dates"],
        extraNotes: [
          "Table is client-rendered; per-outbreak detail (incl. state list) lives on individual advisory pages.",
          "Outbreak-level, not surveillance case counts — a different unit from NNDSS.",
        ],
      }),
    // 4. CDC NORS (National Outbreak Reporting System) — Socrata.
    () =>
      probeSocrata({
        id: "5xkq-dg7x",
        category: "primary",
        portal: "data.cdc.gov",
        where: NORS_WHERE,
        yearField: "year",
        geoField: "state",
        cadence: "Annual bulk refresh (multi-year lag)",
        extraNotes: [
          "Outbreak-level records (illnesses/hospitalizations/deaths + food vehicle), NOT weekly surveillance counts.",
          "Lags ~2 years — useful for historical context & vehicle attribution, not the 3-month window.",
        ],
      }),
    // 5. CDC Cyclosporiasis outbreak investigation pages.
    () =>
      probeHttp({
        id: "cdc-cyclo-outbreaks",
        name: "CDC Cyclosporiasis Outbreak Investigation pages",
        category: "primary",
        url: "https://www.cdc.gov/cyclosporiasis/outbreaks/index.html",
        cadence: "Per-outbreak / annual",
        coverage: "Domestically acquired outbreak case counts, 2018–present",
        fields: ["year", "case count", "linked vehicle", "states (in narrative)"],
        extraNotes: [
          "Akamai bot protection returns intermittent 403s — unreliable for automated fetch.",
          "State breakdowns are in prose, not a machine-readable table.",
        ],
      }),
    // 6. State DOH sources (secondary, gap-fillers). NONE expose a verified
    //    cyclosporiasis SODA feed — all are HTML/PDF/dashboard. We probe
    //    liveness + format only, to document feasibility honestly.
    () =>
      probeHttp({
        id: "tx-dshs",
        name: "Texas DSHS Notifiable Conditions",
        category: "secondary",
        url: "https://www.dshs.texas.gov/notifiable-conditions",
        cadence: "Annual reports (PDF/HTML)",
        coverage: "TX statewide notifiable-condition counts",
        fields: ["condition", "year", "count"],
      }),
    () =>
      probeHttp({
        id: "fl-charts",
        name: "Florida FLHealthCHARTS",
        category: "secondary",
        url: "https://www.flhealthcharts.gov/ChartsReports/rdPage.aspx?rdReport=NonVitalIndNoGrp.DataViewer",
        cadence: "Annual",
        coverage: "FL county/state reportable diseases",
        fields: ["condition", "county", "year", "count"],
        extraNotes: ["ASP.NET dashboard (rdPage.aspx) — requires session/form POST; low scrape feasibility."],
      }),
    () =>
      probeHttp({
        id: "ga-oasis",
        name: "Georgia DPH OASIS",
        category: "secondary",
        url: "https://oasis.state.ga.us/",
        cadence: "Annual",
        coverage: "GA notifiable diseases via OASIS query tool",
        fields: ["condition", "county", "year", "count"],
        extraNotes: ["Interactive query tool — parameterized report generation; low scrape feasibility."],
      }),
    () =>
      probeHttp({
        id: "ny-doh",
        name: "New York State DOH Communicable Disease",
        category: "secondary",
        url: "https://www.health.ny.gov/statistics/diseases/communicable/",
        cadence: "Annual",
        coverage: "NY reported notifiable diseases (Cyclospora not on the open-data SODA portal)",
        fields: ["condition", "county", "year", "count"],
        extraNotes: ["No cyclosporiasis dataset on health.data.ny.gov (verified 0 results); HTML/PDF only."],
      }),
    () =>
      probeHttp({
        id: "wi-dhs",
        name: "Wisconsin DHS Cyclosporiasis",
        category: "secondary",
        url: "https://www.dhs.wisconsin.gov/disease/cyclosporiasis.htm",
        cadence: "Ad hoc",
        coverage: "WI surveillance narrative",
        fields: ["narrative counts"],
      }),
    () =>
      probeHttp({
        id: "il-dph",
        name: "Illinois DPH Diseases A–Z",
        category: "secondary",
        url: "https://dph.illinois.gov/topics-services/diseases-and-conditions/diseases-a-z-list.html",
        cadence: "Annual",
        coverage: "IL reportable conditions",
        fields: ["condition", "year", "count"],
      }),
    // 7. CSTE position statements — reference (case-definition comparability), not a data feed.
    async () => ({
      id: "cste-position",
      name: "CSTE Position Statements (case definitions)",
      category: "reference" as const,
      url: "https://www.cste.org/page/PositionStatements",
      format: "PDF/HTML",
      verdict: "scrape-required" as const,
      httpStatus: null,
      updateCadence: "As adopted (annual conference)",
      dateCoverage: "Definition changes affecting year-over-year comparability",
      rowCount: "n/a",
      fields: ["condition", "case definition", "effective year"],
      sampleRecord: null,
      notes: ["Context only — documents comparability caveats; never rendered as case data."],
    }),
    // 8. Census PEP — denominator for per-capita rates.
    () => probeCensus(),
  ];

  const results: ProbeResult[] = [];
  for (const p of probes) {
    try {
      results.push(await p());
    } catch (err) {
      results.push({
        id: "error",
        name: "probe failed",
        category: "primary",
        url: "",
        format: "",
        verdict: "unreachable",
        httpStatus: null,
        updateCadence: "",
        dateCoverage: "",
        rowCount: "",
        fields: [],
        sampleRecord: null,
        notes: [String(err)],
      });
    }
  }
  return results;
}

// ----------------------------------------------------------------------------
// Report
// ----------------------------------------------------------------------------

function printReport(results: ProbeResult[]): void {
  const icon: Record<Verdict, string> = {
    structured: "✅",
    "scrape-required": "🟡",
    "needs-auth": "🔑",
    unreachable: "❌",
  };
  console.log("\n=== CycloTracker source reconnaissance ===\n");
  for (const r of results) {
    console.log(`${icon[r.verdict]}  [${r.category}] ${r.name}  (${r.id})`);
    console.log(`    url      : ${r.url}`);
    console.log(`    status   : HTTP ${r.httpStatus ?? "n/a"}  ·  ${r.format}`);
    console.log(`    verdict  : ${r.verdict}`);
    console.log(`    cadence  : ${r.updateCadence}`);
    console.log(`    coverage : ${r.dateCoverage}  ·  rows: ${r.rowCount}`);
    if (r.fields.length)
      console.log(`    fields   : ${r.fields.slice(0, 14).join(", ")}${r.fields.length > 14 ? " …" : ""}`);
    if (r.sampleRecord)
      console.log(`    sample   : ${JSON.stringify(r.sampleRecord).slice(0, 200)}`);
    for (const n of r.notes) console.log(`    note     : ${n}`);
    console.log("");
  }
  const by = (v: Verdict) => results.filter((r) => r.verdict === v).length;
  console.log(
    `Summary: ${by("structured")} structured · ${by("scrape-required")} scrape-required · ` +
      `${by("needs-auth")} needs-auth · ${by("unreachable")} unreachable\n`,
  );
}

const results = await runAll();
printReport(results);
await mkdir(dirname(OUT_JSON), { recursive: true });
await writeFile(OUT_JSON, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
console.log(`Wrote ${OUT_JSON}`);
