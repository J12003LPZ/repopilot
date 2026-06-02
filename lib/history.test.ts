import { describe, it, expect } from "vitest";
import { mergeHistory, removeFromHistory, type HistoryEntry } from "@/lib/history";

function entry(scanId: string, createdAt: string): HistoryEntry {
  return {
    scanId,
    publicId: `rp_${scanId}`,
    repoUrl: `https://github.com/acme/${scanId}`,
    repoName: `acme/${scanId}`,
    createdAt,
  };
}

describe("mergeHistory", () => {
  it("adds a new entry to the front", () => {
    const result = mergeHistory([entry("a", "2026-01-01T00:00:00Z")], entry("b", "2026-02-01T00:00:00Z"));
    expect(result.map((e) => e.scanId)).toEqual(["b", "a"]);
  });

  it("de-duplicates by scanId, keeping the newest data at the front", () => {
    const existing = [entry("a", "2026-01-01T00:00:00Z")];
    const updated = { ...entry("a", "2026-03-01T00:00:00Z"), repoName: "acme/renamed" };
    const result = mergeHistory(existing, updated);
    expect(result).toHaveLength(1);
    expect(result[0].repoName).toBe("acme/renamed");
  });

  it("sorts newest first by createdAt", () => {
    let list: HistoryEntry[] = [];
    list = mergeHistory(list, entry("old", "2026-01-01T00:00:00Z"));
    list = mergeHistory(list, entry("new", "2026-05-01T00:00:00Z"));
    list = mergeHistory(list, entry("mid", "2026-03-01T00:00:00Z"));
    expect(list.map((e) => e.scanId)).toEqual(["new", "mid", "old"]);
  });

  it("caps the list at 50 entries", () => {
    let list: HistoryEntry[] = [];
    for (let i = 0; i < 60; i++) {
      const ts = new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString();
      list = mergeHistory(list, entry(`s${i}`, ts));
    }
    expect(list.length).toBe(50);
  });
});

describe("removeFromHistory", () => {
  it("removes the matching scanId", () => {
    const existing = [entry("a", "2026-01-01T00:00:00Z"), entry("b", "2026-02-01T00:00:00Z")];
    const result = removeFromHistory(existing, "a");
    expect(result.map((e) => e.scanId)).toEqual(["b"]);
  });

  it("is a no-op when the scanId is not present", () => {
    const existing = [entry("a", "2026-01-01T00:00:00Z")];
    expect(removeFromHistory(existing, "zzz")).toHaveLength(1);
  });
});
