"use client";

import { useState } from "react";
import { Menu, Search } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LogoFull } from "@/components/logo";

const navLinks = [
  { href: "/concepts", label: "Concepts" },
  { href: "/paths", label: "Paths" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-8">
          <Link href="/">
            <LogoFull className="h-5" />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm text-foreground-secondary hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/search"
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <Search className="h-4 w-4" />
          </a>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        className={cn(
          "overflow-hidden border-b border-border transition-all duration-200 md:hidden",
          mobileOpen ? "max-h-40" : "max-h-0 border-transparent",
        )}
      >
        <div className="space-y-1 px-5 py-3">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block rounded-md px-3 py-2 text-sm text-foreground-secondary hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}
