/**
 * run.ts — ingestion runner.
 *
 *   npm run ingest                  # fetch + store raw + normalize + persist (all enabled sources)
 *   npm run ingest -- nndss-weekly  # just one source
 *   npm run normalize               # re-normalize from stored raw payloads (no network)
 *
 * Raw payloads are stored untouched in raw_ingests; normalization is a separate,
 * idempotent pass. Re-running never duplicates rows. Prints per-source counts.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sqlite } from "../../db/client";
import {
  countCaseRecords,
  countOutbreaks,
  countPopulation,
  enabledSourceKeys,
  getSourceByKey,
  latestRawIngests,
  recordRawIngest,
} from "./persist";
import type { Adapter } from "./types";
import { censusAcs1 } from "./sources/census-acs1";
import { nndssWeekly } from "./sources/nndss-weekly";
import { nors } from "./sources/nors";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "..");
const ENV = join(ROOT, ".env");
if (existsSync(ENV)) process.loadEnvFile(ENV);

const REGISTRY: Adapter<any>[] = [nndssWeekly, censusAcs1, nors];

const COUNTERS = {
  case_records: countCaseRecords,
  state_population: countPopulation,
  outbreak_records: countOutbreaks,
} as const;

interface Report {
  key: string;
  table: string;
  fetched: number;
  normalized: number;
  written: number;
  skipped: number;
  reusedRaw: number;
  fromCache: number;
  total: number;
  warnings: string[];
}

async function runAdapter(adapter: Adapter<any>, normalizeOnly: boolean): Promise<Report> {
  const source = getSourceByKey(adapter.key);
  const report: Report = {
    key: adapter.key,
    table: adapter.targetTable,
    fetched: 0,
    normalized: 0,
    written: 0,
    skipped: 0,
    reusedRaw: 0,
    fromCache: 0,
    total: 0,
    warnings: [],
  };
  if (!source) {
    report.warnings.push(`No source row for key "${adapter.key}" (run db:seed).`);
    return report;
  }

  if (normalizeOnly) {
    const raws = latestRawIngests(source.id);
    if (raws.length === 0) report.warnings.push("No stored raw payloads — run `npm run ingest` first.");
    for (const raw of raws) {
      const { records, warnings, skipped } = adapter.normalize(raw.payload, raw.requestUrl);
      report.normalized += records.length;
      report.skipped += skipped;
      report.warnings.push(...warnings);
      report.written += adapter.persist(records, { sourceId: source.id, ingestId: raw.id });
    }
  } else {
    const raws = await adapter.fetch();
    for (const raw of raws) {
      report.fetched += raw.rowCount ?? 0;
      if (raw.httpStatus !== 200) {
        report.warnings.push(`HTTP ${raw.httpStatus} for ${raw.requestUrl} — skipped (not stored).`);
        continue;
      }
      const { ingestId, reused } = recordRawIngest(source.id, raw);
      if (reused) report.reusedRaw++;
      let result;
      try {
        result = adapter.normalize(raw.body, raw.requestUrl);
      } catch (err) {
        report.warnings.push(`normalize failed for ${raw.requestUrl}: ${String(err)}`);
        continue;
      }
      report.normalized += result.records.length;
      report.skipped += result.skipped;
      report.warnings.push(...result.warnings);
      report.written += adapter.persist(result.records, { sourceId: source.id, ingestId });
    }
  }

  report.total = COUNTERS[adapter.targetTable](source.id);
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const normalizeOnly = args.includes("--normalize-only");
  const requested = args.filter((a) => !a.startsWith("--"));

  const enabled = new Set(enabledSourceKeys());
  const toRun = REGISTRY.filter((a) => {
    if (requested.length > 0) return requested.includes(a.key);
    return enabled.has(a.key);
  });

  console.log(
    `\n${normalizeOnly ? "Re-normalizing" : "Ingesting"} ${toRun.length} source(s): ` +
      `${toRun.map((a) => a.key).join(", ")}\n`,
  );

  const reports: Report[] = [];
  for (const adapter of toRun) reports.push(await runAdapter(adapter, normalizeOnly));

  console.log("SOURCE                TABLE              fetched  normalized  written  skipped   DB total");
  console.log("-".repeat(92));
  for (const r of reports) {
    console.log(
      `${r.key.padEnd(20)}  ${r.table.padEnd(16)}  ${String(r.fetched).padStart(7)}  ` +
        `${String(r.normalized).padStart(10)}  ${String(r.written).padStart(7)}  ` +
        `${String(r.skipped).padStart(7)}  ${String(r.total).padStart(8)}`,
    );
    for (const w of [...new Set(r.warnings)]) console.log(`    ⚠ ${w}`);
  }
  console.log("");
  sqlite.close();
}

await main();
