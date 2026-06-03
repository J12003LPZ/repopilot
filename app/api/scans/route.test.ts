import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/queries", () => ({
  insertScanWithRateLimit: vi.fn(),
}));
vi.mock("@/lib/scanners/runScan", () => ({ runScan: vi.fn() }));

import { POST } from "@/app/api/scans/route";
import * as queries from "@/lib/db/queries";

function req(body: unknown): Request {
  return new Request("http://localhost/api/scans", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (queries.insertScanWithRateLimit as any).mockResolvedValue({
    allowed: true,
    scanId: "scan-uuid",
  });
});

describe("POST /api/scans", () => {
  it("creates a scan and returns ids + token", async () => {
    const res = await POST(req({ githubUrl: "https://github.com/vercel/next.js" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.scanId).toBe("scan-uuid");
    expect(json.publicId).toMatch(/^rp_/);
    expect(typeof json.scanToken).toBe("string");
    expect(json.scanToken.length).toBeGreaterThanOrEqual(32);
  });

  it("rejects an invalid github url with 400", async () => {
    const res = await POST(req({ githubUrl: "https://gitlab.com/a/b" }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when the hourly limit is reached", async () => {
    (queries.insertScanWithRateLimit as any).mockResolvedValue({
      allowed: false,
      reason: "hourly_limit",
    });
    const res = await POST(req({ githubUrl: "https://github.com/vercel/next.js" }));
    expect(res.status).toBe(429);
  });

  it("returns 429 when an active scan is already running", async () => {
    (queries.insertScanWithRateLimit as any).mockResolvedValue({
      allowed: false,
      reason: "active_limit",
    });
    const res = await POST(req({ githubUrl: "https://github.com/vercel/next.js" }));
    expect(res.status).toBe(429);
  });
});
