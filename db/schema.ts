/**
 * db/schema.ts — CycloTracker SQLite schema (Drizzle ORM).
 *
 * Design goals (from the project brief):
 *  - Every rendered number is traceable to a source_id (and the exact raw fetch).
 *  - Raw payloads are stored untouched and append-only (raw_ingests).
 *  - Normalization is a separate, re-runnable, idempotent pass (case_records).
 *  - "Zero cases" and "no data" are explicitly distinguished — never conflated.
 *
 * Tables: states (seed) · sources (registry) · raw_ingests (append-only) ·
 *         case_records (normalized) · state_population (denominator).
 */

import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`);

/**
 * states — the geographic dimension. Seeded once with 50 states + DC +
 * territories and their 2-digit FIPS codes. Everything joins to this by FIPS.
 */
export const states = sqliteTable("states", {
  fips: text("fips").primaryKey(), // 2-char, e.g. "06" (CA), "11" (DC), "72" (PR)
  name: text("name").notNull(),
  usps: text("usps").notNull().unique(), // 2-letter postal, e.g. "CA"
  type: text("type", { enum: ["state", "district", "territory"] }).notNull(),
  // True for the 50 states + DC (what the Albers USA map draws). Territories are
  // stored (NNDSS reports them) but not mapped.
  isMappable: integer("is_mappable", { mode: "boolean" }).notNull(),
});

/**
 * sources — registry of every data source (from Step 1 reconnaissance).
 * `precedence` drives Step-4 conflict resolution (higher = more authoritative).
 */
export const sources = sqliteTable("sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(), // stable slug, e.g. "nndss-weekly"
  name: text("name").notNull(),
  url: text("url"),
  category: text("category", {
    enum: ["primary", "secondary", "denominator", "reference"],
  }).notNull(),
  format: text("format"),
  license: text("license"),
  updateCadence: text("update_cadence"),
  precedence: integer("precedence").notNull().default(0),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  notes: text("notes"),
  createdAt: createdAt(),
});

/**
 * raw_ingests — APPEND-ONLY. Every fetch lands here untouched, so normalization
 * can be re-run from stored payloads without hitting the network. Never UPDATE
 * or DELETE rows here. `contentHash` lets ingestion skip re-persisting an
 * identical payload (idempotency) while keeping full fetch history.
 */
export const rawIngests = sqliteTable(
  "raw_ingests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
    fetchedAt: text("fetched_at").notNull(), // ISO 8601, set by the fetcher
    requestUrl: text("request_url").notNull(),
    httpStatus: integer("http_status"),
    contentHash: text("content_hash").notNull(), // sha256 of payload
    rowCount: integer("row_count"),
    payload: text("payload").notNull(), // raw response body, verbatim
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [
    index("raw_ingests_source_fetched_idx").on(t.sourceId, t.fetchedAt),
    index("raw_ingests_hash_idx").on(t.contentHash),
  ],
);

/**
 * case_records — NORMALIZED case data. One row per
 * (source, state, year, week, countType). Rebuilt idempotently from raw_ingests.
 *
 * The "zero vs missing" distinction lives in `status` + `caseCount`:
 *   status="reported"       caseCount > 0
 *   status="zero"           caseCount = 0     (source flag "-" = no reported cases)
 *   status="missing"        caseCount = NULL  (source flag "U" = unavailable)
 *   status="not_notifiable" caseCount = NULL  (source flag "N"/"NN")
 * A NULL caseCount is NEVER treated as zero downstream.
 */
export const caseRecords = sqliteTable(
  "case_records",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
    // The exact raw fetch this number came from — full provenance.
    ingestId: integer("ingest_id").references(() => rawIngests.id),
    stateFips: text("state_fips")
      .notNull()
      .references(() => states.fips),
    stateName: text("state_name").notNull(), // as reported by the source
    year: integer("year").notNull(), // MMWR year
    week: integer("week"), // MMWR week (1-53); NULL for annual rows
    countType: text("count_type", {
      enum: ["weekly", "cumulative_ytd", "annual"],
    }).notNull(),
    caseCount: integer("case_count"), // NULL = no data (see `status`)
    flag: text("flag"), // raw source flag, kept for audit ("-", "U", "N", ...)
    status: text("status", {
      enum: ["reported", "zero", "missing", "not_notifiable"],
    }).notNull(),
    confidence: text("confidence", { enum: ["high", "medium", "low"] })
      .notNull()
      .default("medium"),
    createdAt: createdAt(),
  },
  (t) => [
    // Idempotency: re-normalizing replaces rather than duplicates.
    // (NNDSS weekly rows always carry a week, so NULL-distinctness is moot here.)
    uniqueIndex("case_records_natural_key").on(
      t.sourceId,
      t.stateFips,
      t.year,
      t.week,
      t.countType,
    ),
    index("case_records_state_year_idx").on(t.stateFips, t.year),
  ],
);

/**
 * state_population — denominator for per-100k rates (Census ACS 1-year).
 * One row per (state, year, source). Never a case source.
 */
export const statePopulation = sqliteTable(
  "state_population",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    stateFips: text("state_fips")
      .notNull()
      .references(() => states.fips),
    year: integer("year").notNull(), // ACS/vintage year
    population: integer("population").notNull(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("state_population_natural_key").on(
      t.stateFips,
      t.year,
      t.sourceId,
    ),
  ],
);

/**
 * outbreak_records — CDC NORS outbreak-level data (illnesses + food vehicle).
 * A DIFFERENT UNIT from case_records (outbreaks, not surveillance case counts) —
 * kept separate and never summed into case totals. Used for provenance/context.
 * `dedupeKey` (hash of salient fields) gives idempotency: NORS has no stable
 * outbreak id in this dataset. `stateFips` is nullable (multistate/unknown).
 */
export const outbreakRecords = sqliteTable("outbreak_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceId: integer("source_id")
    .notNull()
    .references(() => sources.id),
  ingestId: integer("ingest_id").references(() => rawIngests.id),
  dedupeKey: text("dedupe_key").notNull().unique(),
  stateFips: text("state_fips").references(() => states.fips),
  stateName: text("state_name").notNull(),
  year: integer("year").notNull(),
  month: integer("month"),
  etiology: text("etiology"),
  etiologyStatus: text("etiology_status"),
  primaryMode: text("primary_mode"),
  setting: text("setting"),
  illnesses: integer("illnesses"),
  hospitalizations: integer("hospitalizations"),
  deaths: integer("deaths"),
  foodVehicle: text("food_vehicle"),
  foodContaminatedIngredient: text("food_contaminated_ingredient"),
  ifsacCategory: text("ifsac_category"),
  createdAt: createdAt(),
});

// Handy inferred types for the rest of the app.
export type State = typeof states.$inferSelect;
export type OutbreakRecord = typeof outbreakRecords.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type RawIngest = typeof rawIngests.$inferSelect;
export type CaseRecord = typeof caseRecords.$inferSelect;
export type StatePopulation = typeof statePopulation.$inferSelect;
