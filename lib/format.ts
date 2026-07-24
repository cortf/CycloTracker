/** format.ts — shared display formatting for the map, tooltip, table, and ARIA. */
import type { Classification } from "./coverage";

export function fmtCount(n: number): string {
  return n.toLocaleString("en-US");
}

/** Per-100k rate: em dash when unknown; 1 dp for larger, 2 dp for small. */
export function fmtRate(n: number | null): string {
  if (n === null) return "—";
  return n >= 10 ? n.toFixed(1) : n.toFixed(2);
}

const SOURCE_LABELS: Record<string, string> = {
  "nndss-weekly": "NNDSS weekly",
  "nndss-annual": "NNDSS annual",
  nors: "NORS",
  "census-acs1": "Census ACS1",
};
export function sourceLabel(key: string): string {
  return SOURCE_LABELS[key] ?? key;
}

export function classificationText(c: Classification): string {
  return c === "no-data" ? "No data" : c === "zero" ? "0 reported" : "Reporting";
}

/** Screen-reader/tooltip sentence for one state. */
export function stateAriaLabel(
  name: string,
  count: number,
  rate: number | null,
  classification: Classification,
  sources: string[],
): string {
  if (classification === "no-data") return `${name}: no data reported (not notifiable).`;
  const ratePart = rate !== null ? `, ${fmtRate(rate)} per 100,000` : "";
  const src = sources.length ? ` Source: ${sources.map(sourceLabel).join(", ")}.` : "";
  return `${name}: ${fmtCount(count)} cases${ratePart}.${src}`;
}
