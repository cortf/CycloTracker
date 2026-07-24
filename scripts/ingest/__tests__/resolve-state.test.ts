import { describe, expect, it } from "vitest";
import { resolveReportingArea } from "../resolve-state";

describe("resolveReportingArea", () => {
  it("maps states regardless of casing/whitespace", () => {
    expect(resolveReportingArea("Alabama")).toEqual({ kind: "state", fips: "01", canonicalName: "Alabama" });
    expect(resolveReportingArea("ALABAMA").fips).toBe("01");
    expect(resolveReportingArea("  California  ").fips).toBe("06");
  });

  it("maps DC and territories", () => {
    expect(resolveReportingArea("District of Columbia").fips).toBe("11");
    expect(resolveReportingArea("Puerto Rico").fips).toBe("72");
    expect(resolveReportingArea("U.S. Virgin Islands").fips).toBe("78");
  });

  it("applies the two real aliases", () => {
    expect(resolveReportingArea("New York City").fips).toBe("36"); // summed into NY
    expect(resolveReportingArea("NEW YORK").fips).toBe("36");
    expect(resolveReportingArea("Commonwealth of Northern Mariana Islands").fips).toBe("69");
    expect(resolveReportingArea("Northern Mariana Islands").fips).toBe("69");
  });

  it("excludes census divisions (not a state, but not unknown)", () => {
    for (const r of ["New England", "Pacific", "MIDDLE ATLANTIC", "Mountain"])
      expect(resolveReportingArea(r)).toEqual({ kind: "excluded", reason: "region" });
  });

  it("excludes national/residency aggregates", () => {
    for (const a of ["U.S. Residents", "US RESIDENTS", "Total", "U.S. Territories", "Non-U.S. Residents"])
      expect(resolveReportingArea(a)).toEqual({ kind: "excluded", reason: "aggregate" });
  });

  it("returns unknown for unrecognized areas (never a silent wrong FIPS)", () => {
    expect(resolveReportingArea("Freedonia")).toEqual({ kind: "unknown", raw: "Freedonia" });
  });
});
