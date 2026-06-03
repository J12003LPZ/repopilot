import type { Finding } from "@/lib/types";

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dedupeKey(f: Finding): string {
  return `${f.category}::${normalizeTitle(f.title)}`;
}

/**
 * Merges advisory AI findings into the deterministic scanner findings.
 *
 * - Scanner findings are authoritative: on a category+title overlap the scanner
 *   finding is kept and the AI duplicate is dropped.
 * - AI findings are also de-duplicated against each other.
 * - At most `maxAi` AI findings are appended, so reports stay focused.
 *
 * Scores are intentionally NOT touched here — AI output never changes a numeric
 * score; it only enriches the findings list and the roadmap narrative.
 */
export function mergeFindings(
  scannerFindings: Finding[],
  aiFindings: Finding[],
  maxAi = 8
): Finding[] {
  const seen = new Set(scannerFindings.map(dedupeKey));
  const merged = [...scannerFindings];

  let added = 0;
  for (const ai of aiFindings) {
    if (added >= maxAi) break;
    const key = dedupeKey(ai);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(ai);
    added++;
  }
  return merged;
}
