import { NextResponse } from "next/server";
import { fipsParamSchema } from "../../../../lib/api/schemas";
import { buildStateDetail } from "../../../../lib/api/state-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ fips: string }> }) {
  const { fips } = await params;
  const parsed = fipsParamSchema.safeParse(fips);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid fips", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = buildStateDetail(parsed.data);
  if (!data) {
    return NextResponse.json({ error: `no state with fips ${parsed.data}` }, { status: 404 });
  }
  return NextResponse.json(data);
}
