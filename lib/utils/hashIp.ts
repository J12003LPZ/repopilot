const SALT = process.env.IP_HASH_SALT ?? "repopilot-dev-salt";

export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`${SALT}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
