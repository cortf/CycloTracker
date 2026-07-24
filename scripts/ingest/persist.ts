/**
 * persist.ts — DB side of ingestion. Append-only raw storage + idempotent
 * upserts into the normalized tables (re-running never duplicates rows).
 */
import { createHash } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client";
import {
  caseRecords,
  outbreakRecords,
  rawIngests,
  sources,
  statePopulation,
} from "../../db/schema";
import type { CaseRecordInput, OutbreakInput, PopulationInput, RawFetch } from "./types";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function getSourceByKey(key: string) {
  return db.select().from(sources).where(eq(sources.key, key)).get();
}

export function enabledSourceKeys(): string[] {
  return db
    .select({ key: sources.key })
    .from(sources)
    .where(eq(sources.enabled, true))
    .all()
    .map((r) => r.key);
}

/**
 * Append raw payload to raw_ingests. Idempotent: if the source's most recent
 * payload is byte-identical, reuse it instead of appending a duplicate.
 */
export function recordRawIngest(
  sourceId: number,
  f: RawFetch,
): { ingestId: number; reused: boolean } {
  const hash = sha256(f.body);
  // Reuse if we've ever stored this exact payload for this source (handles
  // multi-request sources and re-runs without appending duplicates).
  const existing = db
    .select({ id: rawIngests.id })
    .from(rawIngests)
    .where(and(eq(rawIngests.sourceId, sourceId), eq(rawIngests.contentHash, hash)))
    .orderBy(desc(rawIngests.id))
    .limit(1)
    .get();
  if (existing) return { ingestId: existing.id, reused: true };

  const inserted = db
    .insert(rawIngests)
    .values({
      sourceId,
      fetchedAt: f.fetchedAt,
      requestUrl: f.requestUrl,
      httpStatus: f.httpStatus,
      contentHash: hash,
      rowCount: f.rowCount,
      payload: f.body,
    })
    .returning({ id: rawIngests.id })
    .get();
  return { ingestId: inserted.id, reused: false };
}

/**
 * Latest stored raw payload per distinct request URL — powers re-normalization
 * without fetching. Multi-request sources (e.g. Census, one URL per year) get
 * every URL's most recent payload.
 */
export function latestRawIngests(sourceId: number) {
  const rows = db
    .select({ id: rawIngests.id, payload: rawIngests.payload, requestUrl: rawIngests.requestUrl })
    .from(rawIngests)
    .where(eq(rawIngests.sourceId, sourceId))
    .orderBy(desc(rawIngests.id))
    .all();
  const byUrl = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!byUrl.has(r.requestUrl)) byUrl.set(r.requestUrl, r);
  return [...byUrl.values()];
}

export function upsertCaseRecords(
  records: CaseRecordInput[],
  ctx: { sourceId: number; ingestId: number },
): number {
  db.transaction((tx) => {
    for (const r of records) {
      tx.insert(caseRecords)
        .values({ ...r, sourceId: ctx.sourceId, ingestId: ctx.ingestId })
        .onConflictDoUpdate({
          target: [
            caseRecords.sourceId,
            caseRecords.stateFips,
            caseRecords.year,
            caseRecords.week,
            caseRecords.countType,
          ],
          set: {
            caseCount: r.caseCount,
            flag: r.flag,
            status: r.status,
            confidence: r.confidence,
            stateName: r.stateName,
            ingestId: ctx.ingestId,
            createdAt: sql`CURRENT_TIMESTAMP`,
          },
        })
        .run();
    }
  });
  return records.length;
}

export function upsertPopulation(
  records: PopulationInput[],
  ctx: { sourceId: number; ingestId: number },
): number {
  db.transaction((tx) => {
    for (const r of records) {
      tx.insert(statePopulation)
        .values({ ...r, sourceId: ctx.sourceId })
        .onConflictDoUpdate({
          target: [statePopulation.stateFips, statePopulation.year, statePopulation.sourceId],
          set: { population: r.population },
        })
        .run();
    }
  });
  return records.length;
}

export function upsertOutbreaks(
  records: OutbreakInput[],
  ctx: { sourceId: number; ingestId: number },
): number {
  db.transaction((tx) => {
    for (const r of records) {
      tx.insert(outbreakRecords)
        .values({ ...r, sourceId: ctx.sourceId, ingestId: ctx.ingestId })
        .onConflictDoUpdate({
          target: outbreakRecords.dedupeKey,
          set: {
            stateFips: r.stateFips,
            stateName: r.stateName,
            illnesses: r.illnesses,
            hospitalizations: r.hospitalizations,
            deaths: r.deaths,
            foodVehicle: r.foodVehicle,
            ingestId: ctx.ingestId,
          },
        })
        .run();
    }
  });
  return records.length;
}

/** Final row counts per source, for the ingest report / checkpoint. */
export function countCaseRecords(sourceId: number): number {
  return (
    db.select({ n: sql<number>`count(*)` }).from(caseRecords).where(eq(caseRecords.sourceId, sourceId)).get()
      ?.n ?? 0
  );
}
export function countPopulation(sourceId: number): number {
  return (
    db.select({ n: sql<number>`count(*)` }).from(statePopulation).where(eq(statePopulation.sourceId, sourceId)).get()
      ?.n ?? 0
  );
}
export function countOutbreaks(sourceId: number): number {
  return (
    db.select({ n: sql<number>`count(*)` }).from(outbreakRecords).where(eq(outbreakRecords.sourceId, sourceId)).get()
      ?.n ?? 0
  );
}
