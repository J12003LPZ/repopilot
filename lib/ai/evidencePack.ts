import { capturePriority } from "@/lib/github/extractTarball";

export type EvidenceFile = {
  /** repo-relative, lowercased path (matches fileContents keys). */
  path: string;
  /** 1-based first line included in the excerpt. */
  startLine: number;
  /** 1-based last line included in the excerpt. */
  endLine: number;
};

export type EvidencePack = {
  /** Prompt-ready text: file tree + overflow list + line-numbered excerpts. */
  text: string;
  /** Ground truth of exactly what was excerpted, for citation verification. */
  includedFiles: EvidenceFile[];
};

/**
 * Builds a structured, char-budgeted "evidence pack" from captured file
 * contents. The text the model reads has three sections:
 *   1. REPOSITORY FILE TREE — paths only, so structure is visible even for
 *      files whose content did not fit.
 *   2. FILES NOT EXCERPTED — captured-but-not-excerpted files as `path — role`.
 *   3. CODE EXCERPTS — per file, a `--- FILE: <path> (lines a-b) ---` header
 *      followed by line-numbered source (each line `<n>| <code>`), where the
 *      window is chosen to favor the most informative region of the file.
 *
 * Returns `includedFiles` describing exactly which line ranges were sent, so a
 * downstream verifier can mechanically check the model's citations.
 *
 * Defaults are tuned for a large-context model (Llama 4 Scout, 131K window):
 * broad coverage (~40 files) while staying well within budget (~15K tokens).
 * `fileContents` keys are repo-relative, lowercased paths.
 */
export function buildEvidencePack(
  fileContents: Record<string, string>,
  options: {
    maxFiles?: number;
    maxCharsPerFile?: number;
    maxLinesPerFile?: number;
    totalCharBudget?: number;
  } = {}
): EvidencePack {
  const {
    maxFiles = 40,
    maxCharsPerFile = 4000,
    maxLinesPerFile = 120,
    totalCharBudget = 60_000,
  } = options;

  const ranked = Object.entries(fileContents)
    .map(([path, content]) => ({ path, content, priority: capturePriority(path) }))
    .filter((f) => Number.isFinite(f.priority))
    .sort((a, b) => a.priority - b.priority || a.path.localeCompare(b.path));

  if (ranked.length === 0) return { text: "", includedFiles: [] };

  const treeSection = buildTreeSection(ranked.map((f) => f.path));

  const excerptBlocks: string[] = [];
  const includedFiles: EvidenceFile[] = [];
  const excerptedPaths = new Set<string>();

  // Reserve room for the tree section, the excerpts-section header, and the
  // "\n\n" separators joining the (up to three) sections — so the per-block
  // budget check below reflects the true assembled length and the final
  // slice() backstop never has to trim an excerpt body.
  let used = treeSection.length + EXCERPTS_HEADER.length + 8;

  for (const { path, content } of ranked) {
    if (excerptBlocks.length >= maxFiles) break;
    const win = selectWindow(content, maxLinesPerFile, maxCharsPerFile);
    if (!win) continue;
    const header = `--- FILE: ${path} (lines ${win.startLine}-${win.endLine}) ---`;
    const block = `${header}\n${win.body}`;
    if (used + block.length + 1 > totalCharBudget) {
      break; // out of budget; remaining files go to the overflow list
    }
    excerptBlocks.push(block);
    includedFiles.push({ path, startLine: win.startLine, endLine: win.endLine });
    excerptedPaths.add(path);
    used += block.length + 1;
  }

  const overflow = ranked.filter((f) => !excerptedPaths.has(f.path));
  const overflowSection = buildOverflowSection(overflow.map((f) => f.path));

  const parts: string[] = [treeSection];
  if (overflowSection) parts.push(overflowSection);
  if (excerptBlocks.length > 0) {
    parts.push(EXCERPTS_HEADER + "\n" + excerptBlocks.join("\n"));
  }

  let text = parts.join("\n\n");
  // Hard guarantee on the total budget (tree/overflow could, in pathological
  // cases, push us over): truncate the assembled text as a final backstop.
  if (text.length > totalCharBudget) {
    text = text.slice(0, totalCharBudget);
  }

  // If nothing was excerptable, return empty (no tree-only packs).
  if (excerptBlocks.length === 0) return { text: "", includedFiles: [] };

  return { text, includedFiles };
}

