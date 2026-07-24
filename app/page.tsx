import { buildCasesResponse } from "../lib/api/cases";
import { buildSourcesResponse } from "../lib/api/sources";
import { getStateGeo } from "../lib/geo";
import { getAvailableYears } from "../lib/queries";
import { MapExplorer } from "../components/MapExplorer";

// Read fresh from the DB on each request (no build-time prerender of live data).
export const dynamic = "force-dynamic";

export default function Home() {
  const geo = getStateGeo();
  const initialData = buildCasesResponse({ metric: "count" });
  const years = getAvailableYears();

  // Provenance: enabled sources + the most recent fetch time across them.
  const enabled = buildSourcesResponse().sources.filter((s) => s.enabled);
  const lastUpdated =
    enabled
      .map((s) => s.lastFetchedAt)
      .filter((d): d is string => d !== null)
      .sort()
      .at(-1) ?? null;

  return <MapExplorer geo={geo} initialData={initialData} years={years} sources={enabled} lastUpdated={lastUpdated} />;
}
