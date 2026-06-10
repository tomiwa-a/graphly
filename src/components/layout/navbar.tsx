"use client";

import { useState } from "react";
import { Menu, Search } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LogoFull } from "@/components/logo";

const navLinks = [
  { href: "/concepts", label: "Concepts" },
  { href: "/paths", label: "Paths" },
  { href: "/graph", label: "Graph" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-8">
          <Link href="/" className="hover:scale-[1.01] active:scale-[0.98] transition-transform duration-200">
            <LogoFull className="h-6" />
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full border border-transparent px-3.5 py-1 text-sm font-bold font-heading text-foreground-secondary hover:text-foreground hover:bg-surface-hover hover:border-border transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/search"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-card text-foreground shadow-button hover:bg-surface-hover hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            aria-label="Search"
          >
            <Search className="h-4 w-4 stroke-[2.2]" />
          </a>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-card text-foreground shadow-button hover:bg-surface-hover hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4 stroke-[2.2]" />
          </button>
        </div>
      </div>
      <div
        className={cn(
          "overflow-hidden border-b border-border transition-all duration-200 md:hidden bg-surface-muted",
          mobileOpen ? "max-h-40" : "max-h-0 border-transparent",
        )}
      >
        <div className="space-y-1.5 px-5 py-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block rounded-xl border border-transparent px-4 py-2 text-sm font-bold font-heading text-foreground-secondary hover:text-foreground hover:bg-surface-hover hover:border-border transition-all duration-200"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}

