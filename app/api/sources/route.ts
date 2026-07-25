import { NextResponse } from "next/server";
import { buildSourcesResponse } from "../../../lib/api/sources";

// Prebuilt at build time and served from the CDN — no per-request DB reads.
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(buildSourcesResponse());
}
