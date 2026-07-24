import { describe, expect, it } from "vitest";
import { casesQuerySchema, fipsParamSchema } from "../schemas";

describe("casesQuerySchema", () => {
  it("defaults metric to count and leaves year optional", () => {
    expect(casesQuerySchema.parse({})).toEqual({ metric: "count" });
  });
  it("coerces a numeric year string", () => {
    expect(casesQuerySchema.parse({ year: "2025" })).toEqual({ year: 2025, metric: "count" });
  });
  it("accepts metric=rate", () => {
    expect(casesQuerySchema.parse({ metric: "rate" }).metric).toBe("rate");
  });
  it("rejects out-of-range years and bad metrics", () => {
    expect(casesQuerySchema.safeParse({ year: "1800" }).success).toBe(false);
    expect(casesQuerySchema.safeParse({ year: "notayear" }).success).toBe(false);
    expect(casesQuerySchema.safeParse({ metric: "bogus" }).success).toBe(false);
  });
});

describe("fipsParamSchema", () => {
  it("accepts exactly two digits", () => {
    expect(fipsParamSchema.parse("39")).toBe("39");
  });
  it("rejects non-two-digit codes", () => {
    for (const bad of ["9", "399", "abc", ""]) expect(fipsParamSchema.safeParse(bad).success).toBe(false);
  });
});
