/** Service for GET /api/states/[fips] — drill-down for one state. */
import { summarizeWindow } from "../coverage";
import { formatYearWeek, windowKeySet, yearWeekKey } from "../mmwr";
import { buildModel, windowPointsForState, yearTotal } from "../model";
import { getOutbreaksByState, getPopulationByStateYear, getStateByFips } from "../queries";
import { stateDetailSchema, type StateDetail } from "./schemas";

export function buildStateDetail(fips: string): StateDetail | null {
  const state = getStateByFips(fips);
  if (!state) return null;

  const model = buildModel();
  const winKeys = windowKeySet(model.window);
  const winPts = windowPointsForState(model.weekly, fips, winKeys);
  const summary = summarizeWindow(winPts, model.window.length);

  const weekly = (model.weekly.get(fips) ? [...model.weekly.get(fips)!.values()] : [])
    .sort((a, b) => yearWeekKey(a.year, a.week) - yearWeekKey(b.year, b.week))
    .map((p) => ({ year: p.year, week: p.week, count: p.caseCount, status: p.status, source: p.sourceKey }));

  const perYear = model.years.map((y) => {
    const { total, hasData } = yearTotal(model.cumulative, fips, y);
    return { year: y, total, classification: !hasData ? ("no-data" as const) : total === 0 ? ("zero" as const) : ("has-data" as const) };
  });

  const popMap = getPopulationByStateYear().get(fips);
  const population = popMap
    ? [...popMap.entries()].sort((a, b) => a[0] - b[0]).map(([year, pop]) => ({ year, population: pop }))
    : [];

  const outbreaks = getOutbreaksByState(fips).map((o) => ({
    year: o.year,
    month: o.month,
    etiologyStatus: o.etiologyStatus,
    setting: o.setting,
    illnesses: o.illnesses,
    hospitalizations: o.hospitalizations,
    deaths: o.deaths,
    foodVehicle: o.foodVehicle,
  }));

  const sources = [...new Set(winPts.filter((p) => p.caseCount !== null).flatMap((p) => p.contributors))];

  return stateDetailSchema.parse({
    state: { fips: state.fips, name: state.name, usps: state.usps, type: state.type, isMappable: state.isMappable },
    window: {
      total: summary.total,
      weeksWithData: summary.weeksWithData,
      weeksInWindow: summary.weeksInWindow,
      classification: summary.classification,
      label: model.window.length
        ? `${formatYearWeek(model.window[model.window.length - 1]!)} → ${model.latest ? formatYearWeek(model.latest) : ""}`
        : "no data",
    },
    weekly,
    perYear,
    population,
    outbreaks,
    sources,
  });
}
