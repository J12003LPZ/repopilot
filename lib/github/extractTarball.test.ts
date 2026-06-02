import { describe, it, expect } from "vitest";
import { selectInterestingFiles, MAX_FILES } from "@/lib/github/extractTarball";

describe("selectInterestingFiles", () => {
  it("strips the leading repo directory from tar paths", () => {
    const result = selectInterestingFiles([
      { path: "vercel-next.js-abc123/README.md", size: 100 },
      { path: "vercel-next.js-abc123/src/index.ts", size: 50 },
    ]);
    expect(result.files).toContain("README.md");
    expect(result.files).toContain("src/index.ts");
  });

  it("captures contents only for small, interesting files", () => {
    const result = selectInterestingFiles([
      { path: "repo-x/.env", size: 20, content: "API_KEY=sk-123" },
      { path: "repo-x/package.json", size: 30, content: '{"name":"x"}' },
      { path: "repo-x/huge.bin", size: 99_000_000, content: "x" },
    ]);
    expect(result.fileContents[".env"]).toContain("API_KEY");
    expect(result.fileContents["package.json"]).toContain("name");
    expect(result.fileContents["huge.bin"]).toBeUndefined();
  });

  it("caps the number of files scanned", () => {
    const entries = Array.from({ length: MAX_FILES + 50 }, (_, i) => ({
      path: `repo-x/file${i}.ts`,
      size: 10,
    }));
    const result = selectInterestingFiles(entries);
    expect(result.files.length).toBeLessThanOrEqual(MAX_FILES);
  });
});
