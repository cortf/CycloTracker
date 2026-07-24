---
description: Run the full verification gate (typecheck, tests, build) for a checkpoint
allowed-tools: Bash(npm run typecheck*), Bash(npm test*), Bash(npm run build*), Bash(npm run db:summary*), Bash(git status*), Read
---

Verify the current step before asking for review.

1. `npm run typecheck` — must be clean.
2. `npm test` — all unit tests pass.
3. If the step touched the app/API: `npm run build` — must succeed.
4. If the step touched data: `npm run db:summary` (row counts sane, case tables
   populated as expected).
5. `git status` — confirm no build/DB artifacts are staged (`.next/`, `*.db`,
   `.cache/`, `.env`, `next-env.d.ts`).
6. Summarize what was built and exactly what the reviewer should check, then STOP —
   do not start the next step until approved.
