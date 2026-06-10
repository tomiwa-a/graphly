import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function BodyLayout({ children }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="text-lg font-semibold tracking-tight text-primary">
            Graphy
          </a>
          <nav className="flex items-center gap-6 text-sm font-medium text-text-secondary">
            <a href="/explore" className="hover:text-text-primary transition-colors">
              Explore
            </a>
            <a href="/paths" className="hover:text-text-primary transition-colors">
              Paths
            </a>
            <a href="/search" className="hover:text-text-primary transition-colors">
              Search
            </a>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-text-muted">
            Graphy — Backend Engineering Knowledge Graph
          </p>
        </div>
      </footer>
    </div>
  );
}
