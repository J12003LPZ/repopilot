import { gunzipSync } from "node:zlib";
import {
  selectInterestingFiles,
  MAX_FILE_BYTES,
  type TarEntry,
  type ExtractResult,
} from "@/lib/github/extractTarball";

export const MAX_TARBALL_BYTES = 50 * 1024 * 1024;
export const MAX_DECOMPRESSED_TAR_BYTES = 100 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_CAPTURED_CONTENT_BYTES = 2 * 1024 * 1024;

const INTERESTING_BASENAMES = new Set([
  "readme.md",
  "package.json",
  "tsconfig.json",
  ".env",
  ".env.example",
  ".env.sample",
  "security.md",
]);

function isInterestingPath(path: string): boolean {
  const rel = path.includes("/") ? path.slice(path.indexOf("/") + 1) : path;
  const base = rel.toLowerCase().split("/").pop() ?? "";
  return INTERESTING_BASENAMES.has(base);
}

async function readLimitedBody(res: Response): Promise<ArrayBuffer> {
  const contentLength = res.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_TARBALL_BYTES) {
    throw new Error("Repository tarball exceeds size limit");
  }
  if (!res.body) {
    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength > MAX_TARBALL_BYTES) {
      throw new Error("Repository tarball exceeds size limit");
    }
    return arrayBuf;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_TARBALL_BYTES) {
      await reader.cancel();
      throw new Error("Repository tarball exceeds size limit");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

// Minimal POSIX tar (ustar) parser. Reads 512-byte headers; captures content
// only for files small enough and flagged as interesting downstream.
function parseTar(buffer: Buffer): TarEntry[] {
  const entries: TarEntry[] = [];
  let capturedBytes = 0;
  let offset = 0;
  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512);
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    if (!name) break; // two zero blocks => end of archive
    const sizeOctal = header.subarray(124, 136).toString("utf8").replace(/\0.*$/, "").trim();
    const size = parseInt(sizeOctal, 8) || 0;
    const typeFlag = header.subarray(156, 157).toString("utf8");
    const contentStart = offset + 512;

    if (typeFlag === "0" || typeFlag === "") {
      let content: string | undefined;
      if (
        size <= MAX_FILE_BYTES &&
        capturedBytes + size <= MAX_CAPTURED_CONTENT_BYTES &&
        isInterestingPath(name)
      ) {
        content = buffer.subarray(contentStart, contentStart + size).toString("utf8");
        capturedBytes += size;
      }
      entries.push({ path: name, size, content });
    }
    // advance: header + content rounded up to 512
    offset = contentStart + Math.ceil(size / 512) * 512;
  }
  return entries;
}

export async function downloadAndExtract(
  owner: string,
  name: string,
  ref: string
): Promise<ExtractResult> {
  const url = `https://codeload.github.com/${owner}/${name}/tar.gz/${ref}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {},
    });
    if (!res.ok) {
      throw new Error(`Tarball download failed: ${res.status}`);
    }
    const arrayBuf = await readLimitedBody(res);
    const gz = Buffer.from(arrayBuf);
    const tar = gunzipSync(gz, { maxOutputLength: MAX_DECOMPRESSED_TAR_BYTES });
    const entries = parseTar(tar);
    return selectInterestingFiles(entries);
  } finally {
    clearTimeout(timeout);
  }
}
