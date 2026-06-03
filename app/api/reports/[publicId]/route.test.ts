import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/queries", () => ({
  getScanByPublicId: vi.fn(),
}));

import { GET } from "@/app/api/reports/[publicId]/route";
import * as queries from "@/lib/db/queries";

function ctx(publicId: string) {
  return { params: Promise.resolve({ publicId }) };
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/reports/[publicId]", () => {
  it("returns 404 when not found", async () => {
    (queries.getScanByPublicId as any).mockResolvedValue(null);
    const res = await GET(new Request("http://localhost") as any, ctx("nope") as any);
    expect(res.status).toBe(404);
  });

  it("returns 404 for incomplete scans", async () => {
    (queries.getScanByPublicId as any).mockResolvedValue({
      scan: { id: "s1", status: "running", scanToken: "SECRET", overallScore: null },
      repo: { githubOwner: "a", githubName: "b" },
      findings: [],
      repoMetrics: null,
      qualityMetrics: null,
      securityMetrics: null,
    });
    const res = await GET(new Request("http://localhost") as any, ctx("rp_abc") as any);
    expect(res.status).toBe(404);
  });

  it("returns the report without leaking private scan fields", async () => {
    (queries.getScanByPublicId as any).mockResolvedValue({
      scan: {
        id: "s1",
        status: "complete",
        scanToken: "SECRET",
        ipHash: "IP_HASH",
        userAgent: "UA",
        overallScore: 88,
      },
      repo: { githubOwner: "a", githubName: "b" },
      findings: [],
      repoMetrics: null,
      qualityMetrics: null,
      securityMetrics: null,
    });
    const res = await GET(new Request("http://localhost") as any, ctx("rp_abc") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scan.overallScore).toBe(88);
    expect(JSON.stringify(json)).not.toContain("SECRET");
    expect(JSON.stringify(json)).not.toContain("IP_HASH");
    expect(JSON.stringify(json)).not.toContain("UA");
    expect(json.scan.id).toBeUndefined();
  });
});
