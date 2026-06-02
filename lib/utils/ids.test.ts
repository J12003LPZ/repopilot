import { describe, it, expect } from "vitest";
import { generatePublicId, generateScanToken } from "@/lib/utils/generateIds";
import { hashIp } from "@/lib/utils/hashIp";

describe("generatePublicId", () => {
  it("starts with rp_ and is reasonably long", () => {
    const id = generatePublicId();
    expect(id.startsWith("rp_")).toBe(true);
    expect(id.length).toBeGreaterThanOrEqual(13);
  });

  it("is unique across calls", () => {
    const a = generatePublicId();
    const b = generatePublicId();
    expect(a).not.toBe(b);
  });
});

describe("generateScanToken", () => {
  it("is at least 32 chars", () => {
    expect(generateScanToken().length).toBeGreaterThanOrEqual(32);
  });
});

describe("hashIp", () => {
  it("is deterministic for the same ip", async () => {
    const a = await hashIp("1.2.3.4");
    const b = await hashIp("1.2.3.4");
    expect(a).toBe(b);
  });

  it("differs for different ips", async () => {
    const a = await hashIp("1.2.3.4");
    const b = await hashIp("5.6.7.8");
    expect(a).not.toBe(b);
  });

  it("does not contain the raw ip", async () => {
    const a = await hashIp("1.2.3.4");
    expect(a).not.toContain("1.2.3.4");
  });
});
