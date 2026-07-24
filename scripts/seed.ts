/**
 * scripts/seed.ts — seed the reference tables (states + sources).
 * Idempotent: safe to re-run. Does NOT touch case_records/raw_ingests (those are
 * filled by ingestion in Step 3). Run: npm run db:seed
 */
import { db, sqlite } from "../db/client";
import { sources, states } from "../db/schema";
import { SEED_STATES } from "../db/seed/states";
import { SEED_SOURCES } from "../db/seed/sources";

// States: stable identity — insert once, leave existing rows untouched.
const stateRows = SEED_STATES.map((s) => ({
  fips: s.fips,
  name: s.name,
  usps: s.usps,
  type: s.type,
  isMappable: s.mappable,
}));
db.insert(states).values(stateRows).onConflictDoNothing().run();

// Sources: upsert on `key` so metadata (notes, cadence, enabled) stays current.
for (const s of SEED_SOURCES) {
  db.insert(sources)
    .values(s)
    .onConflictDoUpdate({
      target: sources.key,
      set: {
        name: s.name,
        url: s.url,
        category: s.category,
        format: s.format,
        license: s.license,
        updateCadence: s.updateCadence,
        precedence: s.precedence,
        enabled: s.enabled,
        notes: s.notes,
      },
    })
    .run();
}

const stateCount = sqlite.prepare("SELECT count(*) AS n FROM states").get() as { n: number };
const sourceCount = sqlite.prepare("SELECT count(*) AS n FROM sources").get() as { n: number };
const enabledCount = sqlite
  .prepare("SELECT count(*) AS n FROM sources WHERE enabled = 1")
  .get() as { n: number };

console.log(
  `✅ seeded ${stateCount.n} states/territories, ${sourceCount.n} sources ` +
    `(${enabledCount.n} enabled).`,
);
sqlite.close();
