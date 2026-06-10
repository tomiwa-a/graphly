import { BodyLayout } from "@/components/layout/body-layout";

export default function Home() {
  return (
    <BodyLayout>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
            Backend Engineering
            <br />
            <span className="text-primary">Knowledge Graph</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-text-secondary">
            Learn backend concepts through a connected graph. Understand what
            each topic means, why it exists, what depends on it, and how to
            implement it across multiple languages.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <a
              href="/explore"
              className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors"
            >
              Start Exploring
            </a>
            <a
              href="/paths"
              className="rounded-lg border border-border px-6 py-3 text-sm font-semibold text-text-primary hover:bg-surface-hover transition-colors"
            >
              View Learning Paths
            </a>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-text-primary">How it works</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface p-6">
              <h3 className="font-semibold text-text-primary">Explore Concepts</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Browse backend topics organized by domain. Each concept explains what it is, why it matters, and how it works.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-6">
              <h3 className="font-semibold text-text-primary">Follow Connections</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Prerequisites and related topics show you how concepts connect across backend engineering.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-6">
              <h3 className="font-semibold text-text-primary">Learn by Doing</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Code examples in multiple languages and exercises help you apply what you learn.
              </p>
            </div>
          </div>
        </div>
      </section>
    </BodyLayout>
  );
}
