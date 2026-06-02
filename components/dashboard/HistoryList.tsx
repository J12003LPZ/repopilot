"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Link2, Check, Trash2, Loader2, FolderGit2 } from "lucide-react";
import { getHistory, removeHistory, type HistoryEntry } from "@/lib/history";
import { Card } from "@/components/ui/Card";
import { ScoreBar } from "@/components/ui/Progress";

type LiveData = {
  status: "queued" | "running" | "complete" | "failed";
  overallScore: number | null;
};

function statusLabel(status: LiveData["status"]): { text: string; cls: string } {
  switch (status) {
    case "complete":
      return { text: "Complete", cls: "text-success" };
    case "running":
    case "queued":
      return { text: "Analyzing…", cls: "text-warning" };
    case "failed":
      return { text: "Failed", cls: "text-danger" };
  }
}

function HistoryRow({
  entry,
  onRemove,
}: {
  entry: HistoryEntry;
  onRemove: (scanId: string) => void;
}) {
  const [live, setLive] = useState<LiveData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/scans/${entry.scanId}`)
      .then((res) => {
        if (res.status === 404) {
          if (active) setNotFound(true);
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        if (active && data?.scan) {
          setLive({ status: data.scan.status, overallScore: data.scan.overallScore });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [entry.scanId]);

  function copyReport() {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    void navigator.clipboard.writeText(`${base}/report/${entry.publicId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const score = live?.overallScore ?? null;
  const scoreColor =
    score === null
      ? "text-text-muted"
      : score >= 80
        ? "text-success"
        : score >= 60
          ? "text-warning"
          : "text-danger";
  const label = live ? statusLabel(live.status) : null;

  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <FolderGit2 className="h-4 w-4 shrink-0 text-text-muted" />
          <span className="truncate font-medium text-text-primary">{entry.repoName}</span>
        </div>
        <p className="mt-1 font-mono text-xs text-text-muted">
          {new Date(entry.createdAt).toLocaleString()}
          {notFound && " · expired or deleted"}
          {label && !notFound && (
            <>
              {" · "}
              <span className={label.cls}>{label.text}</span>
            </>
          )}
        </p>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <div className="w-28 shrink-0">
          {score !== null ? (
            <>
              <div className={`text-right text-lg font-semibold ${scoreColor}`}>
                {score}
                <span className="text-xs font-normal text-text-muted">/100</span>
              </div>
              <ScoreBar value={score} />
            </>
          ) : (
            <div className="flex items-center justify-end gap-1 text-xs text-text-muted">
              {!notFound && <Loader2 className="h-3 w-3 animate-spin" />}
              {notFound ? "—" : "scoring"}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Link
            href={`/scan/${entry.scanId}`}
            className="rounded p-1.5 text-text-secondary hover:bg-card-hover hover:text-text-primary"
            title="Open dashboard"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
          <button
            onClick={copyReport}
            className="rounded p-1.5 text-text-secondary hover:bg-card-hover hover:text-text-primary"
            title="Copy report link"
          >
            {copied ? <Check className="h-4 w-4 text-success" /> : <Link2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onRemove(entry.scanId)}
            className="rounded p-1.5 text-text-secondary hover:bg-card-hover hover:text-danger"
            title="Remove from history"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}

export function HistoryList() {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    // localStorage is unavailable during SSR, so read it after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(getHistory());
  }, []);

  function handleRemove(scanId: string) {
    setEntries(removeHistory(scanId));
  }

  // Initial SSR/hydration state: render nothing until localStorage is read.
  if (entries === null) {
    return null;
  }

  if (entries.length === 0) {
    return (
      <Card className="text-center">
        <p className="text-sm text-text-secondary">
          No reports yet. Analyze a repository above and it will appear here.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => (
        <HistoryRow key={entry.scanId} entry={entry} onRemove={handleRemove} />
      ))}
    </div>
  );
}
