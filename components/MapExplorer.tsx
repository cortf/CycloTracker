"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fmtCount } from "../lib/format";
import type { CasesData, StateEntry, StateGeo } from "../lib/map-types";
import { makeRadiusScale, niceLegendValues } from "../lib/map-utils";
import { DataTable } from "./DataTable";
import { Legend } from "./Legend";
import { ProportionalSymbolMap, type ActiveAnchor } from "./ProportionalSymbolMap";
import { Tooltip } from "./Tooltip";

type Metric = "count" | "rate";

interface Props {
  geo: StateGeo[];
  initialData: CasesData;
  years: number[];
}

export function MapExplorer({ geo, initialData, years }: Props) {
  const [metric, setMetric] = useState<Metric>("count");
  const [year, setYear] = useState<number | null>(null); // null = last 3 months
  const [data, setData] = useState<CasesData>(initialData);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<ActiveAnchor | null>(null);
  const firstRender = useRef(true);

  // Refetch when the metric or year changes (initialData already covers the default).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const params = new URLSearchParams({ metric });
    if (year !== null) params.set("year", String(year));
    let cancelled = false;
    setLoading(true);
    fetch(`/api/cases?${params}`)
      .then((r) => r.json())
      .then((d: CasesData) => {
        if (!cancelled) setData(d);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [metric, year]);

  const byFips = useMemo(() => {
    const m = new Map<string, StateEntry>();
    for (const s of data.states) m.set(s.fips, s);
    return m;
  }, [data]);

  const { radius, legendValues } = useMemo(() => {
    const max = Math.max(0, ...data.states.map((s) => s.value ?? 0));
    const scale = makeRadiusScale(max);
    return { radius: (v: number) => scale(v), legendValues: niceLegendValues(max) };
  }, [data]);

  const activeEntry = active ? byFips.get(active.fips) ?? null : null;
  const metricLabel = metric === "rate" ? "Cases per 100k" : "Cases";
  const scopeLabel =
    data.scope.kind === "year" ? `${data.scope.year}` : `last ${data.scope.window?.weeks ?? 13} weeks (${data.scope.window?.from}–${data.scope.window?.to})`;
  const tableCaption = `Reported Cyclospora cases by state, ${scopeLabel}. ${metric === "rate" ? "Rate is per 100,000 population." : ""}`;

  return (
    <div className="app">
      <h1>CycloTracker</h1>
      <p className="lede">
        Reported <i>Cyclospora cayetanensis</i> infections by U.S. state. Circle area is proportional to the
        value; hatched states have no data (not the same as zero).
      </p>

      <div className="controls">
        <div className="control-group">
          <label htmlFor="year-select">Period</label>
          <select
            id="year-select"
            value={year === null ? "" : String(year)}
            onChange={(e) => setYear(e.target.value === "" ? null : Number(e.target.value))}
          >
            <option value="">Last 3 months</option>
            {years.slice().sort((a, b) => b - a).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="control-group">
          <label id="metric-label">Metric</label>
          <div className="seg" role="group" aria-labelledby="metric-label">
            <button type="button" aria-pressed={metric === "count"} onClick={() => setMetric("count")}>Count</button>
            <button type="button" aria-pressed={metric === "rate"} onClick={() => setMetric("rate")}>Per 100k</button>
          </div>
        </div>
      </div>

      <p className="summary" data-loading={loading} aria-live="polite">
        <strong>{fmtCount(data.national.total)}</strong> cases, {scopeLabel}
        {" · "}<span className="chip">{data.national.statesWithData} reporting</span>
        {" · "}<span className="chip">{data.national.statesZero} zero</span>
        {" · "}<span className="chip">{data.national.statesNoData} no data</span>
      </p>

      <figure className="map-figure">
        <ProportionalSymbolMap geo={geo} byFips={byFips} radius={radius} activeFips={active?.fips ?? null} onActivate={setActive} />
        <Legend radius={radius} values={legendValues} metricLabel={metricLabel} rateMetric={metric === "rate"} />
      </figure>

      {activeEntry && active && <Tooltip entry={activeEntry} anchor={active.rect} />}

      <details className="table-details">
        <summary>Show data table ({data.states.length} states)</summary>
        <DataTable states={data.states} caption={tableCaption} />
      </details>
    </div>
  );
}
