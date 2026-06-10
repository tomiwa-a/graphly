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
    "bg-success-light text-success-dark",
  intermediate:
    "bg-warning-light text-warning-dark",
  advanced:
    "bg-destructive-light text-destructive-dark",
};

const howItWorks = [
  {
    step: "01",
    title: "Pick a concept",
    description:
      "Start with any topic that interests you. No prerequisites, no sign-ups, no linear order.",
  },
  {
    step: "02",
    title: "Read the explanation",
    description:
      "Each concept breaks down the what, why, and when — written for engineers, not academics.",
  },
  {
    step: "03",
    title: "See the code",
    description:
      "Real implementations in Go, Python, TypeScript, Java, and Rust. Copy-paste ready.",
  },
  {
    step: "04",
    title: "Follow the graph",
    description:
      "Every concept links to its prerequisites and next steps. Your knowledge builds naturally.",
  },
];

const languages = [
  { name: "Go", color: "#00ADD8" },
  { name: "Python", color: "#3776AB" },
  { name: "TypeScript", color: "#3178C6" },
  { name: "Java", color: "#ED8B00" },
  { name: "Rust", color: "#CE422B" },
];

const domains = [
  { name: "API Design", count: 8 },
  { name: "Databases", count: 12 },
  { name: "Reliability", count: 9 },
  { name: "Caching", count: 6 },
  { name: "Queues & Messaging", count: 7 },
  { name: "Foundations", count: 10 },
];

