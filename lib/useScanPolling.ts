"use client";

import { useEffect, useState } from "react";

export type ScanPayload = {
  scan: {
    id: string;
    status: "queued" | "running" | "complete" | "failed";
    overallScore: number | null;
    activityScore: number | null;
    qualityScore: number | null;
    securityScore: number | null;
    aiSummary: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roadmap: any;
    publicId: string;
    deployedUrl: string | null;
    errorMessage: string | null;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  repo: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findings: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  repoMetrics: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  qualityMetrics: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  securityMetrics: any;
};

export function useScanPolling(scanId: string) {
  const [data, setData] = useState<ScanPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/scans/${scanId}`);
        if (!res.ok) {
          if (res.status === 404) setError("Scan not found.");
          return;
        }
        const payload = (await res.json()) as ScanPayload;
        if (!active) return;
        setData(payload);
        if (payload.scan.status === "queued" || payload.scan.status === "running") {
          timer = setTimeout(poll, 2000);
        }
      } catch {
        if (active) timer = setTimeout(poll, 3000);
      }
    }
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [scanId]);

  return { data, error };
}
