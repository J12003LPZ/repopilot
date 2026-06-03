import { after } from "next/server";
import { createScanSchema } from "@/lib/validators/scanSchema";
import { parseRepoUrl } from "@/lib/github/parseRepoUrl";
import { ACTIVE_SCAN_LIMIT, HOURLY_SCAN_LIMIT } from "@/lib/utils/rateLimit";
import { hashIp } from "@/lib/utils/hashIp";
import { generatePublicId, generateScanToken } from "@/lib/utils/generateIds";
import { insertScanWithRateLimit } from "@/lib/db/queries";
import { runScan } from "@/lib/scanners/runScan";

function getIp(req: Request): string {
  const vercelForwardedFor = req.headers.get("x-vercel-forwarded-for");
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const candidate =
    vercelForwardedFor ?? (process.env.VERCEL ? forwardedFor : realIp ?? forwardedFor);
  return candidate?.split(",")[0].trim() || "0.0.0.0";
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
  const publicId = generatePublicId();
  const scanToken = generateScanToken();
  const expiresAt = new Date(Date.now() + 30 * 86400000);

  const created = await insertScanWithRateLimit({
    repository: {
      owner: repo.owner,
      name: repo.name,
      url: `https://github.com/${repo.owner}/${repo.name}`,
    },
    scan: {
      deployedUrl: parsed.data.deployedUrl,
      publicId,
      scanToken,
      ipHash,
      userAgent: req.headers.get("user-agent") ?? "",
      expiresAt,
    },
    rateLimit: {
      since: new Date(Date.now() - 3600_000),
      hourlyLimit: HOURLY_SCAN_LIMIT,
      activeLimit: ACTIVE_SCAN_LIMIT,
    },
  });
  if (!created.allowed) {
    const message =
      created.reason === "active_limit"
        ? "You already have a scan running. Please wait for it to finish."
        : "Hourly scan limit reached. Please try again later.";
    return Response.json({ error: message }, { status: 429 });
  }

  const scanId = created.scanId;

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
