/**
 * coverage-report.ts — reconcile sources, compute per-state totals, and write
 * docs/COVERAGE.md (+ a console summary). Run: npm run coverage
 *
 * This is the gate before any map is drawn: it states, per state, whether we have
 * data, a real zero, or no data — and never conflates the last two.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sqlite } from "../db/client";
import { summarizeWindow, type Classification } from "../lib/coverage";
import { formatYearWeek, recentWindow, WINDOW_WEEKS, windowKeySet, yearWeekKey } from "../lib/mmwr";
import { reconcilePoint, type Candidate, type Reconciled } from "../lib/reconcile";
import { getCaseCandidates, getPopulationByStateYear, getStates } from "../lib/queries";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "COVERAGE.md");

type ReconPoint = Reconciled & { year: number; week: number };
/** Group candidates by (stateFips, year, week) for one countType, then reconcile. */
function reconcileSeries(
  candidates: ReturnType<typeof getCaseCandidates>,
  countType: "weekly" | "cumulative_ytd",
): Map<string, Map<number, ReconPoint>> {
  const grouped = new Map<string, Candidate[] & { year?: number; week?: number }>();
  const meta = new Map<string, { stateFips: string; year: number; week: number }>();
  for (const c of candidates) {
    if (c.countType !== countType) continue;
    const key = `${c.stateFips}|${c.year}|${c.week}`;
    if (!grouped.has(key)) {
      grouped.set(key, [] as Candidate[]);
      meta.set(key, { stateFips: c.stateFips, year: c.year, week: c.week });
    }
    grouped.get(key)!.push({
      sourceKey: c.sourceKey,
      precedence: c.precedence,
      caseCount: c.caseCount,
      status: c.status,
    });
  }
  const out = new Map<string, Map<number, ReconPoint>>();
  for (const [key, cands] of grouped) {
    const m = meta.get(key)!;
    const rec = reconcilePoint(cands);
    if (!out.has(m.stateFips)) out.set(m.stateFips, new Map());
    out.get(m.stateFips)!.set(yearWeekKey(m.year, m.week), { ...rec, year: m.year, week: m.week });
  }
  return out;
}

const CLASS_LABEL: Record<Classification, string> = {
  "has-data": "✅ has-data",
  zero: "⓪ zero",
  "no-data": "⚠️ no-data",
};

