/** Service for GET /api/cases — per-state totals for the window or a given year. */
import type { Classification } from "../coverage";
import { summarizeWindow } from "../coverage";
import { formatYearWeek, windowKeySet, yearWeekKey } from "../mmwr";
import { buildModel, windowPointsForState } from "../model";
import { getPopulationByStateYear, getStates } from "../queries";
import { perCapitaRate, pickPopulation } from "../rates";
import { casesResponseSchema, type CasesQuery, type CasesResponse } from "./schemas";

export function buildCasesResponse(q: CasesQuery): CasesResponse {
  const model = buildModel();
  const states = getStates().filter((s) => s.isMappable);
  const popByState = getPopulationByStateYear();
  const winKeys = windowKeySet(model.window);
  const year = q.year;

  const stateEntries = states.map((s) => {
    let count = 0;
    let classification: Classification;
    let weeksWithData: number | null = null;
    let sources: string[] = [];

    if (year !== undefined) {
      const cum = model.cumulative.get(s.fips);
      const pts = cum ? [...cum.values()].filter((p) => p.year === year) : [];
      const usable = pts.filter((p) => p.caseCount !== null);
      count = usable.length ? Math.max(...usable.map((p) => p.caseCount!)) : 0;
      classification = usable.length === 0 ? "no-data" : count === 0 ? "zero" : "has-data";
      sources = [...new Set(usable.flatMap((p) => p.contributors))];
    } else {
      const pts = windowPointsForState(model.weekly, s.fips, winKeys);
      const sum = summarizeWindow(pts, model.window.length);
      count = sum.total;
      classification = sum.classification;
      weeksWithData = sum.weeksWithData;
      sources = [...new Set(pts.filter((p) => p.caseCount !== null).flatMap((p) => p.contributors))];
    }

    const popVal = pickPopulation(popByState.get(s.fips), year);
    const rate = classification === "no-data" ? null : perCapitaRate(count, popVal);
    const value = classification === "no-data" ? null : q.metric === "rate" ? rate : count;
    return { fips: s.fips, name: s.name, usps: s.usps, count, rate, value, classification, weeksWithData, sources };
  });

  const national = {
    total: stateEntries.reduce((a, e) => a + e.count, 0),
    statesWithData: stateEntries.filter((e) => e.classification === "has-data").length,
    statesZero: stateEntries.filter((e) => e.classification === "zero").length,
    statesNoData: stateEntries.filter((e) => e.classification === "no-data").length,
  };

  const scope =
    year !== undefined
      ? { kind: "year" as const, label: String(year), year }
      : {
          kind: "window" as const,
          label: `Last ${model.window.length} weeks`,
          window: {
            from: model.window.length ? formatYearWeek(model.window[model.window.length - 1]!) : "",
            to: model.latest ? formatYearWeek(model.latest) : "",
            weeks: model.window.length,
          },
        };

  return casesResponseSchema.parse({
    scope,
    metric: q.metric,
    generatedAt: new Date().toISOString(),
    national,
    states: stateEntries,
  });
}
