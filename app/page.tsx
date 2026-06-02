import Link from "next/link";
import {
  CheckCircle2,
  Plug,
  ListChecks,
  Shield,
  Gauge,
  Accessibility,
  Sparkles,
} from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ScanForm } from "@/components/landing/ScanForm";

export default function Home() {
  return (
    <>
      <SiteNav />

      <main className="flex-grow relative">
        {/* Hero section */}
        <section className="max-w-4xl mx-auto text-center px-6 pt-16 pb-24">
          {/* Badge pill */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-3 py-1.5 text-xs font-mono text-text-secondary">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            No signup required
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-semibold tracking-tight mb-4">
            Analyze any public GitHub repo like an{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              engineering lead.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-base text-text-secondary max-w-2xl mx-auto mb-10">
            No-signup codebase health reports covering activity, quality, security, and an AI
            roadmap.
          </p>

          {/* Scan form */}
          <div className="flex justify-center">
            <ScanForm />
          </div>

          {/* Demo link */}
          <div className="mt-6">
            <Link
              href="/demo"
              className="text-xs font-mono text-primary hover:text-primary-container transition-colors"
            >
              Try demo report →
            </Link>
          </div>
        </section>

        {/* "What RepoPilot checks" strip */}
        <section className="max-w-[1280px] mx-auto px-6 py-16">
          <p className="text-center text-xs font-mono text-text-muted tracking-widest uppercase mb-8">
            What RepoPilot Checks
          </p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <Plug className="h-4 w-4" />
              GitHub API
            </div>
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <ListChecks className="h-4 w-4" />
              Code Quality
            </div>
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <Shield className="h-4 w-4" />
              Security Signals
            </div>
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <Gauge className="h-4 w-4" />
              Core Web Vitals
            </div>
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <Accessibility className="h-4 w-4" />
              Accessibility
            </div>
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <Sparkles className="h-4 w-4" />
              AI Roadmap
            </div>
          </div>
        </section>

        {/* "How it works" section */}
        <section className="max-w-5xl mx-auto px-6 py-16 border-t border-border">
          <h2 className="text-3xl font-semibold text-center mb-12">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="flex flex-col gap-3">
              <span className="text-5xl font-semibold text-surface-bright opacity-50">01</span>
              <h3 className="text-2xl font-medium mb-1">Paste repo</h3>
              <p className="text-sm text-text-secondary">
                Drop in any public GitHub URL. No authentication or tokens required.
              </p>
            </div>
            {/* Step 2 */}
            <div className="flex flex-col gap-3">
              <span className="text-5xl font-semibold text-surface-bright opacity-50">02</span>
              <h3 className="text-2xl font-medium mb-1">Scan codebase</h3>
              <p className="text-sm text-text-secondary">
                The engine analyzes commits, issues, languages, code quality, and security signals.
              </p>
            </div>
            {/* Step 3 */}
            <div className="flex flex-col gap-3">
              <span className="text-5xl font-semibold text-surface-bright opacity-50">03</span>
              <h3 className="text-2xl font-medium mb-1">Share report</h3>
              <p className="text-sm text-text-secondary">
                Get a shareable, permanent link to a comprehensive health dashboard.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
