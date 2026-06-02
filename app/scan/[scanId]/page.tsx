"use client";

import { use } from "react";
import { useScanPolling } from "@/lib/useScanPolling";
import { AnalyzingScreen } from "@/components/dashboard/AnalyzingScreen";
import { ScanDashboard } from "@/components/dashboard/ScanDashboard";
import { SiteNav } from "@/components/layout/SiteNav";

export default function ScanPage({
  params,
}: {
  params: Promise<{ scanId: string }>;
}) {
  const { scanId } = use(params);
  const { data, error } = useScanPolling(scanId);

  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-[1280px] flex-grow px-4 py-8">
        {error && <p className="text-danger">{error}</p>}
        {!error && (!data || data.scan.status === "queued" || data.scan.status === "running") && (
          <AnalyzingScreen status={data?.scan.status ?? "queued"} />
        )}
        {!error && data && data.scan.status === "complete" && (
          <ScanDashboard data={data} />
        )}
        {!error && data && data.scan.status === "failed" && (
          <p className="text-danger">
            Scan failed: {data.scan.errorMessage ?? "unknown error"}
          </p>
        )}
      </main>
    </>
  );
}
