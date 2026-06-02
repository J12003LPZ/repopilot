import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata = {
  title: "RepoPilot — Case Study",
  description:
    "The engineering thinking behind RepoPilot: a no-auth codebase health dashboard.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-xl font-semibold text-text-primary">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-text-secondary">
        {children}
      </div>
    </section>
  );
}

export default function CaseStudyPage() {
  return (
    <>
      <SiteNav />

      <main className="flex-grow">
        <article className="mx-auto max-w-3xl px-6 py-12">
          <p className="text-xs font-mono uppercase tracking-widest text-text-muted">
            Case Study
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">
            Building RepoPilot
          </h1>
          <p className="mt-3 text-base text-text-secondary">
            A no-signup, AI-assisted codebase health dashboard for public GitHub
            repositories — and the engineering decisions behind it.
          </p>

          <Section title="Problem">
            <p>
              Most portfolio projects only show a finished app. They rarely show how
              the author reasons about engineering quality, maintainability, security,
              or developer workflows. Reviewers are left to infer judgment from the
              surface.
            </p>
          </Section>

          <Section title="Goal">
            <p>
              Build a tool that an employer, recruiter, or technical reviewer can open
              and use in seconds — paste a public GitHub repo URL and instantly get a
              professional engineering-health report covering activity, issue/PR
              bottlenecks, code quality, security signals, and a prioritized roadmap of
              what to fix next.
            </p>
          </Section>

          <Section title="Why no auth">
            <p>
              I intentionally designed RepoPilot without required user accounts because
              the target user is often an employer, recruiter, or reviewer who wants to
              test the project quickly. Removing authentication lowers friction and makes
              the tool easier to evaluate during a portfolio review.
            </p>
            <p>
              To stay safe without accounts, every scan carries three identifiers: a
              public dashboard id, a public report id, and a private{" "}
              <code className="font-mono text-text-primary">scanToken</code> stored only
              in the creator&apos;s browser. Anyone can view a report; only the original
              visitor can rerun or delete a scan.
            </p>
          </Section>

          <Section title="System architecture">
            <p>
              A Next.js App Router application on Vercel, with Neon Postgres for scan
              data and a Cloudflare Worker for the AI roadmap. Creating a scan inserts a
              queued record and runs a background pipeline; the dashboard polls until the
              scan is complete. Each pipeline step persists partial results, so a failure
              in one analyzer still yields a useful report.
            </p>
          </Section>

          <Section title="Database design">
            <p>
              The schema is fully anonymous: repositories, scans, findings, and
              per-category metric tables, managed with Drizzle migrations. Tables for
              performance and accessibility metrics exist but are intentionally empty —
              reserved so those deferred features need no migration later.
            </p>
          </Section>

          <Section title="GitHub API integration">
            <p>
              Repository metadata, commits, issues, pull requests, and contributors come
              from the GitHub REST API via Octokit. The pull-request endpoint is used
              directly, and the issues endpoint is filtered to exclude PRs. All calls are
              server-side with a token to respect rate limits.
            </p>
          </Section>

          <Section title="Static analysis strategy">
            <p>
              Rather than executing untrusted repository code, RepoPilot downloads the
              repo tarball and analyzes it statically: file structure, package.json,
              README completeness, TypeScript/ESLint/test/CI signals, and secret
              patterns. Downloads are capped by size and file count to bound work and
              cost.
            </p>
          </Section>

          <Section title="Security tradeoffs">
            <p>
              Without auth, abuse protection matters: github.com-only URL validation,
              per-IP hourly and concurrency rate limits (IPs are hashed, never stored
              raw), bounded tarball size, expiring reports, and — critically — no
              execution of repository code. Possible secrets are always masked before
              being stored or displayed; raw values never leave the scanner.
            </p>
          </Section>

          <Section title="AI roadmap design">
            <p>
              The roadmap is structured and explainable, not magical. A deterministic
              template generator ranks findings into top risks and quick wins, builds a
              long-term plan, and suggests a first pull request. A Cloudflare Worker can
              enrich the executive summary with an LLM — and if it is slow or
              unavailable, the template result is used as a guaranteed fallback, so a scan
              never fails because AI is down.
            </p>
          </Section>

          <Section title="What I learned">
            <p>
              Designing for graceful degradation — partial pipeline results, an AI
              fallback, and an always-on demo — mattered more than any single feature.
              The most valuable engineering signal a tool can send is that it keeps
              working when something goes wrong.
            </p>
          </Section>

          <Section title="Future improvements">
            <p>
              Planned next steps include live performance scanning via PageSpeed Insights
              and accessibility scanning with Playwright + axe-core (the schema and UI
              already reserve space for both), historical scan comparison, PDF export, and
              richer dependency analysis.
            </p>
          </Section>
        </article>
      </main>

      <SiteFooter />
    </>
  );
}
