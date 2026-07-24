import { NextResponse } from "next/server";
import { buildSourcesResponse } from "../../../lib/api/sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(buildSourcesResponse());
}
