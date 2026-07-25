"use client";

import { fmtCount } from "../lib/format";

export interface ProvenanceSource {
  key: string;
  name: string;
  url: string | null;
  license: string | null;
  updateCadence: string | null;
  records: number;
  lastFetchedAt: string | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Per-source attribution + "last updated" — every number is traceable here. */
export function ProvenanceFooter({
  sources,
  lastUpdated,
}: {
  sources: ProvenanceSource[];
  lastUpdated: string | null;
}) {
  return (
    <footer className="provenance">
      <div className="provenance-head">
        <span>
          Data last updated <strong>{fmtDate(lastUpdated)}</strong>
        </span>
        <a href="/methodology">Methodology &amp; caveats →</a>
      </div>
      <div className="table-scroll">
        <table className="provenance-table">
          <caption className="sr-only">
            Data sources and last fetch times
          </caption>
          <thead>
            <tr>
              <th scope="col">Source</th>
              <th scope="col">Records</th>
              <th scope="col">Cadence</th>
              <th scope="col">Last fetched</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.key}>
                <th scope="row">
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.name}
                    </a>
                  ) : (
                    s.name
                  )}
                  {s.license ? (
                    <span className="lic"> · {s.license}</span>
                  ) : null}
                </th>
                <td className="num">{fmtCount(s.records)}</td>
                <td>{s.updateCadence ?? "—"}</td>
                <td>{fmtDate(s.lastFetchedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="provenance-note">
        Counts are provisional NNDSS weekly case reports and are revised in
        later weeks. Missing is missing — no value is imputed. See the
        methodology page for comparability caveats.
      </p>
    </footer>
  );
}
