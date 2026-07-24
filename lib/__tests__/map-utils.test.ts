import { describe, expect, it } from "vitest";
import { dodgeSymbols, makeRadiusScale, niceLegendValues } from "../map-utils";

describe("makeRadiusScale — AREA proportional to value (never radius)", () => {
  it("doubling area corresponds to sqrt(2)x radius, and 4x value = 2x radius", () => {
    const s = makeRadiusScale(100);
    // area ∝ value  =>  r ∝ sqrt(value)
    expect(s(100) / s(25)).toBeCloseTo(2, 5); // sqrt(100/25) = 2
    expect(s(50) / s(100)).toBeCloseTo(Math.SQRT1_2, 5);
  });
  it("value 0 maps to radius 0", () => {
    expect(makeRadiusScale(1000)(0)).toBe(0);
  });
});

describe("niceLegendValues", () => {
  it("returns up to three distinct descending nice values <= a round top", () => {
    const v = niceLegendValues(1666);
    expect(v).toEqual([...v].sort((a, b) => b - a));
    expect(new Set(v).size).toBe(v.length);
    expect(v.length).toBeLessThanOrEqual(3);
    expect(v[0]).toBeGreaterThan(0);
  });
  it("is empty when there is no positive value", () => {
    expect(niceLegendValues(0)).toEqual([]);
  });
});

describe("dodgeSymbols", () => {
  it("separates two overlapping symbols so they no longer overlap", () => {
    const out = dodgeSymbols([
      { fips: "a", name: "A", cx: 100, cy: 100, r: 20 },
      { fips: "b", name: "B", cx: 105, cy: 100, r: 20 },
    ]);
    const [a, b] = out;
    const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    expect(dist).toBeGreaterThan(a!.r + b!.r - 2); // essentially non-overlapping
    expect(out.some((n) => n.displaced)).toBe(true);
  });
  it("leaves an isolated symbol at its centroid (not displaced)", () => {
    const [n] = dodgeSymbols([{ fips: "x", name: "X", cx: 500, cy: 300, r: 10 }]);
    expect(n!.x).toBeCloseTo(500, 0);
    expect(n!.y).toBeCloseTo(300, 0);
    expect(n!.displaced).toBe(false);
  });
});
