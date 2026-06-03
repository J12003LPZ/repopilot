import { NextRequest } from "next/server";
import { getScanById, getScanToken, deleteScan } from "@/lib/db/queries";
import { toPrivateScanPayload } from "@/lib/db/safeScanPayload";

async function requireScanToken(req: NextRequest, id: string) {
  const token = req.headers.get("x-scan-token");
  const realToken = await getScanToken(id);
  if (!realToken) return { error: "Scan not found", status: 404 } as const;
  if (!token || token !== realToken) return { error: "Forbidden", status: 403 } as const;
  return { ok: true } as const;
}

export async function GET(req: NextRequest, ctx: RouteContext<"/api/scans/[id]">) {
  const { id } = await ctx.params;
  const auth = await requireScanToken(req, id);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }
  const payload = await getScanById(id);
  if (!payload) {
    return Response.json({ error: "Scan not found" }, { status: 404 });
  }
  return Response.json(toPrivateScanPayload(payload));
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/scans/[id]">) {
  const { id } = await ctx.params;
  const auth = await requireScanToken(req, id);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }
  await deleteScan(id);
  return Response.json({ ok: true });
}
