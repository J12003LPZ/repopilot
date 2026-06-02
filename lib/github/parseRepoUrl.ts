export type ParsedRepo = { owner: string; name: string };

export function parseRepoUrl(input: string): ParsedRepo | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") return null;

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const owner = segments[0];
  const name = segments[1].replace(/\.git$/, "");
  if (!owner || !name) return null;

  return { owner, name };
}
