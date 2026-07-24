import { describe, expect, it } from "vitest";
import { norsDedupeKey, normalizeNors } from "../sources/nors.normalize";

describe("norsDedupeKey", () => {
  it("is stable for identical input and differs when a salient field changes", () => {
    const row = { year: "2023", month: "2", state: "Texas", etiology: "Cyclospora cayetanensis", setting: "deli", illnesses: "110", food_vehicle: "basil" };
    expect(norsDedupeKey(row)).toBe(norsDedupeKey({ ...row }));
    expect(norsDedupeKey({ ...row, illnesses: "111" })).not.toBe(norsDedupeKey(row));
  });
});

describe("normalizeNors", () => {
  const body = JSON.stringify([
    { year: "2023", month: "2", state: "Texas", etiology: "Cyclospora cayetanensis", etiology_status: "Confirmed", illnesses: "110", hospitalizations: "9", food_vehicle: "basil" },
    { year: "2022", month: "7", state: "Multistate", etiology: "Cyclospora cayetanensis", illnesses: "50" },
    { year: "2021", state: "California", etiology: "Norovirus Genogroup I" }, // wrong etiology -> skipped
    { year: "2023", month: "2", state: "Texas", etiology: "Cyclospora cayetanensis", etiology_status: "Confirmed", illnesses: "110", hospitalizations: "9", food_vehicle: "basil" }, // exact dup -> skipped
  ]);
  const { records, warnings, skipped } = normalizeNors(body);

  it("maps cyclospora rows and resolves state to FIPS", () => {
    const tx = records.find((r) => r.stateName === "Texas")!;
    expect(tx).toMatchObject({ stateFips: "48", year: 2023, month: 2, illnesses: 110, hospitalizations: 9 });
  });
  it("keeps Multistate with null FIPS (never dropped, never guessed)", () => {
    const ms = records.find((r) => r.stateName === "Multistate")!;
    expect(ms.stateFips).toBeNull();
    expect(warnings.join(" ")).toContain("Multistate");
  });
  it("skips non-cyclospora rows and in-payload duplicates", () => {
    expect(records).toHaveLength(2);
    expect(skipped).toBe(2); // wrong etiology + exact duplicate
  });
});
