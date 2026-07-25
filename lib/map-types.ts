/** Shared map types — no server or heavy imports, safe for client components. */
import type { CasesResponse } from "./api/schemas";

export type CasesData = CasesResponse;
export type StateEntry = CasesResponse["states"][number];

/** One state's pre-projected geometry (Albers USA, 975×610 viewport). */
export interface StateGeo {
  fips: string;
  name: string;
  d: string; // SVG path data
  cx: number; // centroid x (label/symbol anchor)
  cy: number; // centroid y
}

export const MAP_WIDTH = 975;
export const MAP_HEIGHT = 610;

/** Stable key for a (metric, period) view. `year === null` = the default window. */
export function casesKey(metric: "count" | "rate", year: number | null): string {
  return `${metric}:${year ?? "latest"}`;
}
