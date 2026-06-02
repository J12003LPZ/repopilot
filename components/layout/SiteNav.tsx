import Link from "next/link";
import { Rocket } from "lucide-react";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border h-16">
      <div className="max-w-[1280px] mx-auto px-6 h-full flex justify-between items-center">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-text-primary hover:text-primary transition-colors"
        >
          <Rocket className="h-5 w-5 text-primary" />
          RepoPilot
        </Link>

        {/* Center nav links */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-text-secondary hover:text-primary transition-colors text-sm"
          >
            Dashboard
          </Link>
          <Link
            href="/case-study"
            className="text-text-secondary hover:text-primary transition-colors text-sm"
          >
            Case Study
          </Link>
          <a
            href="https://github.com/J12003LPZ/repopilot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-primary transition-colors text-sm"
          >
            GitHub
          </a>
        </nav>

        {/* CTA button */}
        <Link
          href="/analyze"
          className="bg-accent-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-container transition-colors"
        >
          Analyze Repo
        </Link>
      </div>
    </header>
  );
}
