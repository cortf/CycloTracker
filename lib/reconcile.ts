/**
 * reconcile.ts — resolve overlapping sources for a single data point. Pure, no DB.
 *
 * Precedence order (from the `sources.precedence` column; higher wins):
 *   state DOH (100) > NNDSS annual (80) > NNDSS weekly (60) > ...
 * Currently only nndss-weekly is enabled, so there is nothing to reconcile in
 * practice — but the layer is generic and tested so adding a state source later
 * "just works" and any disagreement is surfaced, never silently averaged.
 *
 * Rules:
 *  - Only sources with a usable number (status "reported" or "zero") can win.
 *    "missing"/"not_notifiable" never contribute a value (we never impute).
 *  - Among those, the highest precedence wins. Ties break toward the LARGER count
 *    (never hide cases), then source key for determinism.
 *  - If contributors disagree on the number, `conflict` is set so the coverage
 *    report can flag it. If no source has a usable value, the point is "missing".
 */

export type Status = "reported" | "zero" | "missing" | "not_notifiable";

export interface Candidate {
  sourceKey: string;
  precedence: number;
  caseCount: number | null;
  status: Status;
}

export interface Reconciled {
  caseCount: number | null;
  status: Status;
  sourceKey: string | null;
  conflict: boolean;
  contributors: string[];
}

export function reconcilePoint(candidates: Candidate[]): Reconciled {
  const usable = candidates.filter((c) => c.status === "reported" || c.status === "zero");

  if (usable.length === 0) {
    const allNotNotifiable =
      candidates.length > 0 && candidates.every((c) => c.status === "not_notifiable");
    return {
      caseCount: null,
      status: allNotNotifiable ? "not_notifiable" : "missing",
      sourceKey: null,
      conflict: false,
      contributors: [],
    };
  }

  const winner = usable
    .slice()
    .sort(
      (a, b) =>
        b.precedence - a.precedence ||
        (b.caseCount ?? 0) - (a.caseCount ?? 0) ||
        a.sourceKey.localeCompare(b.sourceKey),
    )[0]!;

  const conflict = usable.some((c) => c.caseCount !== winner.caseCount);
  return {
    caseCount: winner.caseCount,
    status: winner.status,
    sourceKey: winner.sourceKey,
    conflict,
    contributors: usable.map((c) => c.sourceKey),
  };
}
