import { describe, it, expect } from "vitest";
import { createScanSchema } from "@/lib/validators/scanSchema";

describe("createScanSchema", () => {
  it("accepts a valid github url and no deployed url", () => {
    const parsed = createScanSchema.safeParse({
      githubUrl: "https://github.com/vercel/next.js",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts an optional deployed url", () => {
    const parsed = createScanSchema.safeParse({
      githubUrl: "https://github.com/vercel/next.js",
      deployedUrl: "https://nextjs.org",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a non-github url", () => {
    const parsed = createScanSchema.safeParse({
      githubUrl: "https://gitlab.com/a/b",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an empty github url", () => {
    const parsed = createScanSchema.safeParse({ githubUrl: "" });
    expect(parsed.success).toBe(false);
  });

  it("rejects a malformed deployed url", () => {
    const parsed = createScanSchema.safeParse({
      githubUrl: "https://github.com/a/b",
      deployedUrl: "not-a-url",
    });
    expect(parsed.success).toBe(false);
  });
});
