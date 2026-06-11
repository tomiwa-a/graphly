"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

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
            <svg
              viewBox="0 0 240 240"
              fill="none"
              className="w-full max-w-[280px] opacity-60"
              aria-hidden="true"
            >
              {/* Connection lines */}
              <line x1="80" y1="60" x2="160" y2="100" stroke="#C0392B" strokeWidth="1" opacity="0.2" />
              <line x1="160" y1="100" x2="120" y2="180" stroke="#C0392B" strokeWidth="1" opacity="0.2" />
              <line x1="80" y1="60" x2="120" y2="180" stroke="#C0392B" strokeWidth="1" opacity="0.2" />
              <line x1="160" y1="100" x2="200" y2="50" stroke="#C0392B" strokeWidth="1" opacity="0.15" />
              <line x1="80" y1="60" x2="40" y2="140" stroke="#C0392B" strokeWidth="1" opacity="0.15" />

              {/* Animated nodes */}
              <g style={{ animation: "float-node 4s ease-in-out infinite" }}>
                <circle cx="80" cy="60" r="16" fill="#FDDCDC" stroke="#C0392B" strokeWidth="1" />
                <circle cx="80" cy="60" r="5" fill="#C0392B" />
              </g>
              <g style={{ animation: "float-node 4s ease-in-out infinite 0.8s" }}>
                <circle cx="160" cy="100" r="20" fill="#FEF0F0" stroke="#C0392B" strokeWidth="1" />
                <circle cx="160" cy="100" r="6" fill="#C0392B" />
              </g>
              <g style={{ animation: "float-node 4s ease-in-out infinite 1.6s" }}>
                <circle cx="120" cy="180" r="14" fill="#FDDCDC" stroke="#C0392B" strokeWidth="1" />
                <circle cx="120" cy="180" r="4.5" fill="#C0392B" />
              </g>
              <g style={{ animation: "float-node 5s ease-in-out infinite 0.4s" }}>
                <circle cx="200" cy="50" r="10" fill="#FEF0F0" stroke="#C0392B" strokeWidth="1" opacity="0.6" />
              </g>
              <g style={{ animation: "float-node 5s ease-in-out infinite 1.2s" }}>
                <circle cx="40" cy="140" r="8" fill="#FEF0F0" stroke="#C0392B" strokeWidth="1" opacity="0.5" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
