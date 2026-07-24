import { buildCasesResponse } from "../lib/api/cases";
import { getStateGeo } from "../lib/geo";
import { getAvailableYears } from "../lib/queries";
import { MapExplorer } from "../components/MapExplorer";

// Read fresh from the DB on each request (no build-time prerender of live data).
export const dynamic = "force-dynamic";

export default function Home() {
  const geo = getStateGeo();
  const initialData = buildCasesResponse({ metric: "count" });
  const years = getAvailableYears();
  return <MapExplorer geo={geo} initialData={initialData} years={years} />;
}
