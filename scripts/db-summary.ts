/**
 * scripts/db-summary.ts — quick health/inspection view of the local DB.
 * Prints tables, row counts, seed breakdown, and enabled sources.
 * Run: npm run db:summary
 */
import { sqlite } from "../db/client";

const tables = sqlite
  .prepare(
    `SELECT name FROM sqlite_master
     WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'
     ORDER BY name`,
  )
  .all() as { name: string }[];

const EMPTY_BY_DESIGN = new Set(["case_records", "raw_ingests", "state_population"]);

console.log("\nTABLES & ROW COUNTS");
for (const { name } of tables) {
  const { c } = sqlite.prepare(`SELECT count(*) c FROM ${name}`).get() as { c: number };
  const tag = EMPTY_BY_DESIGN.has(name) && c === 0 ? "  (empty — filled by Step 3 ingestion)" : "";
  console.log(`  ${name.padEnd(18)} ${String(c).padStart(4)}${tag}`);
}

console.log("\nSTATES BREAKDOWN");
console.table(
  sqlite
    .prepare(`SELECT type, count(*) n, sum(is_mappable) mappable FROM states GROUP BY type`)
    .all(),
);

console.log("ENABLED SOURCES (precedence desc)");
console.table(
  sqlite
    .prepare(`SELECT key, category, precedence FROM sources WHERE enabled=1 ORDER BY precedence DESC`)
    .all(),
);
const { c: deferred } = sqlite
  .prepare(`SELECT count(*) c FROM sources WHERE enabled=0`)
  .get() as { c: number };
console.log(`Deferred (disabled) sources: ${deferred}\n`);

sqlite.close();
