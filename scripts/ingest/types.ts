/** Shared ingestion types. Pure — no DB imports, safe for unit tests. */

export interface RawFetch {
  requestUrl: string;
  httpStatus: number;
  body: string;
  fetchedAt: string; // ISO 8601
  rowCount: number | null;
}

export type CountType = "weekly" | "cumulative_ytd" | "annual";
export type CaseStatus = "reported" | "zero" | "missing" | "not_notifiable";
export type Confidence = "high" | "medium" | "low";

/** A normalized case number, before source_id/ingest_id are attached at persist. */
export interface CaseRecordInput {
  stateFips: string;
  stateName: string;
  year: number;
  week: number | null;
  countType: CountType;
  caseCount: number | null; // NULL = no data (see status); never invented
  flag: string | null;
  status: CaseStatus;
  confidence: Confidence;
}

export interface PopulationInput {
  stateFips: string;
  year: number;
  population: number;
}

export interface OutbreakInput {
  dedupeKey: string;
  stateFips: string | null; // null = multistate/unknown
  stateName: string;
  year: number;
  month: number | null;
  etiology: string | null;
  etiologyStatus: string | null;
  primaryMode: string | null;
  setting: string | null;
  illnesses: number | null;
  hospitalizations: number | null;
  deaths: number | null;
  foodVehicle: string | null;
  foodContaminatedIngredient: string | null;
  ifsacCategory: string | null;
}

/** Output of a pure normalize pass. `warnings` surfaces anomalies (never silent). */
export interface NormalizeResult<T> {
  records: T[];
  warnings: string[];
  skipped: number;
}

export interface Adapter<T> {
  key: string;
  targetTable: "case_records" | "state_population" | "outbreak_records";
  fetch(): Promise<RawFetch[]>;
  normalize(body: string, requestUrl: string): NormalizeResult<T>;
  persist(records: T[], ctx: { sourceId: number; ingestId: number }): number;
}
