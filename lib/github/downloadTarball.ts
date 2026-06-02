import { gunzipSync } from "node:zlib";
import {
  selectInterestingFiles,
  MAX_FILE_BYTES,
  type TarEntry,
  type ExtractResult,
} from "@/lib/github/extractTarball";

export const MAX_TARBALL_BYTES = 50 * 1024 * 1024;

// Minimal POSIX tar (ustar) parser. Reads 512-byte headers; captures content
// only for files small enough and flagged as interesting downstream.
function parseTar(buffer: Buffer): TarEntry[] {
  const entries: TarEntry[] = [];
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
      if (size <= MAX_FILE_BYTES) {
        content = buffer.subarray(contentStart, contentStart + size).toString("utf8");
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
  const res = await fetch(url, {
    headers: process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {},
  });
  if (!res.ok) {
    throw new Error(`Tarball download failed: ${res.status}`);
  }
  const arrayBuf = await res.arrayBuffer();
  if (arrayBuf.byteLength > MAX_TARBALL_BYTES) {
    throw new Error("Repository tarball exceeds size limit");
  }
  const gz = Buffer.from(arrayBuf);
  const tar = gunzipSync(gz);
  const entries = parseTar(tar);
  return selectInterestingFiles(entries);
}
