"use client";

import Link from "next/link";
import { GitBranch, CornerDownRight, ExternalLink } from "lucide-react";
import { concepts } from "@/lib/data/concepts";
import { graphEdges } from "@/lib/graph-engine";

interface SyllabusStep {
  slug: string;
}

export function AdvisoryDetours({ syllabus }: { syllabus: SyllabusStep[] }) {
  const syllabusSlugs = new Set(syllabus.map((s) => s.slug));

  // Find all concepts that are related to any concept in the current syllabus,
  // but are NOT already part of the syllabus itself.
  const detours: {
    sourceTitle: string;
    sourceSlug: string;
    targetTitle: string;
    targetSlug: string;
    targetDomain: string;
    reason: string;
  }[] = [];

  syllabus.forEach((step) => {
    const concept = concepts.find((c) => c.slug === step.slug);
    if (!concept) return;

    // Check edges where the current step is connected to something else
    const relatedEdges = graphEdges.filter(
      (edge) =>
        (edge.from === step.slug && !syllabusSlugs.has(edge.to)) ||
        (edge.to === step.slug && !syllabusSlugs.has(edge.from))
    );

    relatedEdges.forEach((edge) => {
      const isOutgoing = edge.from === step.slug;
      const neighborSlug = isOutgoing ? edge.to : edge.from;
      const neighbor = concepts.find((c) => c.slug === neighborSlug);

      if (neighbor && !detours.some((d) => d.targetSlug === neighborSlug)) {
        detours.push({
          sourceTitle: concept.title,
          sourceSlug: concept.slug,
          targetTitle: neighbor.title,
          targetSlug: neighbor.slug,
          targetDomain: neighbor.domain,
          reason: edge.reason,
        });
      }
    });
  });

  if (detours.length === 0) return null;

  return (
    <div className="rounded-[24px] border border-border bg-surface-card p-6 shadow-card transition-all hover:shadow-card-hover">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="h-5 w-5 text-accent-dark" />
        <h3 className="text-lg font-medium font-heading text-foreground tracking-[-0.02em]">
          Suggested Detours
        </h3>
      </div>
      <p className="text-xs leading-relaxed text-foreground-secondary font-sans mb-4">
        Bored of the current track or want to expand your horizons? These related concepts sit right next to your path:
      </p>

      <div className="space-y-4">
        {detours.slice(0, 3).map((detour) => (
          <div
            key={`detour-${detour.targetSlug}`}
            className="group rounded-xl border border-border/70 hover:border-primary-dark/30 hover:bg-surface-hover/30 p-3.5 transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[9px] font-heading font-bold text-foreground-secondary uppercase tracking-wider flex items-center gap-1">
                  <span>Branching from</span>
                  <span className="font-bold underline text-foreground">{detour.sourceTitle}</span>
                </p>
                <h4 className="mt-1 text-sm font-medium font-heading text-foreground group-hover:text-primary-dark transition-colors flex items-center gap-1.5">
                  <Link href={`/concepts/${detour.targetSlug}`}>
                    {detour.targetTitle}
                  </Link>
                  <Link href={`/concepts/${detour.targetSlug}`} className="text-foreground-muted hover:text-foreground">
                    <ExternalLink className="h-3 w-3 inline" />
                  </Link>
                </h4>
              </div>
              <span className="text-[9px] font-heading font-bold bg-accent-light text-accent-dark border border-accent/20 rounded-full px-2 py-0.5 uppercase tracking-wide">
                {detour.targetDomain}
              </span>
            </div>

            <div className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-foreground-secondary font-sans">
              <CornerDownRight className="h-3.5 w-3.5 text-foreground-muted shrink-0 mt-0.5" />
              <span>{detour.reason}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
