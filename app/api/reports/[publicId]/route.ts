import { NextRequest } from "next/server";
import { getScanByPublicId } from "@/lib/db/queries";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/reports/[publicId]">
) {
  const { publicId } = await ctx.params;
  const payload = await getScanByPublicId(publicId);
  if (!payload) {
    return Response.json({ error: "Report not found" }, { status: 404 });
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { scanToken, ipHash, ...safeScan } = payload.scan;
  return Response.json({ ...payload, scan: safeScan });
}
