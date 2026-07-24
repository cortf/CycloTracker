import { describe, expect, it } from "vitest";
import { resolveReportingArea } from "../resolve-state";

describe("resolveReportingArea", () => {
  it("maps states regardless of casing/whitespace", () => {
    expect(resolveReportingArea("Alabama")).toEqual({ kind: "state", fips: "01", canonicalName: "Alabama" });
    expect(resolveReportingArea("ALABAMA")).toMatchObject({ fips: "01" });
    expect(resolveReportingArea("  California  ")).toMatchObject({ fips: "06" });
  });

  it("maps DC and territories", () => {
    expect(resolveReportingArea("District of Columbia")).toMatchObject({ fips: "11" });
    expect(resolveReportingArea("Puerto Rico")).toMatchObject({ fips: "72" });
    expect(resolveReportingArea("U.S. Virgin Islands")).toMatchObject({ fips: "78" });
  });

  it("applies the two real aliases", () => {
    expect(resolveReportingArea("New York City")).toMatchObject({ fips: "36" }); // summed into NY
    expect(resolveReportingArea("NEW YORK")).toMatchObject({ fips: "36" });
    expect(resolveReportingArea("Commonwealth of Northern Mariana Islands")).toMatchObject({ fips: "69" });
    expect(resolveReportingArea("Northern Mariana Islands")).toMatchObject({ fips: "69" });
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
