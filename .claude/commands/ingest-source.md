---
description: Ingest one (or all) data source(s) and report per-source row counts
argument-hint: "[source-key]  (e.g. nndss-weekly; omit for all enabled)"
allowed-tools: Bash(npm run ingest*), Bash(npm run db:summary*), Read
---

Run the ingestion pipeline and verify it.

1. Run: `npm run ingest${ARGUMENTS:+ -- $ARGUMENTS}`
2. Report the per-source table (fetched / normalized / written / skipped / DB total)
   and surface any warnings (unknown reporting areas, HTTP errors).
3. Run `npm run db:summary` and confirm the target tables grew as expected and that
   re-running would be idempotent (written == DB total on a fresh load).

Do NOT edit any normalized rows by hand. Raw payloads are append-only; normalization
is re-runnable via `npm run normalize`.
