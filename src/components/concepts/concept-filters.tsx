"use client";

import { useState } from "react";

const domains = ["All", "API Design", "Databases", "Reliability", "Foundations", "Queues", "Caching"];
const difficulties = ["All", "Beginner", "Intermediate", "Advanced"];

interface ConceptFiltersProps {
  currentDomain: string;
  currentDifficulty: string;
  onDomainChange: (domain: string) => void;
  onDifficultyChange: (difficulty: string) => void;
}

export function ConceptFilters({
  currentDomain,
  currentDifficulty,
  onDomainChange,
  onDifficultyChange,
}: ConceptFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex flex-wrap gap-2">
        {domains.map((d) => (
          <button
            key={d}
            onClick={() => onDomainChange(d)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold font-heading transition-all duration-200 cursor-pointer select-none ${
              currentDomain === d
                ? "bg-primary-light text-primary-dark"
                : "bg-surface-card text-foreground-secondary border border-border hover:bg-surface-hover"
            }`}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="h-4 w-px bg-border hidden sm:block" />
      <div className="flex gap-2">
        {difficulties.map((d) => (
          <button
            key={d}
            onClick={() => onDifficultyChange(d)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold font-heading transition-all duration-200 cursor-pointer select-none ${
              currentDifficulty === d
                ? "bg-primary-light text-primary-dark"
                : "text-foreground-secondary hover:text-foreground"
            }`}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}
