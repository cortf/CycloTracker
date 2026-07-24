import { describe, expect, it } from "vitest";
import { normalizeAcs1, yearFromUrl } from "../sources/census-acs1.normalize";

const URL_2024 = "https://api.census.gov/data/2024/acs/acs1?get=NAME,B01001_001E&for=state:*";

describe("yearFromUrl", () => {
  it("extracts the vintage year", () => {
    expect(yearFromUrl(URL_2024)).toBe(2024);
    expect(yearFromUrl("https://api.census.gov/data/2022/acs/acs1?x")).toBe(2022);
    expect(yearFromUrl("https://example.com/no-year")).toBeNull();
  });
});

describe("normalizeAcs1", () => {
  const body = JSON.stringify([
    ["NAME", "B01001_001E", "state"],
    ["Alabama", "5157699", "01"],
    ["California", "39431263", "06"],
    ["Nowhereland", "123", "99"], // FIPS not in seed -> skipped + warned
    ["Broken", "not-a-number", "08"], // non-numeric -> skipped + warned
  ]);
  const { records, warnings, skipped } = normalizeAcs1(body, URL_2024);

  it("maps valid state rows with the URL's year", () => {
    expect(records).toContainEqual({ stateFips: "01", year: 2024, population: 5157699 });
    expect(records).toContainEqual({ stateFips: "06", year: 2024, population: 39431263 });
  });
  it("skips (and warns about) unseeded FIPS and non-numeric population — never guesses", () => {
    expect(records).toHaveLength(2);
    expect(skipped).toBe(2);
    expect(warnings.join(" ")).toMatch(/99/);
    expect(warnings.join(" ")).toMatch(/Non-numeric/);
  });
  it("handles an empty/malformed body gracefully", () => {
    expect(normalizeAcs1("[]", URL_2024).records).toHaveLength(0);
  });
});
