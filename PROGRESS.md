# CycloTracker — Build Progress Log

A short, plain-language record of **what was done at each step and why**, so you
can pick the project back up without re-reading everything. Newest step at the
bottom. Detail lives in the linked files.

**What we're building:** a web app that maps reported _Cyclospora cayetanensis_
infections by U.S. state (proportional symbol map), focused on the **last ~3
months**, refreshed **weekly (Monday mornings)**.

**Plan:** 7 steps, each reviewed before the next.
`1 Sources → 2 Schema → 3 Ingestion → 4 Normalization → 5 API → 6 Map → 7 Polish`

**Sources that made the cut** (Step 1): CDC NNDSS weekly (case data) · Census ACS1
(population, for rates) · CDC NORS (historical outbreak context, separate table).
Everything else deferred but easy to add back later.

---

## Step 1 — Source Reconnaissance ✅ (commit `5c13206`)

**Goal:** find and verify live data sources before writing any ingestion.

**What I did**
- Wrote [`scripts/probe-sources.ts`](scripts/probe-sources.ts) — hits every
  candidate source live, reports status/format/fields/coverage/row counts, and
  **caches raw responses to `.cache/`** so we don't hammer public APIs. `npm run probe`.
- Documented all findings in [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md)
  (machine-readable copy: `docs/source-probe-results.json`).
- Scaffolded a minimal TS toolchain only (`tsx` + `typescript`). No Next.js/D3/
  SQLite yet — those come in their own steps.

**What I found (why the source list looks like it does)**
- **CDC NNDSS Weekly (`x9gk-5huc`)** is the only source that's state-level + weekly
  + current-year + machine-readable. It's the **backbone**. Its `m1` column
  (weekly count) summed over the last ~13 weeks = the 3-month figure; its flags
  (`-` = real zero, `U`/`N` = missing) give us the **"zero vs no data"** distinction.
- **Census population:** the brief said PEP, but PEP's population API stops at
  Vintage 2021, so I used **ACS 1-year** (`B01001_001E`, 2024) instead — current,
  52 rows (50 states + DC + PR). Your API key is wired into `.env` (git-ignored).
- **NORS (`5xkq-dg7x`)** is outbreak-level and lags to 2023 → kept only for
  historical/food-vehicle context, in a **separate table**, never mixed into counts.
- **FDA CORE, CDC & all 6 state DOH pages** are JS-rendered or bot-protected, and
  no state exposes a machine-readable cyclosporiasis feed → **all deferred**.

**Decisions (resolved with you):** use ACS1 for the denominator; defer all state
sources for now; make sources easy to add back later.

**Verify:** open `docs/DATA_SOURCES.md`; optionally `npm run probe`.

---

## Step 2 — Schema & Storage ✅

**Goal:** design the SQLite schema, wire up migrations, and seed the geography.

**Choice:** **Drizzle ORM** + better-sqlite3 (your call) — schema is defined in
TypeScript ([`db/schema.ts`](db/schema.ts)) as the single source of truth; SQL
migrations are generated from it; queries are type-safe into the Step 5 API.

**Tables** (see [`db/schema.ts`](db/schema.ts)):
- `states` — geography dimension, **seeded**: 50 states + DC + 5 territories with
  2-digit FIPS. `is_mappable` flags the 51 the Albers map draws (territories stored, not drawn).
- `sources` — registry of every source with a `precedence` (state DOH > NNDSS
  annual > NNDSS weekly) and `enabled` flag. Seeded: 3 enabled, 10 deferred.
- `raw_ingests` — **append-only** raw payloads (+ fetch time, URL, http status,
  content hash). Normalization re-runs from here without re-fetching.
- `case_records` — **normalized** counts, one row per (source, state, year, week,
  count_type). `status` makes **zero vs missing** explicit: `zero` (count 0, flag
  `-`) vs `missing` (count NULL, flag `U`). Every row carries `source_id` +
  `ingest_id` for full provenance. A unique natural key makes re-normalizing idempotent.
- `state_population` — denominator (ACS1) for per-100k rates. Never a case source.

**Why these choices:** the brief's hard constraints drove the shape — traceability
(`source_id`/`ingest_id` everywhere), never-impute (NULL count ≠ 0, enforced by
`status`), and idempotent re-runs (unique natural key). FKs are enforced (`PRAGMA
foreign_keys=ON`).

**Verified:** migration applies; seed loads 56 states + 13 sources; case tables
start **empty**; FK rejects a bad FIPS; the natural key blocks duplicate inserts;
zero-vs-missing round-trips correctly. `npm run typecheck` passes.

**Commands:** `npm run db:generate` (SQL from schema) · `db:migrate` · `db:seed` ·
`db:summary` (inspect) · `db:studio` (browse). DB lives at `data/cyclotracker.db`
(git-ignored); migrations are committed.

**Known note:** `npm audit` flags esbuild (dev-only, via drizzle-kit; affects only
esbuild's dev server, which we never run). Left as-is to avoid a breaking bump.

**Verify:** `npm run db:seed && npm run db:summary`.

---

<!-- Add Step 3 here once ingestion is built. -->
