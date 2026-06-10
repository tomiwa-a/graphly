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
    "bg-success-light text-success",
  intermediate:
    "bg-warning-light text-warning",
  advanced:
    "bg-destructive-light text-destructive",
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
              <p className="text-[10px] font-medium tracking-[0.18em] text-foreground-muted uppercase">
                Featured
              </p>
              <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
                Start with these concepts
              </h2>
            </div>
            <Link
              href="/concepts"
              className="hidden sm:inline-flex text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              View all &rarr;
            </Link>
          </div>
        </Reveal>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {concepts.map((concept, i) => (
            <Reveal key={concept.slug} delay={i * 80}>
              <Link
                href={`/concepts/${concept.slug}`}
                className="group block rounded-xl border border-border bg-surface-card p-5 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
                    <concept.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {concept.title}
                    </h3>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${diffStyles[concept.difficulty]}`}
                      >
                        {concept.difficulty.charAt(0).toUpperCase() +
                          concept.difficulty.slice(1)}
                      </span>
                      <span className="text-[10px] text-foreground-muted">
                        {concept.domain}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground-secondary">
                  {concept.description}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-border bg-surface-muted">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <Reveal>
            <div className="mx-auto max-w-xl text-center">
              <div className="flex justify-center mb-4">
                <LogoMark className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Ready to explore?
              </h2>
              <p className="mt-2 text-foreground-secondary">
                Start anywhere. Follow the graph. Build your mental model of
                backend engineering.
              </p>
              <Link
                href="/concepts"
                className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-dark transition-colors active:scale-[0.98] shadow-button"
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
