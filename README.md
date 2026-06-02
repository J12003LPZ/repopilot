# RepoPilot

AI-powered, no-signup codebase health dashboard for public GitHub repositories.

Paste a public GitHub repo URL and get an instant engineering-health report
covering activity, issue/PR bottlenecks, code quality, security signals, and an
AI-assisted roadmap of what to fix next — no account required.

## Live demo

- **App:** _(deploy to Vercel and add the URL here)_
- **Always-on sample report:** [`/demo`](http://localhost:3000/demo) — renders a full
  dashboard from sample data with no database or live API, so it works even if a
  live scan would be rate-limited.

## Why I built this

Most portfolio projects only show a finished app. RepoPilot is meant to show how I
think about engineering quality, maintainability, security, and developer
workflows — and to be evaluated in seconds by an employer or reviewer, with no
login in the way.

## Features

- **Repo overview** — stars, forks, watchers, language, license, size, dates,
  contributors.
- **Activity & PR bottlenecks** — commit windows (30/90d), last-commit recency,
  average/oldest issue and PR age, stale-PR detection.
- **Code quality signals** — README completeness, package.json, TypeScript, ESLint,
  Prettier, tests, CI, `.env.example`, project structure.
- **Security signals** — masked possible-secret detection, lockfile / license /
  SECURITY.md presence (secret values are never stored or shown).
- **Weighted scoring** — an overall health score plus per-category scores.
- **AI roadmap** — executive summary, top risks, quick wins, long-term plan, a
  suggested first PR, and estimated impact. The executive summary is enriched by
  Cloudflare Workers AI (called via REST), with a deterministic template fallback so
  it always produces a result.
- **Shareable employer report** — a clean, print-friendly `/report/[publicId]` page.

## Tech stack

| Area        | Choice |
|-------------|--------|
| Framework   | Next.js 16 (App Router) + React 19 + TypeScript |
| Host        | Vercel |
| Database    | Neon Postgres (`@neondatabase/serverless`) + Drizzle ORM |
| AI          | Cloudflare Workers AI (REST API) + deterministic template fallback |
| Styling     | Tailwind CSS v4 (design tokens in `app/globals.css`) |
| Charts      | Recharts |
| Forms / validation | React Hook Form + Zod |
| GitHub data | `@octokit/rest` + repo tarball static analysis |
| Tests       | Vitest |

## Architecture

```
Browser → POST /api/scans (githubUrl, deployedUrl?)
        → validate + per-IP rate-limit
        → insert repository + scan (queued); return { scanId, publicId, scanToken }
        → after(): runScan() in the background
Browser → polls GET /api/scans/[scanId] → "Analyzing" screen → dashboard
Employer → GET /report/[publicId] (read-only, no token)
```

Every scan has three identifiers: `scanId` (private dashboard), `publicId` (public
report), and a `scanToken` stored only in the creator's browser (required to rerun
or delete). Each pipeline step persists partial results, so one analyzer failing
still yields a useful report.

## How it works (scan pipeline)

1. Validate the GitHub URL and check the per-IP rate limit.
2. Fetch repo metadata, commits, issues, PRs, contributors (GitHub API).
3. Download the repo tarball and analyze it **statically** (no code execution):
   structure, package.json, README, quality signals, security signals.
4. Compute per-category and overall scores.
5. Generate the roadmap (Cloudflare AI, else template).
6. Mark the scan complete.

## Database schema

Anonymous by design: `repositories`, `scans`, `scan_findings`, `repo_metrics`,
`quality_metrics`, `security_metrics`, `scan_jobs`. Tables for `performance_metrics`
and `accessibility_results` exist but are intentionally empty — reserved for the
deferred features below so they need no later migration. Managed with Drizzle
(`db/schema.ts`, migrations in `db/migrations`).

## Scoring system

Overall score is a weighted blend. Since live performance/accessibility are
deferred, the current weighting is Activity 30% / Quality 35% / Security 25% /
Documentation 10%. Each category score is computed from concrete signals and
clamped to 0–100. See `lib/scanners/scoring.ts`.

## Security considerations

No auth means abuse protection matters:

- Only `github.com` repository URLs are accepted.
- Per-IP limits: 5 scans/hour and 1 active scan at a time (IPs are hashed, never
  stored raw).
- Tarball downloads are capped (50 MB, 2,000 files, 10 MB/file).
- Reports expire after 30 days.
- **No repository code is ever executed.**
- Possible secrets are masked before being stored or displayed.

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
#    then fill in DATABASE_URL, GITHUB_TOKEN, IP_HASH_SALT (see below)

# 3. Push the schema to your Neon database
npm run db:push

# 4. Run the dev server
npm run dev
```

Open http://localhost:3000. The `/demo` page works even without a database.

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | yes (for live scans) | Neon Postgres pooled connection string |
| `GITHUB_TOKEN` | recommended | GitHub read token (raises rate limits); server-side only |
| `IP_HASH_SALT` | recommended | Salt for hashing visitor IPs; server-side only |
| `NEXT_PUBLIC_APP_URL` | recommended | Base URL for building shareable report links |
| `CLOUDFLARE_API_KEY` | optional | Cloudflare API token with Workers AI access; unset → template roadmap |
| `CLOUDFLARE_ACCOUNT_ID` | optional | Cloudflare account ID (required alongside the API key) |
| `CLOUDFLARE_MODEL` | optional | Workers AI model override (default `@cf/meta/llama-3.1-8b-instruct`) |

## Deploy (Vercel + Neon)

1. Create a Neon Postgres database via the Vercel Marketplace (sets `DATABASE_URL`).
2. Add `GITHUB_TOKEN`, `IP_HASH_SALT`, and `NEXT_PUBLIC_APP_URL` to the Vercel
   project environment. Optionally add `CLOUDFLARE_API_KEY` / `CLOUDFLARE_ACCOUNT_ID`.
3. Apply migrations against the Neon branch: `npm run db:migrate`.
4. Deploy. The app builds and the `/demo` page renders even without a database.

To enable real AI executive summaries, set `CLOUDFLARE_API_KEY` and
`CLOUDFLARE_ACCOUNT_ID` (a Cloudflare API token with Workers AI access plus your
account ID). RepoPilot calls the Cloudflare Workers AI REST API directly — no
separate Worker to deploy. Without these, it uses the built-in template roadmap.

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm test` | Run the Vitest suite |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:generate` / `db:migrate` / `db:push` | Drizzle schema workflow |

## Challenges

- **Graceful degradation.** Partial pipeline results, an AI fallback, and an
  always-on demo were more important than any single feature — the tool keeps
  working when GitHub rate-limits, AI is down, or a repo is too large.
- **Serverless DB init.** The Neon client is constructed lazily (via a proxy) so it
  isn't created during `next build`, where `DATABASE_URL` is absent.

## Future improvements

Live performance scanning (PageSpeed Insights) and accessibility scanning
(Playwright + axe-core) — the schema and UI already reserve space for both —
plus historical scan comparison, PDF export, and richer dependency analysis.
