import { BodyLayout } from "@/components/layout/body-layout";
import { BookOpen, Network, Code2, GitBranch } from "lucide-react";

const features = [
  {
    icon: Network,
    title: "Connected Knowledge",
    description:
      "Every concept links to its prerequisites, related topics, and dependencies. See the full picture of backend engineering.",
  },
  {
    icon: Code2,
    title: "Multi-Language Examples",
    description:
      "Learn concepts through Go, TypeScript, Python, C#, and Java. Switch between languages to see how patterns translate.",
  },
  {
    icon: GitBranch,
    title: "Learning Paths",
    description:
      "Follow guided paths through the graph or explore freely. Track progress and get recommendations on what to learn next.",
  },
];

const featuredConcepts = [
  {
    title: "Idempotency",
    description: "Making repeated operations safe through idempotency keys and safe retries.",
    difficulty: "Intermediate",
    domain: "API Design",
    slug: "idempotency",
  },
  {
    title: "Indexes",
    description: "How database indexes speed up queries and the tradeoffs they introduce.",
    difficulty: "Intermediate",
    domain: "Databases",
    slug: "indexes",
  },
  {
    title: "Circuit Breakers",
    description: "Preventing cascading failures by detecting and isolating faulting services.",
    difficulty: "Advanced",
    domain: "Reliability",
    slug: "circuit-breakers",
  },
  {
    title: "HTTP",
    description: "The foundation of web communication — methods, status codes, and headers.",
    difficulty: "Beginner",
    domain: "Foundations",
    slug: "http",
  },
];

export default function Home() {
  return (
    <BodyLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-light via-surface to-secondary-light" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-card px-4 py-1.5 text-sm text-foreground-secondary shadow-card">
              <BookOpen className="h-4 w-4 text-primary" />
              Open source backend engineering knowledge graph
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Backend Engineering
              <br />
              <span className="text-primary">Knowledge Graph</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-foreground-secondary">
              Learn backend concepts through a connected graph. Understand what each
              topic means, why it exists, what depends on it, and how to implement it
              across multiple languages.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <a
                href="/explore"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-sm font-semibold text-white shadow-button hover:bg-primary-dark transition-colors"
              >
                Start Exploring
              </a>
              <a
                href="/paths"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-surface-card px-8 text-sm font-semibold text-foreground shadow-button hover:bg-surface-hover transition-colors"
              >
                View Learning Paths
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-foreground">
            How it works
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-foreground-secondary">
            Graphy organizes backend knowledge as a connected map, not a linear course.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-surface-card p-6 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-foreground-secondary">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Concepts */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Featured Concepts
              </h2>
              <p className="mt-1 text-foreground-secondary">
                Start with these popular topics
              </p>
            </div>
            <a
              href="/concepts"
              className="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
            >
              View all &rarr;
            </a>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredConcepts.map((concept) => (
              <a
                key={concept.slug}
                href={`/concepts/${concept.slug}`}
                className="group rounded-xl border border-border bg-surface-card p-5 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      concept.difficulty === "Beginner"
                        ? "bg-success-light text-success"
                        : concept.difficulty === "Intermediate"
                          ? "bg-warning-light text-accent"
                          : "bg-destructive-light text-destructive"
                    }`}
                  >
                    {concept.difficulty}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-medium text-primary">
                    {concept.domain}
                  </span>
                </div>
                <h3 className="mt-3 font-semibold text-foreground group-hover:text-primary transition-colors">
                  {concept.title}
                </h3>
                <p className="mt-1 text-sm text-foreground-secondary">
                  {concept.description}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-gradient-to-br from-primary-light via-surface to-secondary-light">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">
            Ready to explore backend engineering?
          </h2>
          <p className="mt-2 text-foreground-secondary">
            Start anywhere. Follow the graph. Build your mental model.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <a
              href="/explore"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-sm font-semibold text-white shadow-button hover:bg-primary-dark transition-colors"
            >
              Explore the Graph
            </a>
            <a
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-surface-card px-8 text-sm font-semibold text-foreground shadow-button hover:bg-surface-hover transition-colors"
            >
              Create Account
            </a>
          </div>
        </div>
      </section>
    </BodyLayout>
  );
}
