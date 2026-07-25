"use client";

import {
  classificationText,
  fmtCount,
  fmtRate,
  sourceLabel,
} from "../lib/format";
import type { StateEntry } from "../lib/map-types";

/** Screen-reader / no-JS accessible equivalent of the map. Sorted by count. */
export function DataTable({
  states,
  caption,
}: {
  states: StateEntry[];
  caption: string;
}) {
  const rows = [...states].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">State</th>
            <th scope="col" style={{ textAlign: "right" }}>
              Cases
            </th>
            <th scope="col" style={{ textAlign: "right" }}>
              Per 100k
            </th>
            <th scope="col">Status</th>
            <th scope="col">Sources</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const noData = s.classification === "no-data";
            return (
              <tr key={s.fips}>
                <th scope="row">
                  {s.name} ({s.usps})
                </th>
                <td className="num">{noData ? "—" : fmtCount(s.count)}</td>
                <td className="num">{fmtRate(s.rate)}</td>
                <td className={noData ? "cls-no-data" : undefined}>
                  {classificationText(s.classification)}
                </td>
                <td>{s.sources.map(sourceLabel).join(", ") || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
