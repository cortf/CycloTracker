/**
 * schemas.ts — zod schemas for the API. Inputs are validated (query/params);
 * outputs are parsed before returning so a malformed payload fails loudly here
 * rather than silently shipping bad data. Response TS types are inferred from
 * these schemas, so the handler signatures and the contract can't drift.
 */
import { z } from "zod";

// ---- Inputs ----
export const casesQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  metric: z.enum(["count", "rate"]).default("count"),
});
export type CasesQuery = z.infer<typeof casesQuerySchema>;

export const fipsParamSchema = z.string().regex(/^\d{2}$/, "fips must be a 2-digit code");

// ---- Shared ----
export const classificationSchema = z.enum(["has-data", "zero", "no-data"]);
export const statusSchema = z.enum(["reported", "zero", "missing", "not_notifiable"]);

// ---- GET /api/cases ----
export const stateValueSchema = z.object({
  fips: z.string(),
  name: z.string(),
  usps: z.string(),
  count: z.number(),
  rate: z.number().nullable(),
  value: z.number().nullable(), // count or rate per active metric; null when no-data
  classification: classificationSchema,
  weeksWithData: z.number().nullable(),
  sources: z.array(z.string()),
});
export const casesResponseSchema = z.object({
  scope: z.object({
    kind: z.enum(["window", "year"]),
    label: z.string(),
    year: z.number().optional(),
    window: z.object({ from: z.string(), to: z.string(), weeks: z.number() }).optional(),
  }),
  metric: z.enum(["count", "rate"]),
  generatedAt: z.string(),
  national: z.object({
    total: z.number(),
    statesWithData: z.number(),
    statesZero: z.number(),
    statesNoData: z.number(),
  }),
  states: z.array(stateValueSchema),
});
export type CasesResponse = z.infer<typeof casesResponseSchema>;

// ---- GET /api/states/[fips] ----
export const stateDetailSchema = z.object({
  state: z.object({
    fips: z.string(),
    name: z.string(),
    usps: z.string(),
    type: z.string(),
    isMappable: z.boolean(),
  }),
  window: z.object({
    total: z.number(),
    weeksWithData: z.number(),
    weeksInWindow: z.number(),
    classification: classificationSchema,
    label: z.string(),
  }),
  weekly: z.array(
    z.object({
      year: z.number(),
      week: z.number(),
      count: z.number().nullable(),
      status: statusSchema,
      source: z.string().nullable(),
    }),
  ),
  perYear: z.array(
    z.object({ year: z.number(), total: z.number().nullable(), classification: classificationSchema }),
  ),
  population: z.array(z.object({ year: z.number(), population: z.number() })),
  outbreaks: z.array(
    z.object({
      year: z.number(),
      month: z.number().nullable(),
      etiologyStatus: z.string().nullable(),
      setting: z.string().nullable(),
      illnesses: z.number().nullable(),
      hospitalizations: z.number().nullable(),
      deaths: z.number().nullable(),
      foodVehicle: z.string().nullable(),
    }),
  ),
  sources: z.array(z.string()),
});
export type StateDetail = z.infer<typeof stateDetailSchema>;

// ---- GET /api/sources ----
export const sourcesResponseSchema = z.object({
  generatedAt: z.string(),
  sources: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      url: z.string().nullable(),
      category: z.string(),
      license: z.string().nullable(),
      updateCadence: z.string().nullable(),
      precedence: z.number(),
      enabled: z.boolean(),
      records: z.number(),
      lastFetchedAt: z.string().nullable(),
      notes: z.string().nullable(),
    }),
  ),
});
export type SourcesResponse = z.infer<typeof sourcesResponseSchema>;
