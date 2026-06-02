// Browser-only scan history. RepoPilot has no accounts, so "your reports" is
// whatever this browser has created — tracked in localStorage alongside each
// scan's private token. Pure list logic (merge/dedupe/sort) is split out so it
// can be unit-tested without a DOM.

export type HistoryEntry = {
  scanId: string;
  publicId: string;
  repoUrl: string;
  repoName: string;
  createdAt: string; // ISO timestamp
};

const STORAGE_KEY = "repopilot-history";
const MAX_ENTRIES = 50;

/**
 * Merge a new entry into an existing list: newest first, de-duplicated by
 * scanId (a re-added scanId moves to the front with its latest data), capped at
 * MAX_ENTRIES. Pure — no localStorage access.
 */
export function mergeHistory(
  existing: HistoryEntry[],
  entry: HistoryEntry
): HistoryEntry[] {
  const withoutDupe = existing.filter((e) => e.scanId !== entry.scanId);
  return [entry, ...withoutDupe]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_ENTRIES);
}

/** Remove an entry by scanId. Pure. */
export function removeFromHistory(
  existing: HistoryEntry[],
  scanId: string
): HistoryEntry[] {
  return existing.filter((e) => e.scanId !== scanId);
}

function safeParse(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is HistoryEntry =>
        e &&
        typeof e.scanId === "string" &&
        typeof e.publicId === "string" &&
        typeof e.repoUrl === "string" &&
        typeof e.repoName === "string" &&
        typeof e.createdAt === "string"
    );
  } catch {
    return [];
  }
}

/** Read the history list from localStorage (browser only). */
export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

/** Add an entry and persist. Returns the updated list. */
export function addHistory(entry: HistoryEntry): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  const next = mergeHistory(getHistory(), entry);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

/** Remove an entry, its stored scan token, and persist. Returns the updated list. */
export function removeHistory(scanId: string): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  const next = removeFromHistory(getHistory(), scanId);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.localStorage.removeItem(`repopilot-scan-token-${scanId}`);
  return next;
}
