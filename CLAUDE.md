# CLAUDE.md — CycloTracker

Guidance for working in this repo. Also read [PROGRESS.md](PROGRESS.md) for the
step-by-step build log and [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) /
[docs/COVERAGE.md](docs/COVERAGE.md) for source and coverage detail.

## What this is

A Next.js app that maps **reported _Cyclospora cayetanensis_ cases by U.S. state**
on a proportional symbol map, focused on the **last ~3 months**, refreshed
**weekly**. Stack: Next.js (App Router) + TypeScript + D3 (d3-geo/scale/force) +
SQLite via Drizzle (better-sqlite3). Node/tsx scripts for ingestion.

## Architecture & data flow

```mermaid
flowchart TD
  subgraph Sources [Public sources]
    A[CDC NNDSS weekly<br/>x9gk-5huc] 
    B[CDC NORS<br/>5xkq-dg7x]
    C[Census ACS1<br/>population]
  end
  A & B & C -->|fetch, disk-cached| RAW[(raw_ingests<br/>append-only)]
  RAW -->|normalize, pure+tested| N[case_records ·<br/>outbreak_records ·<br/>state_population]
  N --> LIB[lib/: reconcile → model → coverage/rates]
  LIB --> API[app/api: /cases /states/[fips] /sources]
  API --> UI[components/: MapExplorer → SymbolMap + Legend + Table]
  LIB --> COV[scripts/coverage-report → docs/COVERAGE.md]
```

- **Ingestion** (`scripts/ingest/`): one adapter per source, each a pure
  `*.normalize.ts` (tested) + a thin adapter wiring `fetch → persist`. Raw payloads
  land in `raw_ingests` untouched; normalization is a separate, re-runnable,
  idempotent pass. `npm run ingest` / `npm run normalize`.
- **Domain logic** (`lib/`): `reconcile.ts` (precedence), `model.ts` (reconciled
  series + 3-month window), `coverage.ts` (has-data/zero/no-data), `rates.ts`,
  `map-utils.ts` (√-radius scale, dodge). All pure and unit-tested.
- **API** (`app/api/`): thin handlers, zod-validated in and out, backed by `lib/`.
- **Map** (`components/`): server-projected geometry (`lib/geo.ts`), client SVG.

## Precedence & reconciliation rules

- Conflict resolution is by `sources.precedence` (higher wins): **state DOH (100) >
  NNDSS annual (80) > NNDSS weekly (60) > NORS (40)**. Only sources with a *usable*
  number (status `reported`/`zero`) can win; ties break toward the **larger** count;
  disagreements set a `conflict` flag (surfaced, never averaged).
- **Zero vs. no-data is sacred.** `status` distinguishes `zero` (count 0, flag `-`)
  from `missing`/`not_notifiable` (count NULL). A NULL is never a 0, anywhere.

## Conventions

- Node scripts run via `tsx`; the app via Next. One `tsconfig.json` covers both.
- Pure logic lives in `lib/` (no DB import) so it's unit-testable; DB reads live in
  `lib/queries.ts`; DB writes in `scripts/ingest/persist.ts`.
- Every normalization/reconciliation function has a vitest test (`npm test`).
- Secrets in `.env` (git-ignored). The SQLite DB and `.cache/` are git-ignored.
- Commit one step at a time with a descriptive message.

## Do NOT do this

- **Never fabricate, interpolate, or impute case data. Missing is missing.**
- **Never render "no data" as zero** — no-data states are hatched, not zero-sized.
- **Never scale symbols by radius** — radius = √value so *area* ∝ value.
- **Never render a number that isn't traceable to a `source_id`** (+ `ingest_id`).
- Never write to `case_records`/`raw_ingests`/etc. by hand — go through ingestion.
- Never edit files under `db/migrations/` by hand — change `db/schema.ts` and run
  `npm run db:generate`.
- Never merge NORS outbreak illnesses into `case_records` — different unit.
- Never commit the DB, `.cache/`, `.next/`, or `.env`.

## Common commands

`npm run dev` · `npm run refresh` (migrate+seed+ingest+coverage, fresh) ·
`npm run ingest` · `npm run coverage` · `npm run db:summary` · `npm test` ·
`npm run typecheck` · `npm run build`.
