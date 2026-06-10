import { BookOpen, ExternalLink } from "lucide-react";

export interface Citation {
  title: string;
  author: string;
  chapter?: string;
  page_range?: string;
  external_link?: string;
}

export function CitationCard({ citations }: { citations: Citation[] }) {
  if (!citations?.length) return null;

  return (
    <div className="my-4 rounded-2xl border border-border bg-surface-card p-5 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="h-4 w-4 text-foreground-muted" />
        <h3 className="text-sm font-bold font-heading text-foreground uppercase tracking-wider">
          Core Literature References
        </h3>
      </div>
      <div className="space-y-3">
        {citations.map((citation, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-surface-muted p-3.5"
          >
            <p className="text-sm font-semibold font-heading text-foreground">
              {citation.title}
            </p>
            <p className="mt-0.5 text-xs text-foreground-secondary">
              by {citation.author}
              {citation.chapter ? ` — ${citation.chapter}` : ""}
              {citation.page_range ? `, pp. ${citation.page_range}` : ""}
            </p>
            {citation.external_link && (
              <a
                href={citation.external_link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary-dark hover:text-primary transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                View source
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
