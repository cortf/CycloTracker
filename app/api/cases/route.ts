import { NextResponse } from "next/server";
import { buildCasesResponse } from "../../../lib/api/cases";

// The app embeds every metric×period view in the page payload, so this public
// endpoint is prebuilt as the default snapshot (count, last 3 months) and served
// from the CDN. Query-param filtering isn't available on the static deploy — see
// DEPLOY.md if you need the live, filterable API back.
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(buildCasesResponse({ metric: "count" }));
}
