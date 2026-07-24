/** rates.ts — per-capita rate helpers. Pure, no DB, unit-tested. */

/**
 * Choose the population for a rate denominator: the exact year if present, else
 * the nearest earlier vintage (population changes slowly), else the earliest
 * available. Returns undefined when we have no population at all.
 */
export function pickPopulation(
  popYears: Map<number, number> | undefined,
  year: number | undefined,
): number | undefined {
  if (!popYears || popYears.size === 0) return undefined;
  const yrs = [...popYears.keys()].sort((a, b) => a - b);
  if (year === undefined) return popYears.get(yrs[yrs.length - 1]!);
  if (popYears.has(year)) return popYears.get(year);
  const earlier = yrs.filter((y) => y <= year);
  return popYears.get(earlier.length ? earlier[earlier.length - 1]! : yrs[0]!);
}

/** Cases per 100k. Null when population is unknown (never fabricate a rate). */
export function perCapitaRate(count: number, population: number | undefined): number | null {
  return population ? (count / population) * 100_000 : null;
}
