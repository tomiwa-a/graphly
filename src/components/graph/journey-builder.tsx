"use client";

import { useState } from "react";
import { Compass, ArrowRight, Sparkles } from "lucide-react";
import { concepts } from "@/lib/data/concepts";
import { GraphEngine } from "@/lib/graph-engine";
import { Button } from "@/components/ui/button";

export function JourneyBuilder({
  onCompile,
}: {
  onCompile: (
    syllabus: ReturnType<typeof GraphEngine.compileSyllabus>,
    startSlug: string,
    targetSlug: string
  ) => void;
}) {
  const [start, setStart] = useState("bits");
  const [goal, setGoal] = useState("caching-strategies");

  const handleCompile = (e: React.FormEvent) => {
    e.preventDefault();
    const syllabus = GraphEngine.compileSyllabus(start, goal);
    onCompile(syllabus, start, goal);
  };

  // Group concepts by domain for cleaner dropdown groupings
  const domains = Array.from(new Set(concepts.map((c) => c.domain)));

  return (
    <div className="rounded-[24px] border border-border bg-surface-card p-6 shadow-card transition-all hover:shadow-card-hover">
      <div className="flex items-center gap-2 mb-4">
        <Compass className="h-5 w-5 text-primary-dark" />
        <h3 className="text-lg font-medium font-heading text-foreground tracking-[-0.02em]">
          Dynamic Journey Builder
        </h3>
      </div>
      <p className="text-xs leading-relaxed text-foreground-secondary font-sans mb-6">
        Select a starting point and a target goal. The Graph Engine will calculate the optimal learning path of prerequisite connections and compile a custom syllabus for you.
      </p>

      <form onSubmit={handleCompile} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Start select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-heading font-bold text-foreground-secondary uppercase tracking-[0.1em]">
              Where I am starting:
            </label>
            <select
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-11 px-4 rounded-xl border border-border bg-surface-card text-sm font-sans focus:outline-none focus:ring-1 focus:ring-primary-dark transition-all cursor-pointer"
            >
              {domains.map((domain) => (
                <optgroup key={`start-${domain}`} label={domain}>
                  {concepts
                    .filter((c) => c.domain === domain)
                    .map((c) => (
                      <option key={`start-opt-${c.slug}`} value={c.slug}>
                        {c.title}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Goal select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-heading font-bold text-foreground-secondary uppercase tracking-[0.1em]">
              Where I am going:
            </label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="h-11 px-4 rounded-xl border border-border bg-surface-card text-sm font-sans focus:outline-none focus:ring-1 focus:ring-primary-dark transition-all cursor-pointer"
            >
              {domains.map((domain) => (
                <optgroup key={`goal-${domain}`} label={domain}>
                  {concepts
                    .filter((c) => c.domain === domain)
                    .map((c) => (
                      <option key={`goal-opt-${c.slug}`} value={c.slug}>
                        {c.title}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="default"
            className="w-full sm:w-auto font-heading font-bold"
          >
            Compile Path
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Button>
        </div>
      </form>
    </div>
  );
}
