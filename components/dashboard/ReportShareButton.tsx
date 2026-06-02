"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ReportShareButton({ publicId }: { publicId: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    void navigator.clipboard.writeText(`${base}/report/${publicId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button variant="ghost" onClick={copy}>
      {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      {copied ? "Copied" : "Copy Report Link"}
    </Button>
  );
}
