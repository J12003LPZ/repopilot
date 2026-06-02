import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ScanForm } from "@/components/landing/ScanForm";

export default function AnalyzePage() {
  return (
    <>
      <SiteNav />

      <main className="flex-grow">
        <section className="mx-auto max-w-4xl px-6 pt-16 pb-24 text-center">
          <h1 className="mb-4 text-3xl font-semibold tracking-tight">
            Analyze a repository
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-sm text-text-secondary">
            Paste any public GitHub repository URL to generate a codebase health
            report. Optionally include a deployed URL for future performance checks.
          </p>
          <div className="flex justify-center">
            <ScanForm />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
