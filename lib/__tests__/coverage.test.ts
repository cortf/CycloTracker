import { describe, expect, it } from "vitest";
import { summarizeWindow, type ReconciledPoint } from "../coverage";

const p = (caseCount: number | null, status: ReconciledPoint["status"]): ReconciledPoint => ({ caseCount, status });

describe("summarizeWindow", () => {
  it("has-data when any week reports > 0", () => {
    expect(summarizeWindow([p(0, "zero"), p(4, "reported"), p(1, "reported")], 13)).toEqual({ total: 5, weeksWithData: 3, weeksInWindow: 13, classification: "has-data" });
  });

  it("zero when weeks report but sum to 0 (a real no-cases)", () => {
    expect(summarizeWindow([p(0, "zero"), p(0, "zero")], 13)).toMatchObject({ total: 0, weeksWithData: 2, classification: "zero" });
  });

  it("no-data when there are no usable weeks (never counts missing as 0)", () => {
    expect(summarizeWindow([p(null, "missing"), p(null, "not_notifiable")], 13)).toMatchObject({ total: 0, weeksWithData: 0, classification: "no-data" });
  });

  it("counts only usable weeks; missing weeks are gaps, not zeros", () => {
    const s = summarizeWindow([p(3, "reported"), p(null, "missing"), p(2, "reported")], 13);
    expect(s).toMatchObject({ total: 5, weeksWithData: 2, classification: "has-data" });
  });

  it("empty window is no-data", () => {
    expect(summarizeWindow([], 13).classification).toBe("no-data");
  });
});
