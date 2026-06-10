import { Hero } from "@/components/hero";
import { Reveal } from "@/components/reveal";
import { LogoMark } from "@/components/logo";
import Link from "next/link";
import {
  IconIdempotency,
  IconIndexes,
  IconCircuitBreaker,
  IconHttp,
  IconQueue,
  IconCache,
} from "@/components/icons/concept-icons";

const concepts = [
  {
    title: "Idempotency",
    description:
      "Making repeated operations safe through idempotency keys and safe retries.",
    difficulty: "intermediate",
    domain: "API Design",
    slug: "idempotency",
    icon: IconIdempotency,
  },
  {
    title: "Database Indexes",
    description:
      "How indexes speed up queries and the tradeoffs they introduce.",
    difficulty: "intermediate",
    domain: "Databases",
    slug: "indexes",
    icon: IconIndexes,
  },
  {
    title: "Circuit Breakers",
    description:
      "Preventing cascading failures by detecting and isolating faulting services.",
    difficulty: "advanced",
    domain: "Reliability",
    slug: "circuit-breakers",
    icon: IconCircuitBreaker,
  },
  {
    title: "HTTP",
    description:
      "The foundation of web communication — methods, status codes, and headers.",
    difficulty: "beginner",
    domain: "Foundations",
    slug: "http",
    icon: IconHttp,
  },
  {
    title: "Message Queues",
    description:
      "Decoupling services through asynchronous message passing.",
    difficulty: "intermediate",
    domain: "Queues",
    slug: "message-queues",
    icon: IconQueue,
  },
  {
    title: "Caching Strategies",
    description:
      "Improving performance with cache-aside, write-through, and CDN patterns.",
    difficulty: "intermediate",
    domain: "Caching",
    slug: "caching-strategies",
    icon: IconCache,
  },
];

const diffStyles: Record<string, string> = {
  beginner:
    "bg-success text-success-dark",
  intermediate:
    "bg-warning text-warning-dark",
  advanced:
    "bg-destructive text-destructive-dark",
};

export default function Home() {
  return (
    <>
      <Hero />

      {/* Featured Concepts */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <Reveal>
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.15em] text-foreground-secondary uppercase font-heading">
                Featured
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground font-heading">
                Start with these concepts
              </h2>
            </div>
            <Link
              href="/concepts"
              className="hidden sm:inline-flex text-sm font-bold font-heading text-foreground-secondary hover:text-foreground transition-colors"
            >
              View all &rarr;
            </Link>
          </div>
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {concepts.map((concept, i) => (
            <Reveal key={concept.slug} delay={i * 80}>
              <Link
                href={`/concepts/${concept.slug}`}
                className="group block rounded-2xl border-2 border-border bg-surface-card p-5 shadow-card transition-all duration-120 ease-graphy hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-card-hover"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-primary text-foreground shadow-[2px_2px_0_0_var(--color-border)] group-hover:scale-105 transition-transform duration-100 ease-out">
                    <concept.icon className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold font-heading text-foreground group-hover:text-primary-dark transition-colors">
                      {concept.title}
                    </h3>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border-2 border-border px-2.5 py-0.5 text-[10px] font-bold leading-none font-heading ${diffStyles[concept.difficulty]}`}
                      >
                        {concept.difficulty.charAt(0).toUpperCase() +
                          concept.difficulty.slice(1)}
                      </span>
                      <span className="text-xs font-semibold text-foreground-secondary font-sans">
                        {concept.domain}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-foreground-secondary font-sans font-medium">
                  {concept.description}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t-2 border-border bg-surface-muted">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <Reveal>
            <div className="mx-auto max-w-xl text-center">
              <div className="flex justify-center mb-4">
                <LogoMark className="h-10 w-10 text-foreground" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground font-heading">
                Ready to explore?
              </h2>
              <p className="mt-2 text-foreground-secondary font-sans font-medium">
                Start anywhere. Follow the graph. Build your mental model of
                backend engineering.
              </p>
              <Link
                href="/concepts"
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-border bg-primary px-6 text-sm font-bold font-heading text-foreground shadow-[0_4px_0_0_var(--color-border)] hover:-translate-y-[1px] hover:shadow-[0_5px_0_0_var(--color-border)] active:translate-y-[2px] active:shadow-[0_2px_0_0_var(--color-border)] transition-all duration-100 cursor-pointer select-none"
              >
                Browse all concepts
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

