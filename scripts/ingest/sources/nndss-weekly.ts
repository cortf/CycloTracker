/** Adapter: CDC NNDSS Weekly Data (x9gk-5huc) -> case_records. */
import { cachedFetch } from "../http";
import { upsertCaseRecords } from "../persist";
import type { Adapter, CaseRecordInput, RawFetch } from "../types";
import { normalizeNndss } from "./nndss-weekly.normalize";

const RESOURCE = "https://data.cdc.gov/resource/x9gk-5huc.json";

function buildUrl(): string {
  const params: Record<string, string> = {
    $select: "states,year,week,label,m1,m1_flag,m3,m3_flag",
    $where: "upper(label) like '%CYCLOSPOR%'",
    $order: "year,week",
    $limit: "60000", // all cyclosporiasis rows across all years in one payload
  };
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `${RESOURCE}?${qs}`;
}

export const nndssWeekly: Adapter<CaseRecordInput> = {
  key: "nndss-weekly",
  targetTable: "case_records",
  async fetch(): Promise<RawFetch[]> {
    const token = process.env.SOCRATA_APP_TOKEN;
    const res = await cachedFetch(buildUrl(), {
      headers: token ? { "X-App-Token": token } : {},
    });
    let rowCount: number | null = null;
    try {
      rowCount = (JSON.parse(res.body) as unknown[]).length;
    } catch {
      /* leave null */
    }
    return [{ ...res, rowCount }];
  },
  normalize: normalizeNndss,
  persist: upsertCaseRecords,
};
