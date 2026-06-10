import { notFound } from "next/navigation";
import { getPathBySlug, paths } from "@/lib/data/paths";
import { StepList } from "@/components/paths/step-list";
import { Reveal } from "@/components/reveal";
import Link from "next/link";

const diffStyles: Record<string, string> = {
  beginner: "bg-success-light text-success-dark",
  intermediate: "bg-warning-light text-warning-dark",
  advanced: "bg-destructive-light text-destructive-dark",
};

export function generateStaticParams() {
  return paths.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const path = getPathBySlug(slug);
  if (!path) return { title: "Not Found" };
  return { title: path.title, description: path.summary };
}

export default async function PathDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const path = getPathBySlug(slug);
  if (!path) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <Reveal>
        <div className="mb-6">
          <Link
            href="/paths"
            className="text-sm text-foreground-secondary font-sans hover:text-foreground transition-colors"
          >
            ← All paths
          </Link>
        </div>

        <header className="mb-10">
          <h1 className="text-3xl font-medium tracking-[-0.03em] text-foreground font-heading sm:text-4xl">
            {path.title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-foreground-secondary font-sans font-medium">
            {path.summary}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold font-heading ${diffStyles[path.difficulty]}`}
            >
              {path.difficulty.charAt(0).toUpperCase() +
                path.difficulty.slice(1)}
            </span>
            <span className="text-sm text-foreground-secondary font-sans">
              {path.steps.length} steps
            </span>
            <span className="h-1 w-1 rounded-full bg-foreground-muted" />
            <span className="text-sm text-foreground-secondary font-sans">
              ~{path.estimatedHours} hours
            </span>
          </div>
        </header>
      </Reveal>

      <StepList pathSlug={path.slug} steps={path.steps} />
    </div>
  );
}
