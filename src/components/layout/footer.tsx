import { LogoFull } from "@/components/logo";
import { concepts } from "@/lib/data/concepts";
import { paths } from "@/lib/data/paths";

export function Footer() {
  const totalConcepts = concepts.length;
  const totalPaths = paths.length;

  return (
    <footer className="border-t border-border bg-surface font-sans text-foreground">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-8 py-12 sm:grid-cols-3">
          {/* Brand */}
          <div className="flex flex-col gap-2.5">
            <LogoFull className="h-6" />
            <p className="text-sm text-foreground-secondary leading-relaxed max-w-xs">
              Backend engineering knowledge graph. Learn concepts, connections,
              and implementations across multiple languages.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-bold tracking-[0.1em] text-foreground font-heading uppercase mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: "/concepts", label: "Concepts" },
                { href: "/paths", label: "Learning Paths" },
                { href: "/graph", label: "Knowledge Graph" },
                { href: "/search", label: "Search" },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm font-semibold font-heading text-foreground-secondary hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Stats & GitHub */}
          <div>
            <h4 className="text-xs font-bold tracking-[0.1em] text-foreground font-heading uppercase mb-4">
              Project
            </h4>
            <p className="text-sm font-medium text-foreground-secondary font-sans mb-5">
              {totalConcepts} concepts across 5 languages.
              <br />
              {totalPaths} structured learning paths.
            </p>
            <a
              href="https://github.com/your-org/graphy"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-card px-4 py-2 text-sm font-bold font-heading shadow-button hover:bg-surface-hover hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 select-none cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-foreground" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
        <div className="border-t border-border py-6 text-center text-xs text-foreground-secondary font-mono">
          &copy; {new Date().getFullYear()} Graphy &mdash; Open source backend
          engineering knowledge graph
        </div>
      </div>
    </footer>
  );
}

