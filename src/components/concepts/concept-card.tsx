import Link from "next/link";
import type { Difficulty } from "@/lib/data/concepts";
import { concepts } from "@/lib/data/concepts";
import { chapters } from "@/lib/data/chapters";

const diffStyles: Record<string, string> = {
  beginner: "bg-success-light text-success-dark",
  intermediate: "bg-warning-light text-warning-dark",
  advanced: "bg-destructive-light text-destructive-dark",
};

interface ConceptCardProps {
  slug: string;
  title: string;
  summary: string;
  difficulty: Difficulty;
  domain: string;
  estimatedMinutes?: number;
}

export function ConceptCard({
  slug,
  title,
  summary,
  difficulty,
  domain,
  estimatedMinutes,
}: ConceptCardProps) {
  const concept = concepts.find((c) => c.slug === slug);
  const chapter = chapters.find((ch) => ch.id === concept?.chapterId);

  return (
    <Link
      href={`/concepts/${slug}`}
      className="group block rounded-[24px] border border-border bg-surface-card p-6 shadow-card transition-all duration-200 ease-graphy hover:scale-[1.01] hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-medium font-heading text-foreground group-hover:text-primary-dark transition-colors">
          {title}
        </h3>
        {estimatedMinutes && (
          <span className="shrink-0 text-xs text-foreground-muted font-sans">
            {estimatedMinutes}m
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold leading-none font-heading ${diffStyles[difficulty]}`}
        >
          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </span>
        <span className="text-xs text-foreground-secondary font-sans">
          {domain}
        </span>
        {chapter && (
          <>
            <span className="h-1 w-1 rounded-full bg-foreground-muted/40" />
            <span className="text-xs text-foreground-secondary font-sans">
              Chapter: <span className="font-semibold text-foreground-secondary">{chapter.title}</span>
            </span>
          </>
        )}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground-secondary font-sans line-clamp-2">
        {summary}
      </p>
    </Link>
  );
}

export function ConceptCardMini({
  slug,
  title,
  difficulty,
}: {
  slug: string;
  title: string;
  difficulty: Difficulty;
}) {
  return (
    <Link
      href={`/concepts/${slug}`}
      className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface-card px-4 py-2.5 shadow-card hover:shadow-card-hover hover:scale-[1.01] transition-all duration-200 ease-graphy"
    >
      <span
        className={`h-2 w-2 rounded-full ${
          difficulty === "beginner"
            ? "bg-success-dark"
            : difficulty === "intermediate"
            ? "bg-warning-dark"
            : "bg-destructive-dark"
        }`}
      />
      <span className="text-sm font-medium font-heading text-foreground">
        {title}
      </span>
    </Link>
  );
}
