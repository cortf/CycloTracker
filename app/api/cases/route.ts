import { NextResponse } from "next/server";
import { buildCasesResponse } from "../../../lib/api/cases";
import { casesQuerySchema } from "../../../lib/api/schemas";

export const runtime = "nodejs"; // better-sqlite3 needs the Node runtime
export const dynamic = "force-dynamic"; // always read fresh from the DB

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = casesQuerySchema.safeParse({
    year: searchParams.get("year") ?? undefined,
    metric: searchParams.get("metric") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid query", details: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json(buildCasesResponse(parsed.data));
}
