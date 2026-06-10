"use client";

import { BodyLayout } from "@/components/layout/body-layout";
import { BookOpen, Network, Code2, GitBranch, ArrowRight, Sparkles } from "lucide-react";

const features = [
  {
    icon: Network,
    title: "Connected Knowledge",
    description:
      "Every concept links to its prerequisites, related topics, and dependencies. See the full picture of backend engineering.",
    accent: "primary" as const,
  },
  {
    icon: Code2,
    title: "Multi-Language Examples",
    description:
      "Learn concepts through Go, TypeScript, Python, C#, and Java. Switch between languages to see how patterns translate.",
    accent: "secondary" as const,
  },
  {
    icon: GitBranch,
    title: "Learning Paths",
    description:
      "Follow guided paths through the graph or explore freely. Track progress and get recommendations on what to learn next.",
    accent: "success" as const,
  },
];

export default function Home() {
  return (
    <BodyLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-surface">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary-light),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-card/80 px-4 py-1.5 text-sm text-foreground-secondary shadow-card backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-accent" />
              Open source backend engineering knowledge graph
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Backend Engineering
              <br />
              <span className="text-primary">Knowledge Graph</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-foreground-secondary">
              Learn backend concepts through a connected graph. Understand what
              each topic means, why it exists, what depends on it, and how to
              implement it across multiple languages.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <a
                href="/explore"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-8 text-sm font-semibold text-white shadow-button hover:bg-primary-dark transition-colors"
              >
                Start Exploring
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="/paths"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-surface-card/80 px-8 text-sm font-semibold text-foreground shadow-button backdrop-blur-sm hover:bg-surface-hover transition-colors"
              >
                View Learning Paths
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Concepts", value: "50+" },
              { label: "Languages", value: "5" },
              { label: "Learning Paths", value: "10" },
              { label: "Exercises", value: "40+" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                <p className="text-xs text-foreground-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-foreground">
            How it works
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-foreground-secondary">
            Graphy organizes backend knowledge as a connected map, not a linear
            course.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`animate-fade-in-up delay-${i * 75} rounded-xl border border-border bg-surface-card p-6 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 border-l-[3px] border-l-${feature.accent}`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${feature.accent}-light`}
                >
                  <feature.icon className={`h-5 w-5 text-${feature.accent}`} />
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
      <section className="border-t border-border bg-surface-muted">
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
            {[
              {
                title: "Idempotency",
                description:
                  "Making repeated operations safe through idempotency keys and safe retries.",
                difficulty: "Intermediate",
                domain: "API Design",
                accent: "primary" as const,
                slug: "idempotency",
              },
              {
                title: "Indexes",
                description:
                  "How database indexes speed up queries and the tradeoffs they introduce.",
                difficulty: "Intermediate",
                domain: "Databases",
                accent: "secondary" as const,
                slug: "indexes",
              },
              {
                title: "Circuit Breakers",
                description:
                  "Preventing cascading failures by detecting and isolating faulting services.",
                difficulty: "Advanced",
                domain: "Reliability",
                accent: "destructive" as const,
                slug: "circuit-breakers",
              },
              {
                title: "HTTP",
                description:
                  "The foundation of web communication — methods, status codes, and headers.",
                difficulty: "Beginner",
                domain: "Foundations",
                accent: "warning" as const,
                slug: "http",
              },
            ].map((concept, i) => (
              <a
                key={concept.slug}
                href={`/concepts/${concept.slug}`}
                className={`animate-fade-in-up delay-${i * 75} group rounded-xl border border-border bg-surface-card p-5 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 border-l-[3px] border-l-${concept.accent}`}
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
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl">
            <h2 className="text-2xl font-bold text-foreground">
              Ready to explore backend engineering?
            </h2>
            <p className="mt-2 text-foreground-secondary">
              Start anywhere. Follow the graph. Build your mental model.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <a
                href="/explore"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-8 text-sm font-semibold text-white shadow-button hover:bg-primary-dark transition-colors"
              >
                Start Exploring
                <ArrowRight className="h-4 w-4" />
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
    </BodyLayout>
  );
}
