import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-24 sm:py-32">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left — text */}
        <div>
          <p className="text-xs font-bold tracking-[0.15em] text-foreground-secondary uppercase font-heading">
            404
          </p>
          <h1 className="mt-3 text-4xl font-medium tracking-[-0.03em] text-foreground font-heading sm:text-5xl">
            Page not found.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-foreground-secondary font-sans font-medium max-w-md">
            The page you&apos;re looking for doesn&apos;t exist, or it may have
            been moved. Try browsing our concepts or head back home.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-bold font-heading text-primary-dark shadow-button hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 select-none cursor-pointer"
            >
              Go home
            </Link>
            <Link
              href="/concepts"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-surface-card px-6 text-sm font-bold font-heading text-foreground shadow-button hover:bg-surface-hover hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 select-none cursor-pointer"
            >
              Browse concepts
            </Link>
          </div>
        </div>

        {/* Right — decorative disconnected graph */}
        <div className="hidden lg:flex justify-center">
          <svg
            viewBox="0 0 280 280"
            fill="none"
            className="w-full max-w-[260px] opacity-50"
            aria-hidden="true"
          >
            {/* Broken connection lines */}
            <line
              x1="80"
              y1="80"
              x2="130"
              y2="130"
              stroke="#C0392B"
              strokeWidth="1"
              opacity="0.2"
              strokeDasharray="4 6"
            />
            <line
              x1="150"
              y1="130"
              x2="200"
              y2="80"
              stroke="#C0392B"
              strokeWidth="1"
              opacity="0.15"
              strokeDasharray="4 6"
            />
            <line
              x1="140"
              y1="150"
              x2="140"
              y2="220"
              stroke="#C0392B"
              strokeWidth="1"
              opacity="0.1"
              strokeDasharray="4 6"
            />

            {/* Floating disconnected nodes */}
            <g style={{ animation: "float-node 4s ease-in-out infinite" }}>
              <circle
                cx="80"
                cy="80"
                r="24"
                fill="#FEF0F0"
                stroke="#C0392B"
                strokeWidth="1"
              />
              <text
                x="80"
                y="84"
                textAnchor="middle"
                fontSize="20"
                fill="#C0392B"
              >
                ?
              </text>
            </g>

            <g
              style={{ animation: "float-node 4s ease-in-out infinite 1s" }}
            >
              <circle
                cx="200"
                cy="80"
                r="18"
                fill="#FDDCDC"
                stroke="#C0392B"
                strokeWidth="1"
              />
              <circle cx="200" cy="80" r="4" fill="#C0392B" />
            </g>

            <g
              style={{ animation: "float-node 5s ease-in-out infinite 0.5s" }}
            >
              <circle
                cx="140"
                cy="220"
                r="20"
                fill="#FEF0F0"
                stroke="#C0392B"
                strokeWidth="1"
              />
              <circle cx="140" cy="220" r="5" fill="#C0392B" />
            </g>

            <g
              style={{ animation: "float-node 4.5s ease-in-out infinite 1.5s" }}
            >
              <circle
                cx="50"
                cy="200"
                r="12"
                fill="#FEF0F0"
                stroke="#C0392B"
                strokeWidth="1"
                opacity="0.6"
              />
            </g>

            <g
              style={{ animation: "float-node 5s ease-in-out infinite 2s" }}
            >
              <circle
                cx="230"
                cy="190"
                r="10"
                fill="#FDDCDC"
                stroke="#C0392B"
                strokeWidth="1"
                opacity="0.4"
              />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
