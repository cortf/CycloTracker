import { describe, expect, it } from "vitest";
import { reconcilePoint, type Candidate } from "../reconcile";

const c = (sourceKey: string, precedence: number, caseCount: number | null, status: Candidate["status"]): Candidate => ({ sourceKey, precedence, caseCount, status });

describe("reconcilePoint", () => {
  it("passes a single usable source straight through", () => {
    expect(reconcilePoint([c("nndss-weekly", 60, 5, "reported")])).toMatchObject({ caseCount: 5, status: "reported", sourceKey: "nndss-weekly", conflict: false });
  });

  it("higher precedence wins even when it disagrees, and flags the conflict", () => {
    const r = reconcilePoint([c("nndss-weekly", 60, 5, "reported"), c("tx-dshs", 100, 3, "reported")]);
    expect(r).toMatchObject({ caseCount: 3, sourceKey: "tx-dshs", conflict: true });
    expect(r.contributors.sort()).toEqual(["nndss-weekly", "tx-dshs"]);
  });

  it("ignores missing/not-notifiable sources (never imputes)", () => {
    expect(reconcilePoint([c("tx-dshs", 100, null, "missing"), c("nndss-weekly", 60, 7, "reported")])).toMatchObject({ caseCount: 7, sourceKey: "nndss-weekly", conflict: false });
  });

  it("is missing when no source has a usable value", () => {
    expect(reconcilePoint([c("a", 60, null, "missing"), c("b", 50, null, "missing")])).toMatchObject({ caseCount: null, status: "missing", sourceKey: null });
  });

  it("is not_notifiable only when all sources are not_notifiable", () => {
    expect(reconcilePoint([c("a", 60, null, "not_notifiable")])).toMatchObject({ status: "not_notifiable", caseCount: null });
  });

  it("breaks precedence ties toward the larger count (never hides cases)", () => {
    expect(reconcilePoint([c("a", 60, 2, "reported"), c("b", 60, 9, "reported")])).toMatchObject({ caseCount: 9, sourceKey: "b" });
  });

  it("treats zero as usable data (not missing)", () => {
    expect(reconcilePoint([c("nndss-weekly", 60, 0, "zero")])).toMatchObject({ caseCount: 0, status: "zero", conflict: false });
  });
});
