# CycloTracker

A Next.js app that maps reported _Cyclospora cayetanensis_ cases by U.S. state on a
proportional symbol map, focused on the **last ~3 months** and refreshed **weekly**.

Circles are placed at state centroids with **area proportional to case count**.
States with no usable data are hatched — never drawn as zero. Every number is
traceable to a source, and missing data is never imputed.

## Stack

Next.js (App Router) + TypeScript · D3 (d3-geo/scale/force) · SQLite via Drizzle
(better-sqlite3) · Node/tsx ingestion scripts · Vitest.

## Data sources

- **CDC NNDSS weekly** (`x9gk-5huc`) — the backbone: state-level, weekly case counts.
- **Census ACS 1-year** (`B01001_001E`) — population, for per-100k rates.
- **CDC NORS** (`5xkq-dg7x`) — historical outbreak context (separate table, never mixed into counts).

See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) and [docs/COVERAGE.md](docs/COVERAGE.md) for detail.

## Getting started

```bash
npm install
cp .env.example .env   # add your Census API key
npm run refresh        # migrate + seed + ingest + coverage report
npm run dev            # http://localhost:3000
```

## Common commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app on localhost:3000 |
| `npm run refresh` | Full rebuild: migrate → seed → ingest → coverage |
| `npm run ingest` | Fetch + normalize all sources into the DB |
| `npm run normalize` | Re-normalize from stored raw payloads (no network) |
| `npm run coverage` | Regenerate `docs/COVERAGE.md` |
| `npm run db:summary` | Inspect row counts in the DB |
| `npm test` | Run the unit tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Production build |

## How it works

```
Sources → raw_ingests → normalize → reconcile → API → map
```

1. **Ingestion** (`scripts/ingest/`) — one adapter per source; raw payloads land in
   `raw_ingests` untouched, then a separate, re-runnable pass normalizes them.
2. **Domain logic** (`lib/`) — reconciliation by source precedence, the 3-month
   window, coverage (has-data / zero / no-data), and rates. All pure and unit-tested.
3. **API** (`app/api/`) — thin, zod-validated handlers over `lib/`.
4. **Map** (`components/`) — server-projected geometry (Albers USA), client-rendered SVG.

## Ground rules

- Never fabricate, interpolate, or impute case data — missing is missing.
- Zero and no-data are distinct: zero is an explicit 0, no-data is hatched.
- Symbols scale by **area** (radius = √value), never by radius.
- Every rendered number traces back to a `source_id`.

See [CLAUDE.md](CLAUDE.md) for architecture and conventions, and
[PROGRESS.md](PROGRESS.md) for the step-by-step build log.
