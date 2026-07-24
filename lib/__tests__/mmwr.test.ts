import { describe, expect, it } from "vitest";
import { recentWindow, windowKeySet, yearWeekKey } from "../mmwr";

describe("mmwr window helpers", () => {
  it("yearWeekKey sorts chronologically", () => {
    expect(yearWeekKey(2025, 52)).toBeLessThan(yearWeekKey(2026, 1));
  });

  it("recentWindow returns the newest n, deduped, newest first, across year boundaries", () => {
    const pairs = [
      { year: 2025, week: 51 },
      { year: 2025, week: 52 },
      { year: 2026, week: 1 },
      { year: 2026, week: 2 },
      { year: 2026, week: 2 }, // dup
    ];
    const { window, latest } = recentWindow(pairs, 3);
    expect(latest).toEqual({ year: 2026, week: 2 });
    expect(window).toEqual([
      { year: 2026, week: 2 },
      { year: 2026, week: 1 },
      { year: 2025, week: 52 },
    ]);
  });

  it("windowKeySet gives fast membership", () => {
    const set = windowKeySet([{ year: 2026, week: 1 }]);
    expect(set.has(yearWeekKey(2026, 1))).toBe(true);
    expect(set.has(yearWeekKey(2026, 2))).toBe(false);
  });

  it("handles fewer pairs than requested", () => {
    expect(recentWindow([{ year: 2026, week: 5 }], 13).window).toHaveLength(1);
  });
});
