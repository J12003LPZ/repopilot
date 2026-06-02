import { describe, it, expect } from "vitest";
import { scanReadme } from "@/lib/scanners/readmeScanner";

describe("scanReadme", () => {
  it("returns score 0 and a finding when readme is absent", () => {
    const result = scanReadme(null);
    expect(result.score).toBe(0);
    expect(result.findings.some((f) => f.category === "documentation")).toBe(true);
  });

  it("scores a rich readme highly and emits no missing-readme finding", () => {
    const readme =
      "# Title\n".padEnd(400, "x") +
      "\n## Installation\nnpm install\n## Usage\nrun it\n## Environment\nENV vars\n## Screenshots\n![](x)\n## License\nMIT\n## Tech stack\nNext.js";
    const result = scanReadme(readme);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.findings.some((f) => f.title.toLowerCase().includes("missing readme"))).toBe(false);
  });

  it("flags a thin readme as low severity documentation finding", () => {
    const result = scanReadme("# Title");
    expect(result.score).toBeLessThan(50);
    expect(result.findings.length).toBeGreaterThan(0);
  });
});
