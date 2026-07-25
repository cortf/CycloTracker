"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fmtCount } from "../lib/format";
import type { CasesData, StateEntry, StateGeo } from "../lib/map-types";
import { makeRadiusScale, niceLegendValues } from "../lib/map-utils";
import { DataTable } from "./DataTable";
import { Dropdown, type DropdownOption } from "./Dropdown";
import { Legend } from "./Legend";
import {
  ProportionalSymbolMap,
  type ActiveAnchor,
} from "./ProportionalSymbolMap";
import { ProvenanceFooter, type ProvenanceSource } from "./ProvenanceFooter";
import { Tooltip } from "./Tooltip";

type Metric = "count" | "rate";

interface Props {
  geo: StateGeo[];
  initialData: CasesData;
  years: number[];
  sources: ProvenanceSource[];
  lastUpdated: string | null;
}

export function MapExplorer({
  geo,
  initialData,
  years,
  sources,
  lastUpdated,
}: Props) {
  const [metric, setMetric] = useState<Metric>("count");
  const [year, setYear] = useState<number | null>(null); // null = last 3 months
  const [data, setData] = useState<CasesData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    fetch(`/api/cases?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: CasesData) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled)
          setError("Couldn’t load that view — showing the last result.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [metric, year]);

  const periodOptions = useMemo<DropdownOption[]>(
    () => [
      { value: "", label: "Last 3 months" },
      ...years
        .slice()
        .sort((a, b) => b - a)
        .map((y) => ({ value: String(y), label: String(y) })),
    ],
    [years],
  );

  const byFips = useMemo(() => {
    const m = new Map<string, StateEntry>();
    for (const s of data.states) m.set(s.fips, s);
    return m;
  }, [data]);

  const { radius, legendValues } = useMemo(() => {
    const max = Math.max(0, ...data.states.map((s) => s.value ?? 0));
    const scale = makeRadiusScale(max);
    return {
      radius: (v: number) => scale(v),
      legendValues: niceLegendValues(max),
    };
  }, [data]);

  const activeEntry = active ? (byFips.get(active.fips) ?? null) : null;
  const metricLabel = metric === "rate" ? "Cases per 100k" : "Cases";
  const scopeLabel =
    data.scope.kind === "year"
      ? `${data.scope.year}`
      : `last ${data.scope.window?.weeks ?? 13} weeks (${data.scope.window?.from}–${data.scope.window?.to})`;
  const tableCaption = `Reported Cyclospora cases by state, ${scopeLabel}. ${metric === "rate" ? "Rate is per 100,000 population." : ""}`;

  return (
    <div className="app">
      <div className="app-head">
        <div className="brand">
          <img
            className="brand-mark"
            src="/logo.svg"
            alt=""
            width={52}
            height={52}
          />
          <h1>CycloTracker</h1>
        </div>
        <a className="method-link" href="/methodology">
          Methodology
        </a>
      </div>
      <p className="lede">
        Reported <i>Cyclospora cayetanensis</i> infections by U.S. state. Circle
        area is proportional to the value; hatched states have no data.
      </p>

      <div className="controls">
        <div className="control-group">
          <label id="period-label">Period</label>
          <Dropdown
            labelId="period-label"
            value={year === null ? "" : String(year)}
            options={periodOptions}
            onChange={(v) => setYear(v === "" ? null : Number(v))}
          />
        </div>
        <div className="control-group">
          <label id="metric-label">Metric</label>
          <div className="seg" role="group" aria-labelledby="metric-label">
            <button
              type="button"
              aria-pressed={metric === "count"}
              onClick={() => setMetric("count")}
            >
              Count
            </button>
            <button
              type="button"
              aria-pressed={metric === "rate"}
              onClick={() => setMetric("rate")}
            >
              Per 100k
            </button>
          </div>
        </div>
      </div>

      <p className="summary" data-loading={loading} aria-live="polite">
        <strong>{fmtCount(data.national.total)}</strong> cases, {scopeLabel}
        {" · "}
        <span className="chip">{data.national.statesWithData} reporting</span>
        {" · "}
        <span className="chip">{data.national.statesZero} zero</span>
        {" · "}
        <span className="chip">{data.national.statesNoData} no data</span>
        {loading && <span className="updating"> · updating…</span>}
      </p>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}

      <figure className="map-figure">
        <ProportionalSymbolMap
          geo={geo}
          byFips={byFips}
          radius={radius}
          activeFips={active?.fips ?? null}
          onActivate={setActive}
        />
        <Legend
          radius={radius}
          values={legendValues}
          metricLabel={metricLabel}
          rateMetric={metric === "rate"}
        />
      </figure>

      {activeEntry && active && (
        <Tooltip entry={activeEntry} anchor={active.rect} />
      )}

      <details className="table-details">
        <summary>Show data table ({data.states.length} states)</summary>
        <DataTable states={data.states} caption={tableCaption} />
      </details>

      <ProvenanceFooter sources={sources} lastUpdated={lastUpdated} />
    </div>
  );
}
