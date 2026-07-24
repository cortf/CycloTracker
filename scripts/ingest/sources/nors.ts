/** Adapter: CDC NORS (5xkq-dg7x) -> outbreak_records (context, not case counts). */
import { cachedFetch } from "../http";
import { upsertOutbreaks } from "../persist";
import type { Adapter, OutbreakInput, RawFetch } from "../types";
import { normalizeNors } from "./nors.normalize";

const RESOURCE = "https://data.cdc.gov/resource/5xkq-dg7x.json";

function buildUrl(): string {
  const params: Record<string, string> = {
    $select:
      "year,month,state,primary_mode,etiology,etiology_status,setting," +
      "illnesses,hospitalizations,deaths,food_vehicle,food_contaminated_ingredient,ifsac_category",
    $where: "upper(etiology) like '%CYCLOSPORA%'",
    $order: "year desc",
    $limit: "5000",
  };
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `${RESOURCE}?${qs}`;
}

export const nors: Adapter<OutbreakInput> = {
  key: "nors",
  targetTable: "outbreak_records",
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
  normalize: normalizeNors,
  persist: upsertOutbreaks,
};
