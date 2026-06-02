import { after } from "next/server";
import { createScanSchema } from "@/lib/validators/scanSchema";
import { parseRepoUrl } from "@/lib/github/parseRepoUrl";
import { evaluateRateLimit } from "@/lib/utils/rateLimit";
import { hashIp } from "@/lib/utils/hashIp";
import { generatePublicId, generateScanToken } from "@/lib/utils/generateIds";
import {
  countRecentScansByIp,
  insertRepository,
  insertScan,
} from "@/lib/db/queries";
import { runScan } from "@/lib/scanners/runScan";

function getIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createScanSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const repo = parseRepoUrl(parsed.data.githubUrl);
  if (!repo) {
    return Response.json({ error: "Invalid GitHub URL" }, { status: 400 });
  }

  const ipHash = await hashIp(getIp(req));
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { recent, active } = await countRecentScansByIp(ipHash, oneHourAgo);
  const limit = evaluateRateLimit({ recentScanCount: recent, activeScanCount: active });
  if (!limit.allowed) {
    const message =
      limit.reason === "active_limit"
        ? "You already have a scan running. Please wait for it to finish."
        : "Hourly scan limit reached. Please try again later.";
    return Response.json({ error: message }, { status: 429 });
  }

  const repositoryId = await insertRepository({
    owner: repo.owner,
    name: repo.name,
    url: `https://github.com/${repo.owner}/${repo.name}`,
  });

  const publicId = generatePublicId();
  const scanToken = generateScanToken();
  const expiresAt = new Date(Date.now() + 30 * 86400000);

  const scanId = await insertScan({
    repositoryId,
    deployedUrl: parsed.data.deployedUrl,
    publicId,
    scanToken,
    ipHash,
    userAgent: req.headers.get("user-agent") ?? "",
    expiresAt,
  });

  // Run the pipeline in the background after the response is sent.
  after(async () => {
    try {
      await runScan({ scanId, owner: repo.owner, name: repo.name });
    } catch {
      // runScan persists its own failure state.
    }
  });

  return Response.json({ scanId, publicId, scanToken }, { status: 201 });
}
