import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<Variant, string> = {
    primary:
      "bg-accent-blue text-white hover:bg-primary-container shadow-[0_0_15px_rgba(59,130,246,0.15)]",
    ghost:
      "border border-border bg-transparent text-text-secondary hover:bg-card-hover hover:text-text-primary",
  };
  return <button className={cn(base, variants[variant], className)} {...props} />;
}
