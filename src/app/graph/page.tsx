"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { concepts } from "@/lib/data/concepts";
import { Reveal } from "@/components/reveal";
import { ZoomIn, ZoomOut, Maximize2, List, Grid3X3 } from "lucide-react";

type NodePosition = { x: number; y: number };

const nodePositions: Record<string, NodePosition> = {
  http: { x: 120, y: 200 },
  idempotency: { x: 350, y: 100 },
  indexes: { x: 350, y: 300 },
  "circuit-breakers": { x: 580, y: 60 },
  "message-queues": { x: 580, y: 200 },
  "caching-strategies": { x: 580, y: 340 },
};

const diffColor: Record<string, string> = {
  beginner: "#00b894",
  intermediate: "#e17055",
  advanced: "#d63031",
};

const edges = [
  { from: "http", to: "idempotency", type: "requires" as const },
  { from: "http", to: "indexes", type: "requires" as const },
  { from: "http", to: "message-queues", type: "requires" as const },
  { from: "http", to: "caching-strategies", type: "requires" as const },
  { from: "idempotency", to: "circuit-breakers", type: "requires" as const },
  { from: "idempotency", to: "message-queues", type: "related" as const },
  { from: "indexes", to: "caching-strategies", type: "related" as const },
  { from: "circuit-breakers", to: "message-queues", type: "related" as const },
];

