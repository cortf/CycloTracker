/**
 * http.ts — disk-cached fetch for ingestion, with retries + rate-limit backoff.
 * Caches raw responses under .cache/ingest/ so dev doesn't hammer public APIs.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CACHE_DIR = join(ROOT, ".cache", "ingest");
const USER_AGENT = "CycloTracker-ingest/0.1 (+https://example.org; contact maintainer)";

export interface Fetched {
  requestUrl: string;
  httpStatus: number;
  body: string;
  fetchedAt: string; // ISO 8601
  fromCache: boolean;
}

const sha1 = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 16);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function cachedFetch(
  url: string,
  { ttlMs = 1000 * 60 * 60 * 6, retries = 3, headers = {} as Record<string, string> } = {},
): Promise<Fetched> {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, `${sha1(url + JSON.stringify(headers))}.json`);

  if (existsSync(cachePath)) {
    try {
      const c = JSON.parse(await readFile(cachePath, "utf8"));
      if (Date.now() - Date.parse(c.fetchedAt) < ttlMs)
        return { ...c, fromCache: true } as Fetched;
    } catch {
      /* refetch */
    }
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": USER_AGENT, ...headers },
        signal: AbortSignal.timeout(60_000),
      });
      // Respect rate limiting: back off and retry on 429/503.
      if ((res.status === 429 || res.status === 503) && attempt < retries) {
        const retryAfter = Number(res.headers.get("retry-after")) || 0;
        await sleep(retryAfter * 1000 || 1000 * (attempt + 1) ** 2);
        continue;
      }
      const body = await res.text();
      const out: Fetched = {
        requestUrl: url,
        httpStatus: res.status,
        body,
        fetchedAt: new Date().toISOString(),
        fromCache: false,
      };
      await writeFile(cachePath, JSON.stringify(out));
      return out;
    } catch (err) {
      lastErr = err;
      await sleep(500 * (attempt + 1) ** 2); // exponential backoff
    }
  }
  throw new Error(`fetch failed after ${retries + 1} attempts: ${url}\n${String(lastErr)}`);
}
