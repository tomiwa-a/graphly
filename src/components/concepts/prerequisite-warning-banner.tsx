"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import { concepts } from "@/lib/data/concepts";

export function PrerequisiteWarningBanner({
  slug,
  prerequisites,
}: {
  slug: string;
  prerequisites: string[];
}) {
  const [completedSlugs, setCompletedSlugs] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const checkStatus = () => {
      try {
        const saved = localStorage.getItem("graphy-completed-concepts");
        if (saved) {
          setCompletedSlugs(JSON.parse(saved));
        } else {
          setCompletedSlugs([]);
        }
      } catch {}
    };

    checkStatus();
    window.addEventListener("storage", checkStatus);
    window.addEventListener("concept-completed-updated", checkStatus);

    return () => {
      window.removeEventListener("storage", checkStatus);
      window.removeEventListener("concept-completed-updated", checkStatus);
    };
  }, []);

  if (!isMounted || prerequisites.length === 0) return null;

  // Find prerequisites that are NOT completed
  const uncompletedSlugs = prerequisites.filter((p) => !completedSlugs.includes(p));

  // If all prerequisites are completed, don't show the warning
  if (uncompletedSlugs.length === 0) return null;

  // Fetch full details of the uncompleted prerequisites
  const uncompletedConcepts = uncompletedSlugs
    .map((s) => concepts.find((c) => c.slug === s))
    .filter(Boolean);

  return (
    <div className="rounded-[20px] border border-warning/40 bg-warning-light p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 text-warning-dark shrink-0 mt-0.5" />
        <div className="space-y-2">
          <h5 className="text-sm font-medium font-heading text-warning-dark leading-none">
            Recommended Detour
          </h5>
          <p className="text-xs text-warning-dark/80 font-sans leading-relaxed">
            It looks like you haven't mastered the prerequisites for this topic yet. For the best learning journey, we recommend checking out these concepts first:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {uncompletedConcepts.map((c) => (
              <Link
                key={`warning-link-${c!.slug}`}
                href={`/concepts/${c!.slug}`}
                className="inline-flex items-center gap-1 text-[11px] font-heading font-bold bg-white text-warning-dark border border-warning/30 hover:border-warning-dark/50 rounded-lg px-2.5 py-1 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>{c!.title}</span>
                <ArrowRight className="h-3 w-3 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
