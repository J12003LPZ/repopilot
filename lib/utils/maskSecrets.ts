export type SecretHit = {
  key: string;
  masked: string;
};

const SECRET_KEY_PATTERN =
  /\b(API_KEY|SECRET|TOKEN|PRIVATE_KEY|AWS_ACCESS_KEY_ID|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|DATABASE_URL)\b\s*[:=][ \t]*(.+)/gi;

const PLACEHOLDER_VALUES = new Set([
  "xxx",
  "your-secret-here",
  "changeme",
  "todo",
  "<your-key>",
  "example",
]);

export function maskSecretValue(value: string): string {
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  if (trimmed.length <= 3) return "***";
  return `${trimmed.slice(0, 4)}***`;
}

export function findSecrets(content: string): SecretHit[] {
  const hits: SecretHit[] = [];
  const regex = new RegExp(SECRET_KEY_PATTERN);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1].toUpperCase();
    const rawValue = match[2].trim().replace(/^["']|["']$/g, "");
    if (!rawValue) continue;
    if (PLACEHOLDER_VALUES.has(rawValue.toLowerCase())) continue;
    hits.push({ key, masked: maskSecretValue(rawValue) });
  }
  return hits;
}
