# RepoPilot Roadmap Worker

A standalone Cloudflare Worker that generates the AI executive summary for a
RepoPilot scan using Workers AI. The main Next.js app calls it over HTTPS; if it
is unset, slow, or fails, the app falls back to a deterministic template roadmap,
so a scan never fails because AI is unavailable.

## Endpoint

`POST /` — body:

```json
{
  "repoName": "owner/name",
  "scores": { "overall": 72, "activity": 68, "quality": 65, "security": 70 },
  "findings": [
    { "category": "security", "severity": "critical", "title": "...", "description": "...", "recommendation": "..." }
  ]
}
```

Returns a roadmap JSON (`executiveSummary`, `topRisks`, `quickWins`,
`longTermPlan`, `firstPullRequest`, `estimatedImpact`), or a non-2xx status if AI
is unavailable (the caller then uses its template fallback).

If `SHARED_SECRET` is configured, requests must send
`Authorization: Bearer <SHARED_SECRET>`.

## Deploy

```bash
cd cloudflare/roadmap-worker
npm install
npx wrangler login
npx wrangler secret put SHARED_SECRET   # optional but recommended
npm run deploy
```

Then set these in the Vercel project environment (Settings → Environment
Variables):

- `CLOUDFLARE_AI_URL` — the deployed Worker URL (e.g. `https://repopilot-roadmap-worker.<subdomain>.workers.dev`)
- `CLOUDFLARE_AI_SECRET` — the same value you set for `SHARED_SECRET`

If `CLOUDFLARE_AI_URL` is left unset, RepoPilot uses the built-in template
roadmap and works without any AI provider.

## Local development

```bash
npm install
npm run dev   # wrangler dev — Workers AI calls require a logged-in account
```

The Workers AI binding (`AI`) is declared in `wrangler.toml`. The model used is
`@cf/meta/llama-3.1-8b-instruct`; adjust in `src/index.ts` as needed.
