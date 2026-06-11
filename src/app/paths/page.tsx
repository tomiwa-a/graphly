import { paths } from "@/lib/data/paths";
import { PathCard } from "@/components/paths/path-card";
import { Reveal } from "@/components/reveal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learning Paths",
  description: "Guided sequences through backend engineering concepts.",
};

export default function PathsPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
      <Reveal>
        <div className="mb-10">
          <p className="text-xs font-bold tracking-[0.15em] text-foreground-secondary uppercase font-heading">
            Learning Paths
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-[-0.03em] text-foreground font-heading sm:text-4xl">
            Guided paths through
            <br className="hidden sm:inline" />
            backend engineering.
          </h1>
          <p className="mt-3 text-base text-foreground-secondary font-sans font-medium max-w-lg">
            Curated sequences from fundamentals to advanced distributed systems.
            Follow a path or build your own.
          </p>
        </div>
      </Reveal>

      <div id="tour-paths-grid" className="grid gap-6 sm:grid-cols-2">
        {paths.map((path, i) => (
          <Reveal key={path.slug} delay={i * 80}>
            <PathCard
              slug={path.slug}
              title={path.title}
              summary={path.summary}
              difficulty={path.difficulty}
              stepCount={path.steps.length}
              estimatedHours={path.estimatedHours}
            />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
