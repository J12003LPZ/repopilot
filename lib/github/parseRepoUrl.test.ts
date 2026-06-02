import { describe, it, expect } from "vitest";
import { parseRepoUrl } from "@/lib/github/parseRepoUrl";

describe("parseRepoUrl", () => {
  it("parses a standard https github url", () => {
    expect(parseRepoUrl("https://github.com/vercel/next.js")).toEqual({
      owner: "vercel",
      name: "next.js",
    });
  });

  it("strips a trailing slash", () => {
    expect(parseRepoUrl("https://github.com/vercel/next.js/")).toEqual({
      owner: "vercel",
      name: "next.js",
    });
  });

  it("strips a .git suffix", () => {
    expect(parseRepoUrl("https://github.com/vercel/next.js.git")).toEqual({
      owner: "vercel",
      name: "next.js",
    });
  });

  it("ignores extra path segments like /tree/main", () => {
    expect(
      parseRepoUrl("https://github.com/vercel/next.js/tree/main/packages")
    ).toEqual({ owner: "vercel", name: "next.js" });
  });

  it("accepts www.github.com", () => {
    expect(parseRepoUrl("https://www.github.com/a/b")).toEqual({
      owner: "a",
      name: "b",
    });
  });

  it("returns null for non-github hosts", () => {
    expect(parseRepoUrl("https://gitlab.com/a/b")).toBeNull();
  });

  it("returns null for github.com without owner/repo", () => {
    expect(parseRepoUrl("https://github.com/vercel")).toBeNull();
  });

  it("returns null for garbage", () => {
    expect(parseRepoUrl("not a url")).toBeNull();
  });
});
