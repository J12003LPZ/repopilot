import { NextRequest } from "next/server";
import { getScanById, getScanToken, deleteScan } from "@/lib/db/queries";

function stripToken(payload: NonNullable<Awaited<ReturnType<typeof getScanById>>>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { scanToken, ipHash, ...safeScan } = payload.scan;
  return { ...payload, scan: safeScan };
}

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/scans/[id]">) {
  const { id } = await ctx.params;
  const payload = await getScanById(id);
  if (!payload) {
    return Response.json({ error: "Scan not found" }, { status: 404 });
  }
  return Response.json(stripToken(payload));
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/scans/[id]">) {
  const { id } = await ctx.params;
  const token = req.headers.get("x-scan-token");
  const realToken = await getScanToken(id);
  if (!realToken) {
    return Response.json({ error: "Scan not found" }, { status: 404 });
  }
  if (!token || token !== realToken) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  await deleteScan(id);
  return Response.json({ ok: true });
}
