---
description: Scaffold and wire a new data-source adapter following the contract
argument-hint: "<source-key> <human name>  (e.g. tx-dshs \"Texas DSHS\")"
allowed-tools: Read, Edit, Write, Bash(npm test*), Bash(npm run typecheck*), Bash(npm run ingest*)
---

Add a new data source adapter: **$ARGUMENTS**.

Follow the **add-data-source skill** (`.claude/skills/add-data-source/SKILL.md`) —
it is the source of truth for the adapter interface contract and the testing
checklist. In brief:

1. Probe the source first (extend `scripts/probe-sources.ts` or curl) and document it
   in `docs/DATA_SOURCES.md`. Prefer machine-readable endpoints.
2. Add a seed row in `db/seed/sources.ts` (key, category, precedence, `enabled`),
   then `npm run db:seed`.
3. Create `scripts/ingest/sources/<key>.normalize.ts` (PURE — no DB) and a thin
   `scripts/ingest/sources/<key>.ts` adapter (`fetch → normalize → persist`).
   Reuse `resolveReportingArea` for state→FIPS; keep zero vs. missing distinct.
4. Register the adapter in `scripts/ingest/run.ts`.
5. Write tests in `scripts/ingest/__tests__/<key>.normalize.test.ts` covering every
   branch (mapping, zero/missing, dedup/idempotency, unknown areas).
6. `npm run typecheck && npm test && npm run ingest -- <key>`, then update
   `PROGRESS.md`.

Never impute data; never merge different units (e.g. outbreak illnesses) into
`case_records`.
