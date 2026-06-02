import { describe, it, expect } from "vitest";
import { maskSecretValue, findSecrets } from "@/lib/utils/maskSecrets";

describe("maskSecretValue", () => {
  it("keeps a short prefix and masks the rest", () => {
    expect(maskSecretValue("sk-1234567890abcdef")).toBe("sk-1***");
  });

  it("fully masks very short values", () => {
    expect(maskSecretValue("ab")).toBe("***");
  });
});

describe("findSecrets", () => {
  it("detects an assigned API key and masks the value", () => {
    const results = findSecrets('OPENAI_API_KEY=sk-abcdef123456\n');
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe("OPENAI_API_KEY");
    expect(results[0].masked).toBe("sk-a***");
    expect(JSON.stringify(results)).not.toContain("sk-abcdef123456");
  });

  it("detects multiple secret patterns", () => {
    const content = [
      "AWS_ACCESS_KEY_ID=AKIA1234567890",
      "DATABASE_URL=postgres://user:pass@host/db",
      "TOKEN=ghp_aaaaaaaaaaaa",
    ].join("\n");
    const results = findSecrets(content);
    expect(results.length).toBe(3);
  });

  it("ignores empty assignments and placeholders", () => {
    const content = ["API_KEY=", "SECRET=your-secret-here", "TOKEN=xxx"].join("\n");
    const results = findSecrets(content);
    expect(results).toHaveLength(0);
  });

  it("never returns the raw secret value anywhere", () => {
    const results = findSecrets("PRIVATE_KEY=supersecretvalue123");
    for (const r of results) {
      expect(r).not.toHaveProperty("value");
      expect(JSON.stringify(r)).not.toContain("supersecretvalue123");
    }
  });
});
