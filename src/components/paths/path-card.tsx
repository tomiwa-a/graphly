import Link from "next/link";
import type { Difficulty } from "@/lib/data/concepts";

const diffStyles: Record<string, string> = {
  beginner: "bg-success-light text-success-dark",
  intermediate: "bg-warning-light text-warning-dark",
  advanced: "bg-destructive-light text-destructive-dark",
};

interface PathCardProps {
  slug: string;
  title: string;
  summary: string;
  difficulty: Difficulty;
  stepCount: number;
  estimatedHours: number;
}

export function PathCard({
  slug,
  title,
  summary,
  difficulty,
  stepCount,
  estimatedHours,
}: PathCardProps) {
  return (
    <Link
      href={`/paths/${slug}`}
      className="group block rounded-[24px] border border-border bg-surface-card p-6 shadow-card transition-all duration-200 ease-graphy hover:scale-[1.01] hover:shadow-card-hover"
    >
      <h3 className="text-lg font-medium font-heading text-foreground group-hover:text-primary-dark transition-colors">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground-secondary font-sans line-clamp-2">
        {summary}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold leading-none font-heading ${diffStyles[difficulty]}`}
        >
          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </span>
        <span className="text-xs text-foreground-secondary font-sans">
          {stepCount} steps
        </span>
        <span className="h-1 w-1 rounded-full bg-foreground-muted" />
        <span className="text-xs text-foreground-secondary font-sans">
          ~{estimatedHours}h
        </span>
      </div>
    </Link>
  );
}
