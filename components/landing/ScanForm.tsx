"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Code, Globe, ArrowRight, Loader2 } from "lucide-react";
import { createScanSchema, type CreateScanInput } from "@/lib/validators/scanSchema";
import { Button } from "@/components/ui/Button";

export function ScanForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateScanInput>({ resolver: zodResolver(createScanSchema) });

  async function onSubmit(values: CreateScanInput) {
    setServerError(null);
    const res = await fetch("/api/scans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setServerError(data.error ?? "Something went wrong. Please try again.");
      return;
    }
    const { scanId, scanToken } = await res.json();
    localStorage.setItem(`repopilot-scan-token-${scanId}`, scanToken);
    router.push(`/scan/${scanId}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-3xl">
      <div className="rounded-xl border border-border bg-card p-2 shadow-2xl sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-grow flex-col gap-2 rounded-lg border border-border bg-surface p-1 focus-within:border-primary/50 sm:flex-row">
            <div className="relative flex flex-grow items-center px-2 py-1">
              <Code className="pointer-events-none absolute left-2 h-4 w-4 text-text-muted" />
              <input
                {...register("githubUrl")}
                placeholder="https://github.com/vercel/next.js"
                className="w-full bg-transparent py-1 pl-7 text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
            </div>
            <div className="hidden w-px bg-border sm:block" />
            <div className="relative flex flex-grow items-center px-2 py-1">
              <Globe className="pointer-events-none absolute left-2 h-4 w-4 text-text-muted" />
              <input
                {...register("deployedUrl")}
                placeholder="https://yoursite.com (optional)"
                className="w-full bg-transparent py-1 pl-7 text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting} className="px-6 py-3">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Analyze Repository
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
      {(errors.githubUrl || errors.deployedUrl || serverError) && (
        <p className="mt-3 text-sm text-danger">
          {errors.githubUrl?.message ?? errors.deployedUrl?.message ?? serverError}
        </p>
      )}
      <p className="mt-3 text-center font-mono text-xs text-text-muted">
        No signup required. Public repositories only.
      </p>
    </form>
  );
}
