---
description: Regenerate the coverage report and summarize gaps (zero vs no-data)
allowed-tools: Bash(npm run coverage*), Read
---

1. Run `npm run coverage` to rebuild `docs/COVERAGE.md`.
2. Report the window, national total, and the has-data / zero / **no-data** counts.
3. List the no-data states explicitly and confirm they are genuinely no-data
   (flag `N`/`U` every week), not a normalization bug — never present them as zero.
4. Note any reconciliation conflicts.
