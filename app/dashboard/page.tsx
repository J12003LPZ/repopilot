import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ScanForm } from "@/components/landing/ScanForm";
import { HistoryList } from "@/components/dashboard/HistoryList";

export const metadata = {
  title: "RepoPilot — Dashboard",
  description: "Analyze repositories and review your past codebase health reports.",
};

export default function DashboardPage() {
  return (
    <>
      <SiteNav />

      <main className="mx-auto w-full max-w-[1280px] flex-grow px-6 py-12">
        {/* Analyze section */}
        <section className="mb-16">
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
            Dashboard
          </h1>
          <p className="mt-2 mb-8 text-sm text-text-secondary">
            Analyze a public GitHub repository, then revisit any of your past reports below.
          </p>
          <ScanForm />
        </section>

        {/* History section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text-primary">Your reports</h2>
            <Link
              href="/demo"
              className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:text-primary-container"
            >
              View sample report
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="mb-6 font-mono text-xs text-text-muted">
            Stored in this browser only — clearing your browser data removes your history.
          </p>
          <HistoryList />
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
