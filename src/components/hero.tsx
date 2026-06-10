"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Hero() {
  const [initiated, setInitiated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setInitiated(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative border-b-2 border-border bg-surface overflow-hidden">
      {/* Background glow - soft yellow/peach pastel */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 w-[700px] h-[500px] pointer-events-none opacity-[0.25]"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 50%, var(--color-accent), transparent)",
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
                "opacity 600ms var(--ease-graphy), transform 600ms var(--ease-graphy)",
            }}
          >
            <span className="h-[2px] w-8 bg-border" />
            <span className="text-xs font-bold tracking-[0.15em] text-foreground font-heading uppercase">
              Backend Knowledge Graph
            </span>
            <span className="h-[2px] w-8 bg-border" />
          </div>

          {/* Headline */}
          <div className="overflow-hidden py-1">
            <h1
              className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl font-heading leading-tight"
              style={{
                transform: initiated ? "translateY(0)" : "translateY(110%)",
                transition:
                  "transform 900ms var(--ease-graphy)",
              }}
            >
              Backend Engineering
            </h1>
          </div>
          <div className="overflow-hidden py-1">
            <p
              className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl font-heading leading-none"
              style={{
                color: "var(--color-primary-dark)",
                textShadow: "1px 1px 0px var(--color-border), 2px 2px 0px var(--color-border-light)",
                transform: initiated ? "translateY(0)" : "translateY(110%)",
                transition:
                  "transform 900ms var(--ease-graphy)",
                transitionDelay: "120ms",
              }}
            >
              Knowledge Graph
            </p>
          </div>

          {/* Description */}
          <p
            className="mt-6 text-base leading-relaxed text-foreground-secondary sm:text-lg max-w-xl mx-auto font-sans font-medium"
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
            className="mt-8 flex items-center justify-center gap-4"
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
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-border bg-primary px-6 text-sm font-bold font-heading text-foreground shadow-[0_4px_0_0_var(--color-border)] hover:-translate-y-[1px] hover:shadow-[0_5px_0_0_var(--color-border)] active:translate-y-[2px] active:shadow-[0_2px_0_0_var(--color-border)] transition-all duration-100 select-none cursor-pointer"
            >
              Browse Concepts
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </Link>
            <Link
              href="/paths"
              className="inline-flex h-11 items-center justify-center rounded-xl border-2 border-border bg-surface-card px-6 text-sm font-bold font-heading text-foreground shadow-[0_4px_0_0_var(--color-border)] hover:-translate-y-[1px] hover:shadow-[0_5px_0_0_var(--color-border)] active:translate-y-[2px] active:shadow-[0_2px_0_0_var(--color-border)] transition-all duration-100 select-none cursor-pointer"
            >
              View Paths
            </Link>
          </div>

          {/* Stats Grid using custom Neobrutalist Blocks */}
          <div
            className="mt-16 flex items-center justify-center gap-4 sm:gap-6 max-w-md mx-auto"
            style={{
              opacity: initiated ? 1 : 0,
              transition:
                "opacity 700ms var(--ease-graphy)",
              transitionDelay: "600ms",
            }}
          >
            {[
              { value: "50+", label: "Concepts", bg: "bg-success-light" },
              { value: "5", label: "Languages", bg: "bg-primary-light" },
              { value: "10", label: "Paths", bg: "bg-accent-light" },
            ].map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  "border-2 border-border rounded-2xl p-4 shadow-[3px_3px_0_0_var(--color-border)] text-center flex-1",
                  stat.bg
                )}
              >
                <p className="text-3xl font-bold tracking-tight text-foreground font-heading">
                  {stat.value}
                </p>
                <p className="mt-1 text-[10px] text-foreground-secondary font-mono tracking-[0.1em] uppercase font-bold">
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

