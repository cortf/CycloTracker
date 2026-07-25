"use client";

import { useMemo, useState } from "react";
import { fmtCount } from "../lib/format";
import { casesKey } from "../lib/map-types";
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
  /** Every metric × period view, precomputed at build time (keyed by casesKey). */
  dataByKey: Record<string, CasesData>;
  years: number[];
  sources: ProvenanceSource[];
  lastUpdated: string | null;
}

export function MapExplorer({
  geo,
  dataByKey,
  years,
  sources,
  lastUpdated,
}: Props) {
  const [metric, setMetric] = useState<Metric>("count");
  const [year, setYear] = useState<number | null>(null); // null = last 3 months
  const [active, setActive] = useState<ActiveAnchor | null>(null);

  // Every view is precomputed at build time, so switching metric/period is an
  // instant local lookup — no fetch, no server, nothing to bill under load.
  const data =
    dataByKey[casesKey(metric, year)] ?? dataByKey[casesKey("count", null)]!;

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

      <p className="summary" aria-live="polite">
        <strong>{fmtCount(data.national.total)}</strong> cases, {scopeLabel}
        {" · "}
        <span className="chip">{data.national.statesWithData} reporting</span>
        {" · "}
        <span className="chip">{data.national.statesZero} zero</span>
        {" · "}
        <span className="chip">{data.national.statesNoData} no data</span>
      </p>

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