function buildTreeSection(paths: string[]): string {
  const lines = paths.map((p) => `  ${p}`).join("\n");
  return `REPOSITORY FILE TREE (paths only):\n${lines}`;
}

function buildOverflowSection(paths: string[]): string {
  if (paths.length === 0) return "";
  const lines = paths.map((p) => `  ${p} — ${roleFor(p)}`).join("\n");
  return `FILES NOT EXCERPTED (role only):\n${lines}`;
}

/** Human-readable role label derived from the same priority signals. */
function roleFor(path: string): string {
  const p = path.toLowerCase();
  const base = p.split("/").pop() ?? "";
  if (base === "package.json") return "package manifest";
  if (base === "readme.md") return "documentation";
  if (base === "tsconfig.json") return "typescript config";
  if (base.startsWith(".env")) return "env sample";
  if (base === "security.md") return "security policy";
  if (p.startsWith(".github/workflows/")) return "CI workflow";
  if (/\bconfig\b|\.config\./.test(base)) return "config";
  if (/route\.(ts|js)$/.test(p) || /middleware\.(ts|js|mjs)$/.test(p)) return "entry point";
  if (p.startsWith("lib/") || p.startsWith("src/lib/")) return "library";
  if (p.startsWith("components/")) return "component";
  return "source";
}

type Window = { startLine: number; endLine: number; body: string };

const EXCERPTS_HEADER = "CODE EXCERPTS (line-numbered; cite issues as path:line):";

const INTERESTING = [
  "export", "async function", "function ", "class ", "route", "handler",
  "auth", "password", "token", "secret", "apikey", "api_key",
  "exec", "eval", "fetch(", "query", "sql", "dangerouslysetinnerhtml",
  "req.", "request", "process.env", "try", "catch", "throw",
];

/**
 * Picks the most informative contiguous window of up to `maxLines` lines and
 * returns it as line-numbered text (each line `<n>│ <code>`), 1-based. Scores
 * each candidate start by the count of "interesting" tokens in its window and
 * keeps the densest; ties and empty scores fall back to the top of the file.
 * Caps the body to `maxChars` and appends a truncation note when it trimmed.
 */
export function selectWindow(
  content: string,
  maxLines: number,
  maxChars: number
): Window | null {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\t/g, "  ");
  const lines = normalized.split("\n");
  // Trim trailing blank lines so an all-whitespace file yields nothing.
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  if (lines.length === 0 || lines.every((l) => l.trim() === "")) return null;

  const total = lines.length;
  const windowLen = Math.min(maxLines, total);

  // Score every line for interesting-token density (lowercased).
  const scores = lines.map((line) => {
    const lower = line.toLowerCase();
    let s = 0;
    for (const tok of INTERESTING) if (lower.includes(tok)) s++;
    return s;
  });

  // Sliding-window sum to find the densest start; default start = 0.
  let bestStart = 0;
  let bestScore = -1;
  let windowScore = scores.slice(0, windowLen).reduce((a, b) => a + b, 0);
  if (windowScore > bestScore) {
    bestScore = windowScore;
    bestStart = 0;
  }
  for (let start = 1; start + windowLen <= total; start++) {
    windowScore += scores[start + windowLen - 1] - scores[start - 1];
    if (windowScore > bestScore) {
      bestScore = windowScore;
      bestStart = start;
    }
  }

  const endExclusive = bestStart + windowLen;
  const slice = lines.slice(bestStart, endExclusive);
  const truncatedByLines = total > windowLen;

  // Number the lines (1-based, real source numbers).
  const numbered: string[] = [];
  let chars = 0;
  let lastLine = bestStart; // 0-based index of last included line
  let truncatedByChars = false;
  for (let i = 0; i < slice.length; i++) {
    const lineNo = bestStart + i + 1; // 1-based
    const rendered = `${lineNo}│ ${slice[i]}`;
    if (chars + rendered.length + 1 > maxChars) {
      truncatedByChars = true;
      break;
    }
    numbered.push(rendered);
    chars += rendered.length + 1;
    lastLine = bestStart + i;
  }
  if (numbered.length === 0) return null;

  let body = numbered.join("\n");
  if (truncatedByLines || truncatedByChars) body += "\n… (truncated)";

  return {
    startLine: bestStart + 1,
    endLine: lastLine + 1,
    body,
  };
}