function mdTable(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}`;
}

async function main() {
  const candidates = getCaseCandidates();
  const allStates = getStates();
  const popByState = getPopulationByStateYear();

  const weekly = reconcileSeries(candidates, "weekly");
  const cumulative = reconcileSeries(candidates, "cumulative_ytd");

  // 3-month window from the weeks actually present.
  const allPairs = candidates
    .filter((c) => c.countType === "weekly")
    .map((c) => ({ year: c.year, week: c.week }));
  const { window, latest } = recentWindow(allPairs, WINDOW_WEEKS);
  const winKeys = windowKeySet(window);
  const years = [...new Set(candidates.map((c) => c.year))].sort();

  // Enabled case sources by precedence (for the methodology section).
  const sourcePrec = new Map<string, number>();
  for (const c of candidates) sourcePrec.set(c.sourceKey, c.precedence);
  const precList = [...sourcePrec.entries()].sort((a, b) => b[1] - a[1]);

  // Per-state 3-month summary + conflicts.
  let conflicts = 0;
  const mappable = allStates.filter((s) => s.isMappable);
  const territories = allStates.filter((s) => !s.isMappable);

  interface Row {
    fips: string;
    name: string;
    usps: string;
    total: number;
    weeksWithData: number;
    classification: Classification;
    rate: number | null;
    yearsPresent: number[];
  }
  const buildRow = (s: (typeof allStates)[number]): Row => {
    const series = weekly.get(s.fips) ?? new Map<number, ReconPoint>();
    const winPoints = [...series.values()].filter((p) => winKeys.has(yearWeekKey(p.year, p.week)));
    for (const p of winPoints) if (p.conflict) conflicts++;
    const sum = summarizeWindow(winPoints, window.length);
    const yearsPresent = [
      ...new Set([...series.values()].filter((p) => p.caseCount !== null).map((p) => p.year)),
    ].sort();
    const popYears = popByState.get(s.fips);
    const pop = popYears ? popYears.get(Math.max(...popYears.keys())) : undefined;
    const rate = pop && sum.classification !== "no-data" ? (sum.total / pop) * 100_000 : null;
    return {
      fips: s.fips,
      name: s.name,
      usps: s.usps,
      total: sum.total,
      weeksWithData: sum.weeksWithData,
      classification: sum.classification,
      rate,
      yearsPresent,
    };
  };

  const rows = mappable.map(buildRow).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const territoryRows = territories.map(buildRow);

  const nationalTotal = rows.reduce((a, r) => a + r.total, 0);
  const byClass = (c: Classification) => rows.filter((r) => r.classification === c);

  // Per-year cumulative totals (for the year-selector view).
  const perYearTotal = (fips: string, year: number): number | null => {
    const series = cumulative.get(fips);
    if (!series) return null;
    const vals = [...series.values()].filter((p) => p.year === year && p.caseCount !== null);
    return vals.length ? Math.max(...vals.map((p) => p.caseCount!)) : null;
  };

  // ---- Build markdown ----
  const md: string[] = [];
  md.push("# CycloTracker — Data Coverage Report\n");
  md.push(
    `Generated **${new Date().toISOString().slice(0, 10)}** by ` +
      `[\`scripts/coverage-report.ts\`](../scripts/coverage-report.ts). ` +
      `Re-run: \`npm run coverage\`.\n`,
  );
  md.push(
    `**3-month window:** the latest **${window.length}** MMWR weeks present — ` +
      `**${window.length ? formatYearWeek(window[window.length - 1]!) : "?"} → ` +
      `${latest ? formatYearWeek(latest) : "?"}** (target ${WINDOW_WEEKS} weeks).\n`,
  );

  md.push("## How to read this\n");
  md.push(
    "- **Reconciliation precedence** (higher wins; only sources with a usable number can win):\n" +
      precList.map(([k, p]) => `  - \`${k}\` (precedence ${p})`).join("\n") +
      "\n  Currently a single enabled case source, so nothing overlaps yet — the layer is ready for more.\n",
  );
  md.push(
    "- **Classification (the zero-vs-missing distinction):**\n" +
      "  - `✅ has-data` — at least one week in the window with count > 0\n" +
      "  - `⓪ zero` — has reporting weeks, but they sum to 0 (a real \"no cases\")\n" +
      "  - `⚠️ no-data` — **no** usable week (all missing / not-notifiable). **Not** the same as zero; must not render as 0.\n",
  );
  md.push("- Counts are provisional NNDSS weekly reports; every number is traceable to a `source_id`.\n");

  md.push("## Summary\n");
  md.push(
    mdTable(
      ["Metric", "Value"],
      [
        ["Mappable jurisdictions (50 states + DC)", String(mappable.length)],
        ["— with data (>0) in window", String(byClass("has-data").length)],
        ["— reporting zero in window", String(byClass("zero").length)],
        ["— **no data** in window", `**${byClass("no-data").length}**`],
        ["National 3-month total (sum of states)", String(nationalTotal)],
        ["Reconciliation conflicts", String(conflicts)],
        ["Years available", years.join(", ")],
      ],
    ),
  );
  md.push("");

  // Gaps section — explicit.
  md.push("## Gaps — decide how to handle before drawing the map\n");
  const noData = byClass("no-data");
  const zero = byClass("zero");
  md.push(
    `**no-data (${noData.length}):** ` +
      (noData.length ? noData.map((r) => `${r.name} (${r.usps})`).join(", ") : "none") +
      "\n",
  );
  md.push(
    `**zero in window (${zero.length}):** ` +
      (zero.length ? zero.map((r) => r.usps).join(", ") : "none") +
      "\n",
  );
  md.push(
    "> Recommendation: render `no-data` states in a distinct neutral style (e.g. hatched/greyed, " +
      'labelled "no data"), never as a zero-sized symbol that reads as "0 cases". ' +
      "Render `zero` states as an explicit zero. Your call at this checkpoint.\n",
  );

  // Main per-state table.
  md.push("## 3-month coverage by state\n");
  md.push(
    mdTable(
      ["State", "3-mo total", "per 100k", "weeks w/ data", "class", "years present"],
      rows.map((r) => [
        `${r.name} (${r.usps})`,
        String(r.total),
        r.rate === null ? "—" : r.rate.toFixed(2),
        `${r.weeksWithData}/${window.length}`,
        CLASS_LABEL[r.classification],
        r.yearsPresent.join(", ") || "—",
      ]),
    ),
  );
  md.push("");

  // Per-year cumulative matrix (year-selector view).
  md.push("## Per-year totals (cumulative YTD, for the year selector)\n");
  md.push(
    mdTable(
      ["State", ...years.map(String)],
      mappable
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => [
          `${s.name} (${s.usps})`,
          ...years.map((y) => {
            const v = perYearTotal(s.fips, y);
            return v === null ? "—" : String(v);
          }),
        ]),
    ),
  );
  md.push("\n> `—` = no data for that year (not zero).\n");

  // Territories.
  md.push("## Territories (stored, not drawn on the Albers USA map)\n");
  md.push(
    mdTable(
      ["Territory", "3-mo total", "weeks w/ data", "class"],
      territoryRows.map((r) => [
        `${r.name} (${r.usps})`,
        String(r.total),
        `${r.weeksWithData}/${window.length}`,
        CLASS_LABEL[r.classification],
      ]),
    ),
  );
  md.push("");

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, md.join("\n"));

  // Console summary.
  console.log(`\nCoverage — window ${window.length ? formatYearWeek(window[window.length - 1]!) : "?"} → ${latest ? formatYearWeek(latest) : "?"}`);
  console.log(`  mappable: ${mappable.length} | has-data: ${byClass("has-data").length} | zero: ${byClass("zero").length} | no-data: ${byClass("no-data").length}`);
  console.log(`  national 3-mo total: ${nationalTotal} | conflicts: ${conflicts}`);
  if (noData.length) console.log(`  ⚠ no-data states: ${noData.map((r) => r.usps).join(", ")}`);
  console.log(`Wrote ${OUT}\n`);
  sqlite.close();
}

await main();
