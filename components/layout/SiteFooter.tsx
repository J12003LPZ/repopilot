import { Rocket } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="bg-surface-container-lowest border-t border-border mt-auto">
      <div className="max-w-[1280px] mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Left: branding */}
        <div className="flex flex-col items-center md:items-start gap-1">
          <div className="flex items-center gap-2 font-bold text-text-primary">
            <Rocket className="h-4 w-4 text-primary" />
            RepoPilot
          </div>
          <p className="text-xs font-mono text-text-muted">
            © 2026 RepoPilot. Developer Intelligence Platform.
          </p>
        </div>

        {/* Right: links */}
        <nav className="flex items-center gap-6">
          <a
            href="#"
            className="text-xs font-mono text-text-muted hover:text-text-primary transition-colors"
          >
            Documentation
          </a>
          <a
            href="#"
            className="text-xs font-mono text-text-muted hover:text-text-primary transition-colors"
          >
            Privacy
          </a>
          <a
            href="#"
            className="text-xs font-mono text-text-muted hover:text-text-primary transition-colors"
          >
            Terms
          </a>
        </nav>
      </div>
    </footer>
  );
}
