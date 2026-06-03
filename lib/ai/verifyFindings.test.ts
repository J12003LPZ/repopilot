import { describe, it, expect } from "vitest";
import { verifyFindings, normalizeCitedPath } from "@/lib/ai/verifyFindings";
import type { Finding } from "@/lib/types";
import type { EvidenceFile } from "@/lib/ai/evidencePack";

const included: EvidenceFile[] = [
  { path: "lib/db.ts", startLine: 10, endLine: 40 },
  { path: "app/api/scan/route.ts", startLine: 1, endLine: 25 },
];

function aiFinding(citation: unknown, over: Partial<Finding> = {}): Finding {
  return {
    category: "security",
    severity: "high",
    title: "Issue",
    description: "x",
    recommendation: "y",
    metadata: { origin: "ai", citation },
    ...over,
  };
}

describe("normalizeCitedPath", () => {
  it("lowercases and strips a leading ./", () => {
    expect(normalizeCitedPath("./Lib/DB.ts")).toBe("lib/db.ts");
  });

  it("strips a leading repo-name prefix segment", () => {
    expect(normalizeCitedPath("repopilot-main/lib/db.ts")).toBe("lib/db.ts");
  });

  it("leaves an already-clean repo-relative path unchanged", () => {
    expect(normalizeCitedPath("lib/db.ts")).toBe("lib/db.ts");
  });
});

describe("verifyFindings", () => {
  it("keeps a finding whose cited range overlaps the sent range", () => {
    const { verified, droppedCount } = verifyFindings(
      [aiFinding({ file: "lib/db.ts", startLine: 20, endLine: 22 })],
      included
    );
    expect(verified).toHaveLength(1);
    expect(droppedCount).toBe(0);
  });

  it("keeps a finding that overlaps at the boundary", () => {
    const { verified } = verifyFindings(
      [aiFinding({ file: "lib/db.ts", startLine: 40, endLine: 55 })],
      included
    );
    expect(verified).toHaveLength(1);
  });

  it("drops a finding whose range is entirely outside the sent range", () => {
    const { verified, droppedCount } = verifyFindings(
      [aiFinding({ file: "lib/db.ts", startLine: 100, endLine: 120 })],
      included
    );
    expect(verified).toHaveLength(0);
    expect(droppedCount).toBe(1);
  });

  it("drops a fabricated file not present in evidence", () => {
    const { verified, droppedCount } = verifyFindings(
      [aiFinding({ file: "lib/ghost.ts", startLine: 1, endLine: 5 })],
      included
    );
    expect(verified).toHaveLength(0);
    expect(droppedCount).toBe(1);
  });

  it("drops a finding with an inverted range", () => {
    const { verified } = verifyFindings(
      [aiFinding({ file: "lib/db.ts", startLine: 30, endLine: 12 })],
      included
    );
    expect(verified).toHaveLength(0);
  });

  it("drops a finding with a zero/negative startLine", () => {
    const { verified } = verifyFindings(
      [aiFinding({ file: "lib/db.ts", startLine: 0, endLine: 5 })],
      included
    );
    expect(verified).toHaveLength(0);
  });

  it("drops a finding whose metadata.citation is missing", () => {
    const f: Finding = {
      category: "quality",
      severity: "low",
      title: "No citation",
      description: "x",
      recommendation: "y",
      metadata: { origin: "ai" },
    };
    const { verified, droppedCount } = verifyFindings([f], included);
    expect(verified).toHaveLength(0);
    expect(droppedCount).toBe(1);
  });

  it("drops a finding whose citation has non-numeric lines", () => {
    const { verified } = verifyFindings(
      [aiFinding({ file: "lib/db.ts", startLine: "20", endLine: "22" })],
      included
    );
    expect(verified).toHaveLength(0);
  });

  it("resolves a citation by unique basename when the path differs", () => {
    const { verified } = verifyFindings(
      [aiFinding({ file: "some/wrong/dir/db.ts", startLine: 20, endLine: 22 })],
      included
    );
    expect(verified).toHaveLength(1);
  });

  it("does NOT resolve an ambiguous basename matching multiple files", () => {
    const ambiguous: EvidenceFile[] = [
      { path: "a/util.ts", startLine: 1, endLine: 50 },
      { path: "b/util.ts", startLine: 1, endLine: 50 },
    ];
    const { verified } = verifyFindings(
      [aiFinding({ file: "util.ts", startLine: 5, endLine: 8 })],
      ambiguous
    );
    expect(verified).toHaveLength(0);
  });

  it("returns empty for empty input", () => {
    expect(verifyFindings([], included)).toEqual({ verified: [], droppedCount: 0 });
  });

  it("preserves the original finding object for kept findings", () => {
    const f = aiFinding({ file: "lib/db.ts", startLine: 20, endLine: 22 }, { title: "Keep me" });
    const { verified } = verifyFindings([f], included);
    expect(verified[0].title).toBe("Keep me");
    expect(verified[0].metadata?.origin).toBe("ai");
  });
});