export default function Home() {
  return (
    <>
      <Hero />

      {/* ── How It Works ── */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <Reveal>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
              <div className="lg:col-span-2">
                <p className="text-xs font-bold tracking-[0.15em] text-foreground-secondary uppercase font-heading">
                  How it works
                </p>
                <h2 className="mt-2 text-3xl font-medium tracking-[-0.03em] text-foreground font-heading sm:text-4xl">
                  Not another
                  <br />
                  online course.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-foreground-secondary font-sans font-medium max-w-sm">
                  Graphy is a knowledge graph, not a playlist. Jump in anywhere,
                  follow connections, and build understanding at your own pace.
                </p>
              </div>
              <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {howItWorks.map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <span className="text-2xl font-heading font-medium text-primary-dark/30 leading-none shrink-0 w-8">
                      {item.step}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold font-heading text-foreground">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-foreground-secondary font-sans">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Featured Concepts ── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
        <Reveal>
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.15em] text-foreground-secondary uppercase font-heading">
                Featured
              </p>
              <h2 className="mt-1 text-2xl font-medium tracking-[-0.03em] text-foreground font-heading">
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
                className="group block rounded-[24px] border border-border bg-surface-card p-6 shadow-card transition-all duration-200 ease-graphy hover:scale-[1.01] hover:shadow-card-hover"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-transparent bg-primary-light text-primary-dark group-hover:scale-105 transition-transform duration-200 ease-out">
                    <concept.icon className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold font-heading text-foreground group-hover:text-primary-dark transition-colors">
                      {concept.title}
                    </h3>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-[10px] font-bold leading-none font-heading ${diffStyles[concept.difficulty]}`}
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

      {/* ── Multi-Language Support ── */}
      <section className="border-t border-border bg-surface-muted">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <Reveal>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <p className="text-xs font-bold tracking-[0.15em] text-foreground-secondary uppercase font-heading">
                  Multi-language
                </p>
                <h2 className="mt-2 text-3xl font-medium tracking-[-0.03em] text-foreground font-heading sm:text-4xl">
                  One concept,
                  <br />
                  five implementations.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-foreground-secondary font-sans font-medium max-w-md">
                  Every concept comes with production-ready code examples in the
                  languages you actually use. Switch between tabs, compare
                  approaches, copy what you need.
                </p>
                <Link
                  href="/concepts"
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-surface-card px-5 text-sm font-bold font-heading text-foreground shadow-button hover:bg-surface-hover hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 select-none cursor-pointer"
                >
                  See code examples &rarr;
                </Link>
              </div>
              <div className="flex flex-wrap gap-3">
                {languages.map((lang) => (
                  <div
                    key={lang.name}
                    className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface-card px-5 py-3 shadow-card"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: lang.color }}
                    />
                    <span className="text-sm font-bold font-heading text-foreground">
                      {lang.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Explore by Domain ── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
        <Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            <div className="lg:col-span-2">
              <p className="text-xs font-bold tracking-[0.15em] text-foreground-secondary uppercase font-heading">
                Topics
              </p>
              <h2 className="mt-2 text-3xl font-medium tracking-[-0.03em] text-foreground font-heading sm:text-4xl">
                Explore by domain.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-foreground-secondary font-sans font-medium max-w-sm">
                Concepts are organized into domains so you can focus on what
                matters most to your current work.
              </p>
            </div>
            <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {domains.map((domain) => (
                <Link
                  key={domain.name}
                  href="/concepts"
                  className="group rounded-2xl border border-border bg-surface-card p-5 shadow-card hover:shadow-card-hover hover:scale-[1.01] transition-all duration-200 ease-graphy"
                >
                  <p className="text-sm font-bold font-heading text-foreground group-hover:text-primary-dark transition-colors">
                    {domain.name}
                  </p>
                  <p className="mt-1 text-xs text-foreground-secondary font-sans">
                    {domain.count} concepts
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Why Graphy — Value Props ── */}
      <section className="border-t border-border bg-surface-muted">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <Reveal>
            <div className="max-w-2xl">
              <p className="text-xs font-bold tracking-[0.15em] text-foreground-secondary uppercase font-heading">
                Why Graphy
              </p>
              <h2 className="mt-2 text-3xl font-medium tracking-[-0.03em] text-foreground font-heading sm:text-4xl">
                Built for how engineers
                <br />
                actually learn.
              </h2>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Reveal delay={0}>
              <div className="rounded-[24px] border border-border bg-surface-card p-6 shadow-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary-dark">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 10h4l3-7 3 14 3-7h4" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-bold font-heading text-foreground">
                  Non-linear by design
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground-secondary font-sans">
                  Real knowledge isn&apos;t linear. Graphy maps prerequisites and
                  connections so you see how everything fits together.
                </p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="rounded-[24px] border border-border bg-surface-card p-6 shadow-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-light text-success-dark">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="16" height="14" rx="2" />
                    <path d="M6 7h2m-2 3h8m-8 3h5" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-bold font-heading text-foreground">
                  Production-ready code
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground-secondary font-sans">
                  Not pseudocode or toy examples. Every snippet is something you
                  could drop into a real service today.
                </p>
              </div>
            </Reveal>
            <Reveal delay={160}>
              <div className="rounded-[24px] border border-border bg-surface-card p-6 shadow-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light text-accent-dark">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="10" cy="10" r="7" />
                    <path d="M10 6v4l2.5 2.5" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-bold font-heading text-foreground">
                  Learn in 10 minutes
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground-secondary font-sans">
                  Each concept is a focused, self-contained read. No hour-long
                  videos. No filler content. Just the essential mental model.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Open Source Banner ── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <Reveal>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-3">
                  <LogoMark className="h-8 w-8" />
                  <h2 className="text-3xl font-medium tracking-[-0.03em] text-foreground font-heading sm:text-4xl">
                    Open source.
                  </h2>
                </div>
                <p className="mt-4 text-base leading-relaxed text-foreground-secondary font-sans font-medium max-w-md">
                  Graphy is free and open source. Contribute new concepts, fix
                  explanations, or add implementations in your favorite language.
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <Link
                    href="/concepts"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold font-heading text-primary-dark shadow-button hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 cursor-pointer select-none"
                  >
                    Start exploring
                  </Link>
                  <a
                    href="https://github.com/your-org/graphy"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-surface-card px-6 text-sm font-bold font-heading text-foreground shadow-button hover:bg-surface-hover hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 select-none cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-foreground" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    View on GitHub
                  </a>
                </div>
              </div>
              <div className="hidden lg:flex justify-end">
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground-secondary font-sans">
                    50+ concepts across 5 languages
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground-secondary font-sans">
                    10 structured learning paths
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground-secondary font-sans">
                    Community-driven & always growing
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
