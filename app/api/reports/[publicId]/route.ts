import { NextRequest } from "next/server";
import { getScanByPublicId } from "@/lib/db/queries";
import { toPublicReportPayload } from "@/lib/db/safeScanPayload";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/reports/[publicId]">
) {
  const { publicId } = await ctx.params;
  const payload = await getScanByPublicId(publicId);
  if (!payload || payload.scan.status !== "complete") {
    return Response.json({ error: "Report not found" }, { status: 404 });
  }
  return Response.json(toPublicReportPayload(payload));
}
