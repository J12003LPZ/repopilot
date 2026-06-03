export const MAX_FILES = 2000;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type TarEntry = { path: string; size: number; content?: string };

export type ExtractResult = {
  files: string[];
  fileContents: Record<string, string>;
};

// Files whose contents we want to read for analysis.
const INTERESTING = [
  "readme.md",
  "package.json",
  "tsconfig.json",
  ".env",
  ".env.example",
  ".env.sample",
  "security.md",
];

function stripRepoPrefix(p: string): string {
  const idx = p.indexOf("/");
  return idx === -1 ? p : p.slice(idx + 1);
}

function isInteresting(relPath: string): boolean {
  const base = relPath.toLowerCase().split("/").pop() ?? "";
  return INTERESTING.includes(base);
}

export function selectInterestingFiles(entries: TarEntry[]): ExtractResult {
  const files: string[] = [];
  const fileContents: Record<string, string> = {};

  for (const entry of entries) {
    if (files.length >= MAX_FILES) break;
    const rel = stripRepoPrefix(entry.path);
    if (!rel) continue;
    files.push(rel);
    if (
      entry.content !== undefined &&
      entry.size <= MAX_FILE_BYTES &&
      isInteresting(rel)
    ) {
      fileContents[rel.toLowerCase()] = entry.content;
    }
  }

  return { files, fileContents };
}
