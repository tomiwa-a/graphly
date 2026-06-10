"use client";

import { useState } from "react";
import { Menu, Search, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "./sheet";

const navLinks = [
  { href: "/explore", label: "Explore" },
  { href: "/paths", label: "Paths" },
  { href: "/concepts", label: "Concepts" },
  { href: "/exercises", label: "Exercises" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <a
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight text-primary"
          >
            <BookOpen className="h-5 w-5" />
            Graphy
          </a>
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground-secondary hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/search"
            className="rounded-md p-2 text-foreground-secondary hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <Search className="h-4 w-4" />
          </a>
          <Button variant="ghost" size="sm" className="hidden md:inline-flex">
            Sign in
          </Button>
          <Button size="sm" className="hidden md:inline-flex">
            Get started
          </Button>
          <SheetTrigger
            className="rounded-md p-2 text-foreground-secondary hover:text-foreground hover:bg-surface-hover transition-colors md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
        </div>
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <nav className="mt-8 flex flex-col gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground-secondary hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              {link.label}
            </a>
          ))}
          <hr className="my-2 border-border" />
          <Button variant="ghost" className="justify-start">
            Sign in
          </Button>
          <Button className="justify-start">Get started</Button>
        </nav>
      </Sheet>
    </header>
  );
}
