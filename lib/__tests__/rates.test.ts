import { describe, expect, it } from "vitest";
import { perCapitaRate, pickPopulation } from "../rates";

describe("pickPopulation", () => {
  const pop = new Map([
    [2022, 100],
    [2023, 110],
    [2024, 120],
  ]);
  it("uses the latest vintage when no year is given", () => {
    expect(pickPopulation(pop, undefined)).toBe(120);
  });
  it("uses the exact year when available", () => {
    expect(pickPopulation(pop, 2023)).toBe(110);
  });
  it("falls back to the nearest earlier vintage (e.g. 2026 -> 2024)", () => {
    expect(pickPopulation(pop, 2026)).toBe(120);
  });
  it("falls back to the earliest when the year predates all vintages", () => {
    expect(pickPopulation(pop, 2019)).toBe(100);
  });
  it("returns undefined when there is no population", () => {
    expect(pickPopulation(undefined, 2024)).toBeUndefined();
    expect(pickPopulation(new Map(), 2024)).toBeUndefined();
  });
});

describe("perCapitaRate", () => {
  it("computes cases per 100k", () => {
    expect(perCapitaRate(50, 100_000)).toBe(50);
  });
  it("is null when population is unknown (never fabricated)", () => {
    expect(perCapitaRate(50, undefined)).toBeNull();
    expect(perCapitaRate(50, 0)).toBeNull();
  });
});
