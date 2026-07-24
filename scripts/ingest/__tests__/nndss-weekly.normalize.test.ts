import { describe, expect, it } from "vitest";
import {
  mergeCaseComponents,
  nndssMeasure,
  normalizeNndss,
} from "../sources/nndss-weekly.normalize";
import type { CaseRecordInput } from "../types";

describe("nndssMeasure (value + flag -> count/status)", () => {
  it("uses a numeric value when present", () => {
    expect(nndssMeasure("26.0", undefined)).toMatchObject({ caseCount: 26, status: "reported" });
    expect(nndssMeasure("0", undefined)).toMatchObject({ caseCount: 0, status: "zero" });
  });
  it("treats flag '-' as a real ZERO", () => {
    expect(nndssMeasure(undefined, "-")).toEqual({ caseCount: 0, status: "zero", flag: "-" });
  });
  it("treats 'U' as MISSING (null, never 0)", () => {
    expect(nndssMeasure(undefined, "U")).toEqual({ caseCount: null, status: "missing", flag: "U" });
  });
  it("treats 'N'/'NN' as not_notifiable", () => {
    expect(nndssMeasure(undefined, "N").status).toBe("not_notifiable");
    expect(nndssMeasure(undefined, "NN").status).toBe("not_notifiable");
  });
  it("treats a blank/unknown row as MISSING (never invents 0)", () => {
    expect(nndssMeasure(undefined, undefined)).toEqual({ caseCount: null, status: "missing", flag: null });
  });
});

describe("mergeCaseComponents (NY + NYC)", () => {
  const m = (caseCount: number | null, status: any, flag: string | null = null) => ({ caseCount, status, flag });
  it("sums reported components", () => {
    expect(mergeCaseComponents([m(26, "reported"), m(44, "reported")])).toMatchObject({ caseCount: 70, status: "reported" });
  });
  it("sums only what is reported; a missing component is NOT treated as 0", () => {
    expect(mergeCaseComponents([m(null, "missing"), m(38, "reported")])).toMatchObject({ caseCount: 38, status: "reported" });
  });
  it("is zero only when all components are real zeros", () => {
    expect(mergeCaseComponents([m(0, "zero"), m(0, "zero")])).toMatchObject({ caseCount: 0, status: "zero" });
  });
  it("is missing when nothing is reported", () => {
    expect(mergeCaseComponents([m(null, "missing"), m(null, "not_notifiable")])).toMatchObject({ caseCount: null, status: "missing" });
  });
  it("preserves a single component's flag; drops flag when merging", () => {
    expect(mergeCaseComponents([m(null, "missing", "U")]).flag).toBe("U");
    expect(mergeCaseComponents([m(1, "reported", "-"), m(2, "reported", "-")]).flag).toBeNull();
  });
});

describe("normalizeNndss (end to end on a fixture)", () => {
  const fixture = JSON.stringify([
    { states: "New York", year: "2026", week: "28", label: "Cyclosporiasis", m1: "26.0", m3: "158.0" },
    { states: "New York City", year: "2026", week: "28", label: "Cyclosporiasis", m1: "44.0", m3: "484.0" },
    { states: "California", year: "2026", week: "28", label: "Cyclosporiasis", m1: "0", m1_flag: "-", m3: "12.0" },
    { states: "Pacific", year: "2026", week: "28", label: "Cyclosporiasis", m1: "5" }, // region -> skip
    { states: "U.S. Residents", year: "2026", week: "28", label: "Cyclosporiasis", m1: "999" }, // aggregate -> skip
    { states: "Freedonia", year: "2026", week: "28", label: "Cyclosporiasis", m1: "7" }, // unknown -> warn+skip
    { states: "Texas", year: "2026", week: "27", label: "Cyclosporiasis", m1_flag: "U", m3: "3.0" },
  ]);
  const { records, warnings, skipped } = normalizeNndss(fixture);
  const pick = (fips: string, ct: CaseRecordInput["countType"], week: number) =>
    records.find((r) => r.stateFips === fips && r.countType === ct && r.week === week)!;

  it("merges New York + New York City into FIPS 36", () => {
    expect(pick("36", "weekly", 28)).toMatchObject({ caseCount: 70, status: "reported" });
    expect(pick("36", "cumulative_ytd", 28)).toMatchObject({ caseCount: 642, status: "reported" });
  });
  it("emits both weekly and cumulative rows; keeps zero vs missing distinct", () => {
    expect(pick("06", "weekly", 28)).toMatchObject({ caseCount: 0, status: "zero" });
    expect(pick("48", "weekly", 27)).toMatchObject({ caseCount: null, status: "missing" });
    expect(pick("48", "cumulative_ytd", 27)).toMatchObject({ caseCount: 3, status: "reported" });
  });
  it("skips regions/aggregates/unknowns and warns on unknowns", () => {
    expect(skipped).toBe(3); // Pacific + U.S. Residents + Freedonia
    expect(warnings.join(" ")).toContain("Freedonia");
    // only NY, CA, TX produce rows (2 each)
    expect(records).toHaveLength(6);
  });
});
