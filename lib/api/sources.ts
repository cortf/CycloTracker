/** Service for GET /api/sources — the source registry + provenance. */
import { getSourceProvenance } from "../queries";
import { sourcesResponseSchema, type SourcesResponse } from "./schemas";

export function buildSourcesResponse(): SourcesResponse {
  const rows = getSourceProvenance();
  return sourcesResponseSchema.parse({
    generatedAt: new Date().toISOString(),
    sources: rows.map((s) => ({
      key: s.key,
      name: s.name,
      url: s.url,
      category: s.category,
      license: s.license,
      updateCadence: s.updateCadence,
      precedence: s.precedence,
      enabled: s.enabled,
      records: s.records,
      lastFetchedAt: s.lastFetchedAt,
      notes: s.notes,
    })),
  });
}
