import { notFound } from "next/navigation";
import { getConceptBySlug, getAllSlugs, concepts } from "@/lib/data/concepts";
import { ConceptCardMini } from "@/components/concepts/concept-card";
import { TableOfContents } from "@/components/concepts/table-of-contents";
import { LanguageTabSwitcher } from "@/components/concepts/language-tab-switcher";
import Link from "next/link";
import { Reveal } from "@/components/reveal";

const diffStyles: Record<string, string> = {
  beginner: "bg-success-light text-success-dark",
  intermediate: "bg-warning-light text-warning-dark",
  advanced: "bg-destructive-light text-destructive-dark",
};

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const concept = getConceptBySlug(slug);
  if (!concept) return { title: "Not Found" };
  return { title: concept.title, description: concept.summary };
}

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const concept = getConceptBySlug(slug);
  if (!concept) notFound();

  const prerequisiteConcepts = concepts.filter((c) =>
    concept.prerequisites.includes(c.slug)
  );
  const relatedConcepts = concepts.filter((c) =>
    concept.related.includes(c.slug)
  );
  const nextConcepts = concepts
    .filter((c) => c.slug !== concept.slug)
    .slice(0, 3);

  const tocSections = [
    ...concept.sections.map((s) => ({ id: s.id, title: s.title })),
    ...(prerequisiteConcepts.length > 0
      ? [{ id: "prerequisites", title: "Prerequisites" }]
      : []),
    ...(relatedConcepts.length > 0
      ? [{ id: "related", title: "Related Concepts" }]
      : []),
    ...(concept.codeExamples.length > 0
      ? [{ id: "code-examples", title: "Code Examples" }]
      : []),
    { id: "continue-learning", title: "Continue Learning" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Content */}
        <div className="lg:col-span-3">
          <Reveal>
            {/* Breadcrumb */}
            <div className="mb-6">
              <Link
                href="/concepts"
                className="text-sm text-foreground-secondary font-sans hover:text-foreground transition-colors"
              >
                ← All concepts
              </Link>
            </div>

            {/* Header */}
            <header className="mb-10">
              <h1 className="text-3xl font-medium tracking-[-0.03em] text-foreground font-heading sm:text-4xl">
                {concept.title}
              </h1>
              <p className="mt-3 text-base leading-relaxed text-foreground-secondary font-sans font-medium max-w-xl">
                {concept.summary}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold font-heading ${diffStyles[concept.difficulty]}`}
                >
                  {concept.difficulty.charAt(0).toUpperCase() +
                    concept.difficulty.slice(1)}
                </span>
                <span className="text-sm text-foreground-secondary font-sans">
                  {concept.domain}
                </span>
                <span className="h-1 w-1 rounded-full bg-foreground-muted" />
                <span className="text-sm text-foreground-secondary font-sans">
                  {concept.estimatedMinutes} min read
                </span>
              </div>
            </header>
          </Reveal>

          {/* Body sections */}
          {concept.sections.map((section) => (
            <Reveal key={section.id}>
              <section id={section.id} className="mb-10 scroll-mt-24">
                <h2 className="text-xl font-medium font-heading text-foreground tracking-[-0.02em] mb-3">
                  {section.title}
                </h2>
                <p className="text-base leading-relaxed text-foreground-secondary font-sans whitespace-pre-line">
                  {section.content}
                </p>
              </section>
            </Reveal>
          ))}

          {/* Prerequisites */}
          {prerequisiteConcepts.length > 0 && (
            <Reveal>
              <section id="prerequisites" className="mb-10 scroll-mt-24">
                <h2 className="text-xl font-medium font-heading text-foreground tracking-[-0.02em] mb-4">
                  Prerequisites
                </h2>
                <div className="flex flex-wrap gap-3">
                  {prerequisiteConcepts.map((c) => (
                    <ConceptCardMini
                      key={c.slug}
                      slug={c.slug}
                      title={c.title}
                      difficulty={c.difficulty}
                    />
                  ))}
                </div>
              </section>
            </Reveal>
          )}

          {/* Related */}
          {relatedConcepts.length > 0 && (
            <Reveal>
              <section id="related" className="mb-10 scroll-mt-24">
                <h2 className="text-xl font-medium font-heading text-foreground tracking-[-0.02em] mb-4">
                  Related Concepts
                </h2>
                <div className="flex flex-wrap gap-3">
                  {relatedConcepts.map((c) => (
                    <ConceptCardMini
                      key={c.slug}
                      slug={c.slug}
                      title={c.title}
                      difficulty={c.difficulty}
                    />
                  ))}
                </div>
              </section>
            </Reveal>
          )}

          {/* Code Examples */}
          {concept.codeExamples.length > 0 && (
            <Reveal>
              <section id="code-examples" className="mb-10 scroll-mt-24">
                <h2 className="text-xl font-medium font-heading text-foreground tracking-[-0.02em] mb-4">
                  Code Examples
                </h2>
                <LanguageTabSwitcher examples={concept.codeExamples} />
              </section>
            </Reveal>
          )}

          {/* Continue Learning */}
          <Reveal>
            <section
              id="continue-learning"
              className="mt-16 pt-10 border-t border-border scroll-mt-24"
            >
              <h2 className="text-xl font-medium font-heading text-foreground tracking-[-0.02em] mb-6">
                Continue learning
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {nextConcepts.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/concepts/${c.slug}`}
                    className="group rounded-2xl border border-border bg-surface-card p-5 shadow-card hover:shadow-card-hover hover:scale-[1.01] transition-all duration-200 ease-graphy"
                  >
                    <p className="text-sm font-medium font-heading text-foreground group-hover:text-primary-dark transition-colors">
                      {c.title}
                    </p>
                    <p className="mt-1 text-xs text-foreground-secondary font-sans line-clamp-2">
                      {c.summary}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          </Reveal>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <TableOfContents sections={tocSections} />
        </div>
      </div>
    </div>
  );
}
