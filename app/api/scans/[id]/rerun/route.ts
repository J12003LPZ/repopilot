import { NextRequest, after } from "next/server";
import {
  getScanToken,
  getScanById,
  clearScanChildData,
  updateScanStatus,
} from "@/lib/db/queries";
import { runScan } from "@/lib/scanners/runScan";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/scans/[id]">) {
  const { id } = await ctx.params;
  const token = req.headers.get("x-scan-token");
  const realToken = await getScanToken(id);
  if (!realToken) return Response.json({ error: "Scan not found" }, { status: 404 });
  if (!token || token !== realToken)
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const payload = await getScanById(id);
  if (!payload?.repo) {
    return Response.json({ error: "Scan not found" }, { status: 404 });
  }
  const owner = payload.repo.githubOwner;
  const name = payload.repo.githubName;

  await clearScanChildData(id);
  await updateScanStatus(id, "queued", {});

  after(async () => {
    try {
      await runScan({ scanId: id, owner, name });
    } catch {
      // runScan persists its own failure state.
    }
  });

  return Response.json({ ok: true, scanId: id });
}
