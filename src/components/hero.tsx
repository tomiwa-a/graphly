"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { HeroGraphic } from "@/components/hero-graphic";

export function Hero({ totalConcepts = 9, totalPaths = 3 }: { totalConcepts?: number; totalPaths?: number }) {
  const [initiated, setInitiated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setInitiated(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative border-b border-border bg-surface overflow-hidden">
      {/* Background glow — soft red wash */}
      <div
        className="absolute left-0 top-0 w-[600px] h-[500px] pointer-events-none opacity-[0.12]"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 30% 40%, var(--color-primary), transparent)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-24 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
          {/* Left column — text content */}
          <div className="lg:col-span-3">
            {/* Eyebrow */}
            <div
              style={{
                opacity: initiated ? 1 : 0,
                transform: initiated ? "translateY(0)" : "translateY(6px)",
                transition:
                  "opacity 600ms var(--ease-graphy), transform 600ms var(--ease-graphy)",
              }}
            >
              <span className="text-xs font-bold tracking-[0.15em] text-foreground-secondary font-heading uppercase">
                Backend Knowledge Graph
              </span>
            </div>

            {/* Headline */}
            <div className="overflow-hidden py-1 mt-4">
              <h1
                className="text-4xl font-medium tracking-[-0.03em] text-foreground sm:text-5xl lg:text-6xl font-heading leading-tight"
                style={{
                  transform: initiated ? "translateY(0)" : "translateY(110%)",
                  transition: "transform 900ms var(--ease-graphy)",
                }}
              >
                Backend Engineering
              </h1>
            </div>
            <div className="overflow-hidden py-1">
              <p
                className="text-4xl font-medium tracking-[-0.03em] sm:text-5xl lg:text-6xl font-heading leading-none text-primary-dark"
                style={{
                  transform: initiated ? "translateY(0)" : "translateY(110%)",
                  transition: "transform 900ms var(--ease-graphy)",
                  transitionDelay: "120ms",
                }}
              >
                Knowledge Graph
              </p>
            </div>

            {/* Description */}
            <p
              className="mt-6 text-base leading-relaxed text-foreground-secondary sm:text-lg max-w-lg font-sans font-medium"
              style={{
                opacity: initiated ? 1 : 0,
                transform: initiated ? "translateY(0)" : "translateY(12px)",
                transition:
                  "opacity 600ms var(--ease-graphy), transform 600ms var(--ease-graphy)",
                transitionDelay: "300ms",
              }}
            >
              Learn backend concepts through a connected graph. Understand what
              each topic means, why it exists, and how to implement it across
              multiple languages.
            </p>

            {/* CTAs */}
            <div
              className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4"
              style={{
                opacity: initiated ? 1 : 0,
                transform: initiated ? "translateY(0)" : "translateY(12px)",
                transition:
                  "opacity 600ms var(--ease-graphy), transform 600ms var(--ease-graphy)",
                transitionDelay: "450ms",
              }}
            >
              <Link
                href="/concepts"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold font-heading text-primary-dark shadow-button hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 select-none cursor-pointer"
              >
                Browse Concepts
                <ArrowRight className="h-4 w-4 stroke-[2.2]" />
              </Link>
              <Link
                href="/graph"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-surface-card px-6 text-sm font-bold font-heading text-foreground shadow-button hover:bg-surface-hover hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 select-none cursor-pointer"
              >
                Interactive Graph
              </Link>
              <Link
                href="/paths"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-surface-card px-6 text-sm font-bold font-heading text-foreground shadow-button hover:bg-surface-hover hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 select-none cursor-pointer"
              >
                View Paths
              </Link>
            </div>

            {/* Stats — inline, understated */}
            <div
              className="mt-8"
              style={{
                opacity: initiated ? 1 : 0,
                transition: "opacity 700ms var(--ease-graphy)",
                transitionDelay: "600ms",
              }}
            >
              <p className="text-sm font-medium text-foreground-secondary font-sans">
                {totalConcepts} concepts · 5 languages · {totalPaths} paths
              </p>
            </div>
          </div>

          {/* Right column — decorative graph nodes */}
          <div className="hidden lg:flex lg:col-span-2 items-center justify-center">
            <HeroGraphic />
          </div>
        </div>
      </div>
    </section>
  );
}
