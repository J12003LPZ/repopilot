import { describe, it, expect } from "vitest";
import { buildEvidencePack } from "@/lib/ai/evidencePack";

describe("buildEvidencePack", () => {
  it("returns empty text and no files when there are no contents", () => {
    const pack = buildEvidencePack({});
    expect(pack.text).toBe("");
    expect(pack.includedFiles).toEqual([]);
  });

  it("labels each excerpted file with a FILE header including a line range", () => {
    const pack = buildEvidencePack({ "package.json": '{"name":"x"}' });
    expect(pack.text).toContain("--- FILE: package.json (lines 1-1) ---");
    expect(pack.text).toContain('{"name":"x"}');
  });

  it("prefixes excerpt lines with real 1-based line numbers", () => {
    const pack = buildEvidencePack({ "lib/a.ts": "const a = 1;\nconst b = 2;" });
    expect(pack.text).toContain("1│ const a = 1;");
    expect(pack.text).toContain("2│ const b = 2;");
  });

  it("records includedFiles with start/end lines matching the excerpt", () => {
    const pack = buildEvidencePack({ "lib/a.ts": "const a = 1;\nconst b = 2;" });
    expect(pack.includedFiles).toContainEqual({
      path: "lib/a.ts",
      startLine: 1,
      endLine: 2,
    });
  });

  it("emits a REPOSITORY FILE TREE section listing captured paths", () => {
    const pack = buildEvidencePack({
      "package.json": '{"name":"x"}',
      "lib/a.ts": "export const a = 1;",
    });
    expect(pack.text).toContain("REPOSITORY FILE TREE");
    expect(pack.text).toContain("package.json");
    expect(pack.text).toContain("lib/a.ts");
  });

  it("orders higher-priority files (entry points/config) before generic source", () => {
    const pack = buildEvidencePack({
      "components/widget.tsx": "export const Widget = () => null;",
      "package.json": '{"name":"x"}',
      "app/api/scan/route.ts": "export async function POST() {}",
    });
    const pkgIdx = pack.text.indexOf("--- FILE: package.json");
    const routeIdx = pack.text.indexOf("--- FILE: app/api/scan/route.ts");
    const widgetIdx = pack.text.indexOf("--- FILE: components/widget.tsx");
    expect(pkgIdx).toBeGreaterThanOrEqual(0);
    expect(pkgIdx).toBeLessThan(routeIdx);
    expect(routeIdx).toBeLessThan(widgetIdx);
  });

  it("truncates files longer than the per-file line cap and notes it", () => {
    const longContent = Array.from({ length: 200 }, (_, i) => `line ${i}`).join("\n");
    const pack = buildEvidencePack({ "lib/big.ts": longContent }, { maxLinesPerFile: 10 });
    expect(pack.text).toContain("(truncated)");
    const entry = pack.includedFiles.find((f) => f.path === "lib/big.ts");
    expect(entry).toBeDefined();
    expect(entry!.endLine - entry!.startLine + 1).toBeLessThanOrEqual(10);
  });

  it("prefers a denser (interesting) window over the file header", () => {
    const dull = Array.from({ length: 40 }, () => "const x = 0;").join("\n");
    const interesting = [
      "export async function handler(req) {",
      "  const token = process.env.SECRET;",
      "  return fetch(token);",
      "}",
    ].join("\n");
    const pack = buildEvidencePack(
      { "lib/h.ts": `${dull}\n${interesting}` },
      { maxLinesPerFile: 10 }
    );
    expect(pack.text).toContain("export async function handler");
    const entry = pack.includedFiles.find((f) => f.path === "lib/h.ts")!;
    expect(entry.startLine).toBeGreaterThan(1);
  });

  it("respects the total character budget across files", () => {
    const contents: Record<string, string> = {};
    for (let i = 0; i < 20; i++) contents[`lib/file${i}.ts`] = "x".repeat(1000);
    const pack = buildEvidencePack(contents, { totalCharBudget: 2500, maxFiles: 20 });
    expect(pack.text.length).toBeLessThanOrEqual(2500);
  });

  it("skips files that have no extractable content", () => {
    const pack = buildEvidencePack({ "lib/empty.ts": "   \n  \n" });
    expect(pack.text).toBe("");
    expect(pack.includedFiles).toEqual([]);
  });

  it("lists files that were captured but not excerpted under FILES NOT EXCERPTED", () => {
    const contents = {
      "lib/a.ts": "export const a = 1;\n".repeat(20),
      "lib/b.ts": "export const b = 2;\n".repeat(20),
    };
    const pack = buildEvidencePack(contents, { maxFiles: 1 });
    expect(pack.text).toContain("FILES NOT EXCERPTED");
    expect(pack.includedFiles).toHaveLength(1);
  });
});
