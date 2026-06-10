"use client";

import { useState } from "react";
import { concepts } from "@/lib/data/concepts";
import { ConceptCard } from "@/components/concepts/concept-card";
import { ConceptFilters } from "@/components/concepts/concept-filters";
import { Reveal } from "@/components/reveal";

export default function ConceptsPage() {
  const [domain, setDomain] = useState("All");
  const [difficulty, setDifficulty] = useState("All");

  const filtered = concepts.filter((c) => {
    if (domain !== "All" && c.domain !== domain) return false;
    if (difficulty !== "All" && c.difficulty !== difficulty.toLowerCase()) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
      <Reveal>
        <div className="mb-10">
          <p className="text-xs font-bold tracking-[0.15em] text-foreground-secondary uppercase font-heading">
            Concepts
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-[-0.03em] text-foreground font-heading sm:text-4xl">
            Explore backend concepts.
          </h1>
          <p className="mt-3 text-base text-foreground-secondary font-sans font-medium max-w-lg">
            {concepts.length}+ topics organized by domain, difficulty, and
            prerequisites.
          </p>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div className="mb-8">
          <ConceptFilters
            currentDomain={domain}
            currentDifficulty={difficulty}
            onDomainChange={setDomain}
            onDifficultyChange={setDifficulty}
          />
        </div>
      </Reveal>

      <div className="grid gap-6 sm:grid-cols-2">
        {filtered.map((concept, i) => (
          <Reveal key={concept.slug} delay={i * 60}>
            <ConceptCard
              slug={concept.slug}
              title={concept.title}
              summary={concept.summary}
              difficulty={concept.difficulty}
              domain={concept.domain}
              estimatedMinutes={concept.estimatedMinutes}
            />
          </Reveal>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <p className="text-foreground-secondary font-sans">
              No concepts match your filters.
            </p>
            <button
              onClick={() => {
                setDomain("All");
                setDifficulty("All");
              }}
              className="mt-3 text-sm text-primary-dark font-heading font-medium hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