function GraphView({
  focusSlug,
  onSelectNode,
}: {
  focusSlug: string | null;
  onSelectNode: (slug: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const focusedNeighbors = useMemo(() => {
    if (!focusSlug) return null;
    const neighbors = new Set<string>([focusSlug]);
    edges.forEach((e) => {
      if (e.from === focusSlug) neighbors.add(e.to);
      if (e.to === focusSlug) neighbors.add(e.from);
    });
    return neighbors;
  }, [focusSlug]);

  return (
    <div className="relative rounded-[24px] border border-border bg-surface-card shadow-card overflow-hidden">
      {/* Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-card shadow-button hover:bg-surface-hover transition-all cursor-pointer"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-card shadow-button hover:bg-surface-hover transition-all cursor-pointer"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-card shadow-button hover:bg-surface-hover transition-all cursor-pointer"
          aria-label="Reset view"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      <svg
        viewBox="0 0 720 400"
        className="w-full h-[400px] sm:h-[500px]"
        style={{
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: "center",
          transition: "transform 300ms ease",
        }}
      >
        {/* Dot grid background */}
        <defs>
          <pattern
            id="dots"
            x="0"
            y="0"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="0.8" fill="rgba(45,42,38,0.06)" />
          </pattern>
        </defs>
        <rect width="720" height="400" fill="url(#dots)" />

        {/* Edges */}
        {edges.map((edge, i) => {
          const from = nodePositions[edge.from];
          const to = nodePositions[edge.to];
          if (!from || !to) return null;

          const dimmed =
            focusedNeighbors &&
            !(focusedNeighbors.has(edge.from) && focusedNeighbors.has(edge.to));

          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#C0392B"
              strokeWidth="1"
              opacity={dimmed ? 0.06 : edge.type === "requires" ? 0.25 : 0.12}
              strokeDasharray={edge.type === "related" ? "4 4" : "none"}
              style={{ transition: "opacity 300ms ease" }}
            />
          );
        })}

        {/* Nodes */}
        {concepts.map((concept) => {
          const pos = nodePositions[concept.slug];
          if (!pos) return null;

          const dimmed = focusedNeighbors && !focusedNeighbors.has(concept.slug);
          const isFocused = focusSlug === concept.slug;

          return (
            <g
              key={concept.slug}
              className="cursor-pointer"
              onClick={() => onSelectNode(concept.slug)}
              style={{
                opacity: dimmed ? 0.15 : 1,
                transition: "opacity 300ms ease",
              }}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isFocused ? 38 : 32}
                fill="white"
                stroke={isFocused ? "#C0392B" : "rgba(45,42,38,0.1)"}
                strokeWidth={isFocused ? 2 : 1}
                style={{ transition: "all 300ms ease" }}
              />
              <circle
                cx={pos.x}
                cy={pos.y}
                r={4}
                fill={diffColor[concept.difficulty]}
              />
              <text
                x={pos.x}
                y={pos.y + 20}
                textAnchor="middle"
                className="text-[9px] font-sans fill-foreground-secondary"
                style={{ pointerEvents: "none" }}
              >
                {concept.title.length > 16
                  ? concept.title.slice(0, 14) + "…"
                  : concept.title}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ListView() {
  return (
    <div className="rounded-[24px] border border-border bg-surface-card shadow-card overflow-hidden">
      <table className="w-full text-sm font-sans">
        <thead>
          <tr className="border-b border-border bg-surface-muted/50">
            <th className="px-5 py-3 text-left text-xs font-heading font-bold text-foreground-secondary uppercase tracking-[0.1em]">
              Concept
            </th>
            <th className="px-5 py-3 text-left text-xs font-heading font-bold text-foreground-secondary uppercase tracking-[0.1em] hidden sm:table-cell">
              Domain
            </th>
            <th className="px-5 py-3 text-left text-xs font-heading font-bold text-foreground-secondary uppercase tracking-[0.1em] hidden sm:table-cell">
              Difficulty
            </th>
            <th className="px-5 py-3 text-left text-xs font-heading font-bold text-foreground-secondary uppercase tracking-[0.1em] hidden md:table-cell">
              Prerequisites
            </th>
          </tr>
        </thead>
        <tbody>
          {concepts.map((c) => (
            <tr
              key={c.slug}
              className="border-b border-border last:border-0 hover:bg-surface-hover/50 transition-colors"
            >
              <td className="px-5 py-3">
                <Link
                  href={`/concepts/${c.slug}`}
                  className="font-medium font-heading text-foreground hover:text-primary-dark transition-colors"
                >
                  {c.title}
                </Link>
              </td>
              <td className="px-5 py-3 text-foreground-secondary hidden sm:table-cell">
                {c.domain}
              </td>
              <td className="px-5 py-3 hidden sm:table-cell">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold font-heading ${
                    c.difficulty === "beginner"
                      ? "bg-success-light text-success-dark"
                      : c.difficulty === "intermediate"
                      ? "bg-warning-light text-warning-dark"
                      : "bg-destructive-light text-destructive-dark"
                  }`}
                >
                  {c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1)}
                </span>
              </td>
              <td className="px-5 py-3 text-foreground-secondary hidden md:table-cell">
                {c.prerequisites.length > 0
                  ? c.prerequisites
                      .map(
                        (p) =>
                          concepts.find((cc) => cc.slug === p)?.title ?? p
                      )
                      .join(", ")
                  : "None"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GraphPage() {
  const [view, setView] = useState<"graph" | "list">("graph");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const selectedConcept = selectedSlug
    ? concepts.find((c) => c.slug === selectedSlug)
    : null;

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold tracking-[0.15em] text-foreground-secondary uppercase font-heading">
              Knowledge Graph
            </p>
            <h1 className="mt-2 text-3xl font-medium tracking-[-0.03em] text-foreground font-heading sm:text-4xl">
              Explore connections.
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView("graph")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-heading font-bold transition-all duration-200 cursor-pointer ${
                view === "graph"
                  ? "bg-primary-light text-primary-dark"
                  : "text-foreground-secondary hover:text-foreground border border-border"
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
              Graph
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-heading font-bold transition-all duration-200 cursor-pointer ${
                view === "list"
                  ? "bg-primary-light text-primary-dark"
                  : "text-foreground-secondary hover:text-foreground border border-border"
              }`}
            >
              <List className="h-4 w-4" />
              List
            </button>
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {view === "graph" ? (
            <GraphView
              focusSlug={selectedSlug}
              onSelectNode={setSelectedSlug}
            />
          ) : (
            <ListView />
          )}
        </div>

        {/* Side panel */}
        <div className="lg:col-span-1">
          {selectedConcept ? (
            <Reveal>
              <div className="rounded-[24px] border border-border bg-surface-card p-6 shadow-card sticky top-24">
                <p className="text-xs font-bold tracking-[0.15em] text-foreground-secondary uppercase font-heading mb-1">
                  Selected
                </p>
                <h2 className="text-xl font-medium font-heading text-foreground">
                  {selectedConcept.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-foreground-secondary font-sans">
                  {selectedConcept.summary}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold font-heading ${
                      selectedConcept.difficulty === "beginner"
                        ? "bg-success-light text-success-dark"
                        : selectedConcept.difficulty === "intermediate"
                        ? "bg-warning-light text-warning-dark"
                        : "bg-destructive-light text-destructive-dark"
                    }`}
                  >
                    {selectedConcept.difficulty.charAt(0).toUpperCase() +
                      selectedConcept.difficulty.slice(1)}
                  </span>
                  <span className="text-xs text-foreground-secondary font-sans">
                    {selectedConcept.domain}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-foreground-muted" />
                  <span className="text-xs text-foreground-secondary font-sans">
                    {selectedConcept.estimatedMinutes}m
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {selectedConcept.prerequisites.length > 0 && (
                    <p className="text-xs text-foreground-secondary font-sans">
                      <span className="font-medium">Requires:</span>{" "}
                      {selectedConcept.prerequisites
                        .map(
                          (p) =>
                            concepts.find((cc) => cc.slug === p)?.title ?? p
                        )
                        .join(", ")}
                    </p>
                  )}
                  {selectedConcept.related.length > 0 && (
                    <p className="text-xs text-foreground-secondary font-sans">
                      <span className="font-medium">Related:</span>{" "}
                      {selectedConcept.related
                        .map(
                          (p) =>
                            concepts.find((cc) => cc.slug === p)?.title ?? p
                        )
                        .join(", ")}
                    </p>
                  )}
                </div>
                <div className="mt-6 flex gap-3">
                  <Link
                    href={`/concepts/${selectedConcept.slug}`}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold font-heading text-primary-dark shadow-button hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 cursor-pointer"
                  >
                    Open concept →
                  </Link>
                  <button
                    onClick={() => setSelectedSlug(null)}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-surface-card px-4 text-sm font-heading text-foreground-secondary hover:text-foreground hover:bg-surface-hover transition-all duration-200 cursor-pointer"
                  >
                    Deselect
                  </button>
                </div>
              </div>
            </Reveal>
          ) : (
            <div className="rounded-[24px] border border-border bg-surface-card p-6 shadow-card">
              <p className="text-sm text-foreground-secondary font-sans">
                Click a node in the graph to see its details here.
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-6 border-t border-[#C0392B]/30" />
                  <span className="text-xs text-foreground-muted font-sans">
                    Prerequisite
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-6 border-t border-dashed border-[#C0392B]/20" />
                  <span className="text-xs text-foreground-muted font-sans">
                    Related
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success-dark" />
                  <span className="text-xs text-foreground-muted font-sans">
                    Beginner
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-warning-dark" />
                  <span className="text-xs text-foreground-muted font-sans">
                    Intermediate
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-destructive-dark" />
                  <span className="text-xs text-foreground-muted font-sans">
                    Advanced
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
