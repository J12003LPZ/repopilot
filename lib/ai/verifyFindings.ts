import type { Finding } from "@/lib/types";
import type { EvidenceFile } from "@/lib/ai/evidencePack";

export type VerifyResult = {
  verified: Finding[];
  /** How many AI findings were discarded for an unverifiable citation. */
  droppedCount: number;
};

type Citation = { file: string; startLine: number; endLine: number };

/**
 * Mechanically verifies each AI finding's cited location against the code we
 * actually sent (`includedFiles`). A finding is kept ONLY if its citation:
 *   - exists and is well-formed (`metadata.citation = {file, startLine, endLine}`),
 *   - names a file we sent (exact normalized path, or a UNIQUE basename match),
 *   - has a valid range (startLine >= 1, endLine >= startLine), and
 *   - overlaps the line range we included for that file (interval overlap).
 *
 * Everything else is dropped — a finding pointing at the wrong place is worse
 * than no finding. Pure function: no I/O, never throws on bad data.
 */
export function verifyFindings(
  aiFindings: Finding[],
  includedFiles: EvidenceFile[]
): VerifyResult {
  // Index by exact normalized path, and by basename (to detect uniqueness).
  const byPath = new Map<string, EvidenceFile>();
  const byBasename = new Map<string, EvidenceFile[]>();
  for (const f of includedFiles) {
    const norm = normalizeCitedPath(f.path);
    byPath.set(norm, f);
    const base = basename(norm);
    const list = byBasename.get(base) ?? [];
    list.push(f);
    byBasename.set(base, list);
  }

  const verified: Finding[] = [];
  let droppedCount = 0;

  for (const finding of aiFindings) {
    const citation = readCitation(finding);
    if (!citation) {
      droppedCount++;
      continue;
    }
    if (citation.startLine < 1 || citation.endLine < citation.startLine) {
      droppedCount++;
      continue;
    }
    const target = resolveFile(citation.file, byPath, byBasename);
    if (!target) {
      droppedCount++;
      continue;
    }
    // Interval overlap: [a1,a2] overlaps [b1,b2] iff a1 <= b2 && a2 >= b1.
    const overlaps =
      citation.startLine <= target.endLine && citation.endLine >= target.startLine;
    if (!overlaps) {
      droppedCount++;
      continue;
    }
    verified.push(finding);
  }

  return { verified, droppedCount };
}

function readCitation(finding: Finding): Citation | null {
  const raw = finding.metadata?.citation;
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (
    typeof c.file !== "string" ||
    c.file.trim().length === 0 ||
    typeof c.startLine !== "number" ||
    typeof c.endLine !== "number" ||
    !Number.isFinite(c.startLine) ||
    !Number.isFinite(c.endLine)
  ) {
    return null;
  }
  return { file: c.file, startLine: c.startLine, endLine: c.endLine };
}

function resolveFile(
  citedFile: string,
  byPath: Map<string, EvidenceFile>,
  byBasename: Map<string, EvidenceFile[]>
): EvidenceFile | null {
  const norm = normalizeCitedPath(citedFile);
  const exact = byPath.get(norm);
  if (exact) return exact;
  const matches = byBasename.get(basename(norm));
  // Accept a basename match ONLY if it is unique.
  if (matches && matches.length === 1) return matches[0];
  return null;
}

function basename(p: string): string {
  return p.split("/").pop() ?? p;
}

/**
 * Normalizes a model-cited path toward our repo-relative, lowercased convention:
 * strips a leading "./", strips a single leading repo-name prefix segment if the
 * path has more than one segment, and lowercases. Tolerates the model's path
 * sloppiness without accepting fabricated locations (verified separately).
 */
export function normalizeCitedPath(path: string): string {
  let p = path.trim().replace(/\\/g, "/");
  if (p.startsWith("./")) p = p.slice(2);
  p = p.replace(/^\/+/, "");
  // Heuristic repo-prefix strip: GitHub tarballs prefix every path with
  // "<repo>-<ref>/". We strip the first segment only when more segments remain.
  const segments = p.split("/");
  if (segments.length > 1 && /-/.test(segments[0])) {
    p = segments.slice(1).join("/");
  }
  return p.toLowerCase();
}
