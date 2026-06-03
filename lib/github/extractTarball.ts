export const MAX_FILES = 2000;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

// Cap how many file *contents* we keep for analysis (separate from MAX_FILES,
// which only bounds the path listing). Keeps prompt/evidence budgets sane.
export const MAX_CAPTURED_FILES = 60;
// Per-file cap for captured *source* contents. Configs/docs we capture whole
// (up to MAX_FILE_BYTES); source files are usually only sampled downstream, so
// keeping the whole file in memory is fine but bounded.
const MAX_CAPTURED_SOURCE_BYTES = 64 * 1024;

export type TarEntry = { path: string; size: number; content?: string };

export type ExtractResult = {
  files: string[];
  fileContents: Record<string, string>;
};

// Exact-basename files we always want to read (docs, manifests, env samples).
const INTERESTING_BASENAMES = new Set([
  "readme.md",
  "package.json",
  "tsconfig.json",
  ".env",
  ".env.example",
  ".env.sample",
  "security.md",
  "dockerfile",
  "makefile",
]);

// Config files matched by prefix/suffix rather than an exact name.
function isConfigFile(base: string): boolean {
  return (
    base.startsWith("next.config.") ||
    base.startsWith("eslint.config.") ||
    base.startsWith("vitest.config.") ||
    base.startsWith("vite.config.") ||
    base.startsWith("drizzle.config.") ||
    base.startsWith("jest.config.") ||
    base.startsWith("tailwind.config.") ||
    base.startsWith("docker-compose.") ||
    base === ".eslintrc" ||
    base.startsWith(".eslintrc.")
  );
}

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

function hasSourceExtension(base: string): boolean {
  return SOURCE_EXTENSIONS.some((ext) => base.endsWith(ext));
}

function isCiWorkflow(relPath: string): boolean {
  const p = relPath.toLowerCase();
  return (
    p.startsWith(".github/workflows/") &&
    (p.endsWith(".yml") || p.endsWith(".yaml"))
  );
}

/**
 * Priority for *which* files to keep content for when we exceed the capture
 * budget. Lower number = kept first. Entry points and config beat deep/vendor
 * source so the evidence pack is representative of how the app actually runs.
 */
export function capturePriority(relPath: string): number {
  const p = relPath.toLowerCase();
  const base = p.split("/").pop() ?? "";

  if (INTERESTING_BASENAMES.has(base)) return 0;
  if (isCiWorkflow(p)) return 1;
  if (isConfigFile(base)) return 1;

  if (!hasSourceExtension(base)) return Infinity; // not capturable source

  // App/runtime entry points first.
  if (/(^|\/)middleware\.(ts|js|mjs)$/.test(p)) return 2;
  if (/(^|\/)app\/.*\/route\.(ts|js)$/.test(p)) return 2;
  if (/(^|\/)app\/.*\/(page|layout)\.(tsx|jsx|ts|js)$/.test(p)) return 3;
  if (/(^|\/)pages\/api\//.test(p)) return 2;

  // Core library/business logic.
  if (p.startsWith("lib/") || p.startsWith("src/lib/")) return 4;
  if (p.startsWith("src/")) return 5;
  if (p.startsWith("app/") || p.startsWith("pages/")) return 5;
  if (p.startsWith("components/")) return 6;

  // Deprioritize noise that rarely helps a review and burns budget.
  if (
    p.includes("/node_modules/") ||
    p.includes("/dist/") ||
    p.includes("/build/") ||
    p.includes("/.next/") ||
    p.includes("/vendor/") ||
    p.endsWith(".min.js") ||
    p.endsWith(".d.ts") ||
    /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(p)
  ) {
    return 50;
  }

  return 20; // other source somewhere in the tree
}

/**
 * Whether we should even attempt to capture this file's content during tar
 * parsing. This is the cheap, allow-everything-capturable gate; the final
 * budget-aware selection happens in `selectInterestingFiles`.
 */
export function shouldCaptureContent(relPath: string): boolean {
  return Number.isFinite(capturePriority(relPath));
}

/** Per-file byte cap, depending on whether it's whole-file (config/doc) or sampled source. */
export function captureByteLimit(relPath: string): number {
  const base = relPath.toLowerCase().split("/").pop() ?? "";
  const wholeFile =
    INTERESTING_BASENAMES.has(base) ||
    isConfigFile(base) ||
    isCiWorkflow(relPath.toLowerCase());
  return wholeFile ? MAX_FILE_BYTES : MAX_CAPTURED_SOURCE_BYTES;
}

function stripRepoPrefix(p: string): string {
  const idx = p.indexOf("/");
  return idx === -1 ? p : p.slice(idx + 1);
}

export function selectInterestingFiles(entries: TarEntry[]): ExtractResult {
  const files: string[] = [];
  // Stage candidates (with content) and pick the best within the budget.
  const candidates: { rel: string; content: string; priority: number; size: number }[] = [];

  for (const entry of entries) {
    if (files.length >= MAX_FILES) break;
    const rel = stripRepoPrefix(entry.path);
    if (!rel) continue;
    files.push(rel);

    if (entry.content === undefined) continue;
    if (entry.size > captureByteLimit(rel)) continue;
    const priority = capturePriority(rel);
    if (!Number.isFinite(priority)) continue;
    candidates.push({ rel, content: entry.content, priority, size: entry.size });
  }

  // Keep the highest-priority files (ties: smaller first, so we fit more).
  candidates.sort((a, b) => a.priority - b.priority || a.size - b.size);

  const fileContents: Record<string, string> = {};
  for (const c of candidates.slice(0, MAX_CAPTURED_FILES)) {
    fileContents[c.rel.toLowerCase()] = c.content;
  }

  return { files, fileContents };
}
