"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import type { PathStep } from "@/lib/data/paths";

function StepCard({
  step,
  isCompleted,
  onToggle,
  isLast,
}: {
  step: PathStep;
  isCompleted: boolean;
  onToggle: () => void;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-4">
      {/* Timeline line + node */}
      <div className="flex flex-col items-center">
        <button
          onClick={onToggle}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 cursor-pointer ${
            isCompleted
              ? "bg-primary-dark border-primary-dark text-white"
              : "border-border bg-surface-card hover:border-primary-dark"
          }`}
          aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
        >
          {isCompleted && <Check className="h-4 w-4" />}
        </button>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-border min-h-[40px]" />
        )}
      </div>

      {/* Content */}
      <div className="pb-8">
        <div className="flex items-center gap-3">
          <span className="text-lg font-heading font-medium text-primary-dark/25">
            {String(step.order).padStart(2, "0")}
          </span>
          <Link
            href={`/concepts/${step.conceptSlug}`}
            className={`text-base font-medium font-heading transition-colors hover:text-primary-dark ${
              isCompleted
                ? "text-foreground-muted line-through decoration-foreground-muted/30"
                : "text-foreground"
            }`}
          >
            {step.title}
          </Link>
        </div>
        <p
          className={`mt-1 ml-10 text-sm font-sans ${
            isCompleted ? "text-foreground-muted" : "text-foreground-secondary"
          }`}
        >
          {step.summary}
        </p>
        <p className="mt-1 ml-10 text-xs text-foreground-muted font-sans">
          {step.estimatedMinutes} min read
        </p>
      </div>
    </div>
  );
}

export function StepList({
  pathSlug,
  steps,
}: {
  pathSlug: string;
  steps: PathStep[];
}) {
  const storageKey = `path-${pathSlug}-progress`;
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setCompleted(new Set(JSON.parse(saved)));
    } catch {}
  }, [storageKey]);

  const toggle = (order: number) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(order)) next.delete(order);
      else next.add(order);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  };

  const progress = steps.length > 0 ? (completed.size / steps.length) * 100 : 0;

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-heading font-bold text-foreground-secondary uppercase tracking-[0.1em]">
            Progress
          </span>
          <span className="text-xs font-mono text-foreground-secondary">
            {completed.size}/{steps.length}
          </span>
        </div>
        <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary-dark transition-all duration-500 ease-graphy"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div>
        {steps.map((step, i) => (
          <StepCard
            key={step.order}
            step={step}
            isCompleted={completed.has(step.order)}
            onToggle={() => toggle(step.order)}
            isLast={i === steps.length - 1}
          />
        ))}
      </div>

      {/* Completion message */}
      {progress === 100 && (
        <div className="mt-6 rounded-2xl border border-border bg-success-light p-6 text-center">
          <p className="text-lg font-heading font-medium text-success-dark">
            🎉 Path complete!
          </p>
          <p className="mt-1 text-sm text-success-dark/80 font-sans">
            You've finished all steps in this learning path.
          </p>
          <Link
            href="/paths"
            className="mt-4 inline-flex text-sm font-heading font-bold text-success-dark hover:underline"
          >
            Explore more paths →
          </Link>
        </div>
      )}
    </div>
  );
}
