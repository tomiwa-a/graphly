"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function Hero() {
  const [initiated, setInitiated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setInitiated(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative border-b border-border bg-surface overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none opacity-[0.08]"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 50%, var(--color-primary), transparent)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          {/* Eyebrow */}
          <div
            className="flex items-center justify-center gap-3 mb-6"
            style={{
              opacity: initiated ? 1 : 0,
              transform: initiated ? "translateY(0)" : "translateY(6px)",
              transition:
                "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <span className="h-px w-8 bg-primary/40" />
            <span className="text-[10px] font-medium tracking-[0.18em] text-foreground-muted uppercase">
              Backend Knowledge Graph
            </span>
            <span className="h-px w-8 bg-primary/40" />
          </div>

          {/* Headline */}
          <div className="overflow-hidden">
            <h1
              className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
              style={{
                transform: initiated ? "translateY(0)" : "translateY(110%)",
                transition:
                  "transform 900ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              Backend Engineering
            </h1>
          </div>
          <div className="overflow-hidden mt-1">
            <p
              className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl"
              style={{
                color: "var(--color-primary)",
                fontStyle: "italic",
                transform: initiated ? "translateY(0)" : "translateY(110%)",
                transition:
                  "transform 900ms cubic-bezier(0.16, 1, 0.3, 1)",
                transitionDelay: "120ms",
              }}
            >
              Knowledge Graph
            </p>
          </div>

          {/* Description */}
          <p
            className="mt-6 text-base leading-relaxed text-foreground-secondary sm:text-lg max-w-xl mx-auto"
            style={{
              opacity: initiated ? 1 : 0,
              transform: initiated ? "translateY(0)" : "translateY(12px)",
              transition:
                "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
              transitionDelay: "300ms",
            }}
          >
            Learn backend concepts through a connected graph. Understand what
            each topic means, why it exists, and how to implement it across
            multiple languages.
          </p>

          {/* CTAs */}
          <div
            className="mt-8 flex items-center justify-center gap-3"
            style={{
              opacity: initiated ? 1 : 0,
              transform: initiated ? "translateY(0)" : "translateY(12px)",
              transition:
                "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
              transitionDelay: "450ms",
            }}
          >
            <Link
              href="/concepts"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-dark transition-colors active:scale-[0.98] shadow-button"
            >
              Browse Concepts
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/paths"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface-card px-5 text-sm font-medium text-foreground hover:bg-surface-hover transition-colors active:scale-[0.98]"
            >
              View Paths
            </Link>
          </div>

          {/* Stats */}
          <div
            className="mt-12 flex items-center justify-center gap-8 sm:gap-12"
            style={{
              opacity: initiated ? 1 : 0,
              transition:
                "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1)",
              transitionDelay: "600ms",
            }}
          >
            {[
              { value: "50+", label: "Concepts" },
              { value: "5", label: "Languages" },
              { value: "10", label: "Paths" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-semibold tracking-tight text-primary">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[10px] text-foreground-muted font-mono tracking-[0.15em] uppercase">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
