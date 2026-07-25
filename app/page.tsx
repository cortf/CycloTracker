import { buildCasesResponse } from "../lib/api/cases";
import { buildSourcesResponse } from "../lib/api/sources";
import { getStateGeo } from "../lib/geo";
import { getAvailableYears } from "../lib/queries";
import { casesKey, type CasesData } from "../lib/map-types";
import { MapExplorer } from "../components/MapExplorer";

// Fully static: the DB is a read-only weekly snapshot, so every view is
// precomputed at build time and served from the CDN. Fresh data ships via the
// weekly rebuild (see .github/workflows/refresh.yml), not per-request DB reads.
export const dynamic = "force-static";

export default function Home() {
  const geo = getStateGeo();
  const years = getAvailableYears();

  // Precompute every metric × period the UI can show, so the client switches
  // views instantly with no server round-trip.
  const dataByKey: Record<string, CasesData> = {};
  for (const metric of ["count", "rate"] as const) {
    for (const year of [null, ...years] as (number | null)[]) {
      dataByKey[casesKey(metric, year)] = buildCasesResponse(
        year === null ? { metric } : { metric, year },
      );
    }
  }

  // Provenance: enabled sources + the most recent fetch time across them.
  const enabled = buildSourcesResponse().sources.filter((s) => s.enabled);
  const lastUpdated =
    enabled
      .map((s) => s.lastFetchedAt)
      .filter((d): d is string => d !== null)
      .sort()
      .at(-1) ?? null;

  return (
    <MapExplorer
      geo={geo}
      dataByKey={dataByKey}
      years={years}
      sources={enabled}
      lastUpdated={lastUpdated}
    />
  );
}
