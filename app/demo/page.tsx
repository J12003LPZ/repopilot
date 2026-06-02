import { SiteNav } from "@/components/layout/SiteNav";
import { ScanDashboard } from "@/components/dashboard/ScanDashboard";
import { demoScanPayload } from "@/lib/demo/demoScan";

export default function DemoPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-[1280px] flex-grow px-4 py-8">
        <div className="mb-6 rounded-lg border border-border bg-card p-4 text-sm text-text-secondary">
          This is a preloaded demo report with sample data — no live scan is run.
        </div>
        <ScanDashboard data={demoScanPayload} />
      </main>
    </>
  );
}
