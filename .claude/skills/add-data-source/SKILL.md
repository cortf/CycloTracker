---
name: add-data-source
description: Add a new data-source adapter to CycloTracker's ingestion pipeline. Use whenever wiring in a new source of Cyclospora case counts, outbreak records, or population — encodes the fetch→normalize→persist adapter contract, the state→FIPS and zero-vs-missing rules, idempotency requirements, and the testing checklist.
---

# Adding a data source

A source becomes an **adapter** under `scripts/ingest/sources/`, split into a PURE
normalizer (unit-tested, no DB) and a thin adapter that wires I/O.

## 0. Probe & document first

Confirm the source is live and machine-readable (prefer JSON/CSV APIs; scrape only
as a last resort). Record URL, format, license, cadence, fields, and a sample row
in `docs/DATA_SOURCES.md`. Add a seed row to `db/seed/sources.ts` with a stable
`key`, `category`, `precedence`, and `enabled`, then `npm run db:seed`.

## 1. The adapter contract (`scripts/ingest/types.ts`)

```ts
interface Adapter<T> {
  key: string;                       // must match sources.key
  targetTable: "case_records" | "state_population" | "outbreak_records";
  fetch(): Promise<RawFetch[]>;      // network only; disk-cached via lib http.ts
  normalize(body: string, url: string): NormalizeResult<T>; // PURE — the tested part
  persist(records: T[], ctx: { sourceId: number; ingestId: number }): number;
}
```

Files:
- `sources/<key>.normalize.ts` — exports `normalize<Name>(body, url)`. **No DB
  imports.** Import `resolveReportingArea` from `../resolve-state` for state→FIPS.
- `sources/<key>.ts` — the adapter: `fetch` (use `cachedFetch` from `../http`),
  `normalize` (re-export the pure fn), `persist` (call an upsert in `../persist`).
- Register it in the `REGISTRY` array in `scripts/ingest/run.ts`.

## 2. Non-negotiable normalization rules

- **State resolution:** always go through `resolveReportingArea`. It returns
  `state` | `excluded` (regions/national aggregates) | `unknown`. Skip excluded;
  **warn on unknown — never guess a FIPS, never silently drop.**
- **Zero vs. missing:** map source flags to `status`:
  `zero` (real 0) vs `missing`/`not_notifiable` (count = NULL). **Never store a
  NULL as 0, never a 0 as missing.**
- **Aggregation:** if two reporting areas map to one FIPS (e.g. NYC → NY), sum only
  the reported components; missing components do not become 0.
- **Idempotency:** normalized rows upsert on a natural key (see the unique indexes
  in `db/schema.ts`); outbreak rows use a `dedupeKey` hash. Re-running must not
  duplicate rows. Raw payloads are append-only, deduped by content hash.
- **Units:** never merge different units (e.g. NORS outbreak illnesses) into
  `case_records`. New units get their own table + migration.

## 3. Testing checklist (`scripts/ingest/__tests__/<key>.normalize.test.ts`)

Cover, at minimum:
- [ ] canonical mapping (a normal row → correct FIPS + count)
- [ ] every flag → status (reported / zero / missing / not_notifiable)
- [ ] a real 0 vs a missing value stay distinct
- [ ] excluded aggregates/regions are skipped; unknown areas warn (not dropped as 0)
- [ ] any aggregation (multi-area → one FIPS) sums correctly
- [ ] idempotency key / dedupeKey is stable and de-dupes within a payload
- [ ] malformed/empty payload handled gracefully

## 4. Gate

```
npm run typecheck && npm test && npm run ingest -- <key> && npm run coverage
```
Then update `PROGRESS.md` and commit. If the source overlaps an existing one,
confirm the precedence in `db/seed/sources.ts` produces the intended winner and
that conflicts show up in the coverage report.
