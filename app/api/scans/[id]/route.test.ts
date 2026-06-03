import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/queries", () => ({
  getScanById: vi.fn(),
  getScanToken: vi.fn(),
  deleteScan: vi.fn(),
}));

import { GET, DELETE } from "@/app/api/scans/[id]/route";
import * as queries from "@/lib/db/queries";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/scans/[id]", () => {
  it("returns 404 for an unknown scan", async () => {
    (queries.getScanToken as any).mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/scans/x") as any, ctx("x") as any);
    expect(res.status).toBe(404);
  });

  it("rejects without a matching token", async () => {
    (queries.getScanToken as any).mockResolvedValue("right-token");
    const res = await GET(new Request("http://localhost/api/scans/s1") as any, ctx("s1") as any);
    expect(res.status).toBe(403);
    expect(queries.getScanById).not.toHaveBeenCalled();
  });

  it("returns the scan payload without the scan token", async () => {
    (queries.getScanToken as any).mockResolvedValue("right-token");
    (queries.getScanById as any).mockResolvedValue({
      scan: {
        id: "s1",
        status: "complete",
        scanToken: "SECRET",
        ipHash: "IP_HASH",
        userAgent: "UA",
        overallScore: 80,
      },
      repo: { githubOwner: "a", githubName: "b" },
      findings: [],
      repoMetrics: null,
      qualityMetrics: null,
      securityMetrics: null,
    });
    const res = await GET(
      new Request("http://localhost/api/scans/s1", {
        headers: { "x-scan-token": "right-token" },
      }) as any,
      ctx("s1") as any
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scan.status).toBe("complete");
    expect(JSON.stringify(json)).not.toContain("SECRET");
    expect(JSON.stringify(json)).not.toContain("IP_HASH");
    expect(JSON.stringify(json)).not.toContain("UA");
  });
});

describe("DELETE /api/scans/[id]", () => {
  it("rejects without a matching token", async () => {
    (queries.getScanToken as any).mockResolvedValue("right-token");
    const res = await DELETE(
      new Request("http://localhost/api/scans/s1", {
        method: "DELETE",
        headers: { "x-scan-token": "wrong" },
      }) as any,
      ctx("s1") as any
    );
    expect(res.status).toBe(403);
    expect(queries.deleteScan).not.toHaveBeenCalled();
  });

  it("deletes with a matching token", async () => {
    (queries.getScanToken as any).mockResolvedValue("right-token");
    const res = await DELETE(
      new Request("http://localhost/api/scans/s1", {
        method: "DELETE",
        headers: { "x-scan-token": "right-token" },
      }) as any,
      ctx("s1") as any
    );
    expect(res.status).toBe(200);
    expect(queries.deleteScan).toHaveBeenCalledWith("s1");
  });
});
