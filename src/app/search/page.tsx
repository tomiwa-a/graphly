"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { concepts, getAllDomains } from "@/lib/data/concepts";
import searchIndex from "@/lib/data/search-index.json";
import { ConceptCard } from "@/components/concepts/concept-card";
import { Reveal } from "@/components/reveal";

const difficulties = ["All", "Beginner", "Intermediate", "Advanced"];

export default function SearchPage() {
  const domains = useMemo(() => ["All", ...getAllDomains().sort()], []);
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();

    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const results = useMemo(() => {
    return concepts.filter((c) => {
      if (domain !== "All" && c.domain !== domain) return false;
      if (difficulty !== "All" && c.difficulty !== difficulty.toLowerCase())
        return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const indexEntry = searchIndex.find((item) => item.slug === c.slug);
        if (!indexEntry) {
          return (
            c.title.toLowerCase().includes(q) ||
            c.summary.toLowerCase().includes(q) ||
            c.domain.toLowerCase().includes(q)
          );
        }
        return (
          indexEntry.title.toLowerCase().includes(q) ||
          indexEntry.summary.toLowerCase().includes(q) ||
          indexEntry.domain.toLowerCase().includes(q) ||
          indexEntry.bodyText.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [query, domain, difficulty]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <Reveal>
        <div className="mb-8">
          <h1 className="text-3xl font-medium tracking-[-0.03em] text-foreground font-heading sm:text-4xl">
            Search
          </h1>
          <p className="mt-2 text-base text-foreground-secondary font-sans font-medium">
            Find concepts, patterns, and implementations.
          </p>
        </div>
      </Reveal>

      {/* Search input */}
      <Reveal delay={60}>
        <div id="tour-search-input" className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search concepts..."
            className="w-full h-14 pl-12 pr-20 rounded-2xl border border-border bg-surface-card text-foreground font-sans text-base shadow-card focus:outline-none focus:ring-2 focus:ring-primary-dark/20 focus:border-primary-dark/30 transition-all duration-200 placeholder:text-foreground-muted"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {query && (
              <button
                onClick={() => setQuery("")}
                className="p-1 text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-mono text-foreground-muted">
              ⌘K
            </kbd>
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters — sidebar on desktop, toggle on mobile */}
        <div className="lg:col-span-1">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden w-full text-left text-sm font-heading font-bold text-foreground-secondary mb-4 cursor-pointer"
          >
            {showFilters ? "Hide filters ▲" : "Show filters ▼"}
          </button>

          <div className={`${showFilters ? "block" : "hidden"} lg:block space-y-6`}>
            {/* Domain filter */}
            <div>
              <p className="text-xs font-bold tracking-[0.15em] text-foreground-secondary uppercase font-heading mb-3">
                Domain
              </p>
              <div className="space-y-1.5">
                {domains.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDomain(d)}
                    className={`block w-full text-left px-3 py-2 rounded-xl text-sm font-sans transition-all duration-200 cursor-pointer ${
                      domain === d
                        ? "bg-primary-light text-primary-dark font-medium"
                        : "text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty filter */}
            <div>
              <p className="text-xs font-bold tracking-[0.15em] text-foreground-secondary uppercase font-heading mb-3">
                Difficulty
              </p>
              <div className="space-y-1.5">
                {difficulties.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`block w-full text-left px-3 py-2 rounded-xl text-sm font-sans transition-all duration-200 cursor-pointer ${
                      difficulty === d
                        ? "bg-primary-light text-primary-dark font-medium"
                        : "text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {(domain !== "All" || difficulty !== "All") && (
              <button
                onClick={() => {
                  setDomain("All");
                  setDifficulty("All");
                }}
                className="text-xs text-primary-dark font-heading font-bold hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          <p className="text-sm text-foreground-secondary font-sans mb-6">
            {results.length} result{results.length !== 1 ? "s" : ""}
            {query.trim() ? ` for "${query}"` : ""}
          </p>

          {results.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((c, i) => (
                <Reveal key={c.slug} delay={i * 40}>
                  <ConceptCard
                    slug={c.slug}
                    title={c.title}
                    summary={c.summary}
                    difficulty={c.difficulty}
                    domain={c.domain}
                    estimatedMinutes={c.estimatedMinutes}
                  />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center rounded-2xl border border-border bg-surface-card">
              <p className="text-lg font-heading font-medium text-foreground">
                No results found
              </p>
              <p className="mt-2 text-sm text-foreground-secondary font-sans">
                Try a broader search term or adjust your filters.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {["HTTP", "Caching", "Queues"].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setQuery(s);
                      setDomain("All");
                      setDifficulty("All");
                    }}
                    className="rounded-full border border-border bg-surface-card px-4 py-1.5 text-sm font-heading text-foreground-secondary hover:text-foreground hover:bg-surface-hover transition-all duration-200 cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
