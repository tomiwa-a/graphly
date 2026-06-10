"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { concepts } from "@/lib/data/concepts";
import { Reveal } from "@/components/reveal";
import { ZoomIn, ZoomOut, Maximize2, List, Grid3X3, Compass } from "lucide-react";
import { JourneyBuilder } from "@/components/graph/journey-builder";
import { SubwayTimeline } from "@/components/graph/subway-timeline";
import { AdvisoryDetours } from "@/components/graph/advisory-detours";
import { ProgressMasteryCard, ResetProgressButton } from "@/components/graph/progress-mastery-card";
import { PrerequisiteWarningBanner } from "@/components/concepts/prerequisite-warning-banner";
import { GraphEngine } from "@/lib/graph-engine";
import { cn } from "@/lib/utils";

type NodePosition = { x: number; y: number };

const nodePositions: Record<string, NodePosition> = {
  http: { x: 100, y: 150 },
  idempotency: { x: 280, y: 80 },
  indexes: { x: 280, y: 220 },
  bits: { x: 100, y: 320 },
  "hash-functions": { x: 280, y: 320 },
  "bloom-filters": { x: 460, y: 320 },
  "circuit-breakers": { x: 460, y: 80 },
  "message-queues": { x: 460, y: 200 },
  "caching-strategies": { x: 620, y: 260 },
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
  { from: "bits", to: "hash-functions", type: "requires" as const },
  { from: "hash-functions", to: "bloom-filters", type: "requires" as const },
  { from: "bloom-filters", to: "caching-strategies", type: "requires" as const },
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
  const [completedSlugs, setCompletedSlugs] = useState<string[]>([]);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  // Synchronize concept completion states from localStorage
  useEffect(() => {
    const loadProgress = () => {
      try {
        const saved = localStorage.getItem("graphy-completed-concepts");
        if (saved) {
          setCompletedSlugs(JSON.parse(saved));
        } else {
          setCompletedSlugs([]);
        }
      } catch {}
    };
    loadProgress();
    window.addEventListener("storage", loadProgress);
    window.addEventListener("concept-completed-updated", loadProgress);
    return () => {
      window.removeEventListener("storage", loadProgress);
      window.removeEventListener("concept-completed-updated", loadProgress);
    };
  }, []);

  const isCompleted = (slug: string) => completedSlugs.includes(slug);

  const isAvailable = (slug: string) => {
    if (isCompleted(slug)) return false;
    const concept = concepts.find((c) => c.slug === slug);
    if (!concept) return false;
    return concept.prerequisites.every((prereq) => completedSlugs.includes(prereq));
  };

  // Upstream prerequisites of hovered node
  const upstreamPrereqs = useMemo(() => {
    if (!hoveredSlug) return null;
    return new Set(concepts.find((c) => c.slug === hoveredSlug)?.prerequisites || []);
  }, [hoveredSlug]);

  // Downstream dependents of hovered node
  const downstreamDependents = useMemo(() => {
    if (!hoveredSlug) return null;
    const deps = new Set<string>();
    concepts.forEach((c) => {
      if (c.prerequisites.includes(hoveredSlug)) deps.add(c.slug);
    });
    return deps;
  }, [hoveredSlug]);

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

          // Determine if this edge is part of the hovered node's flow
          const isIncomingPrereq = hoveredSlug && edge.to === hoveredSlug;
          const isOutgoingDep = hoveredSlug && edge.from === hoveredSlug;
          const isEdgeHovered = isIncomingPrereq || isOutgoingDep;

          const edgeCompleted = isCompleted(edge.from) && isCompleted(edge.to);

          const dimmed =
            (focusedNeighbors &&
              !(focusedNeighbors.has(edge.from) && focusedNeighbors.has(edge.to))) ||
            (hoveredSlug && !isEdgeHovered);

          let strokeColor = "rgba(45,42,38,0.2)";
          if (hoveredSlug) {
            if (isIncomingPrereq) strokeColor = "#C0392B"; // red for prerequisites
            else if (isOutgoingDep) strokeColor = "#e17055"; // orange for downstream
          } else if (edgeCompleted) {
            strokeColor = "#C0392B";
          }

          return (
            <g key={`edge-group-${i}`}>
              {/* Static core line */}
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={strokeColor}
                strokeWidth={isEdgeHovered ? 2.5 : edgeCompleted ? 2.2 : 1.2}
                opacity={dimmed ? 0.05 : 0.6}
                strokeDasharray={edge.type === "related" ? "4 4" : "none"}
                style={{ transition: "all 300ms ease" }}
              />

              {/* Animated flowing line overlay */}
              {((edgeCompleted && !hoveredSlug) || isEdgeHovered) && !dimmed && (
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={strokeColor}
                  strokeWidth={isEdgeHovered ? 3 : 2.5}
                  opacity={isEdgeHovered ? 0.8 : 0.4}
                  strokeDasharray="5 5"
                  className="animate-dash-flow"
                  style={{ transition: "all 300ms ease" }}
                />
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {concepts.map((concept) => {
          const pos = nodePositions[concept.slug];
          if (!pos) return null;

          const isFocused = focusSlug === concept.slug;
          const completed = isCompleted(concept.slug);
          const available = isAvailable(concept.slug);

          // Hover dependency states
          const isNodeHovered = hoveredSlug === concept.slug;
          const isUpstream = upstreamPrereqs?.has(concept.slug);
          const isDownstream = downstreamDependents?.has(concept.slug);
          const isPartOfHoverChain = isNodeHovered || isUpstream || isDownstream;

          const dimmed =
            (focusedNeighbors && !focusedNeighbors.has(concept.slug)) ||
            (hoveredSlug && !isPartOfHoverChain);

          let nodeBorderColor = "rgba(45,42,38,0.15)";
          if (isNodeHovered) {
            nodeBorderColor = "#C0392B";
          } else if (isUpstream) {
            nodeBorderColor = "#C0392B"; // red for prerequisite
          } else if (isDownstream) {
            nodeBorderColor = "#e17055"; // orange for dependent
          } else if (isFocused) {
            nodeBorderColor = "#C0392B";
          }

          return (
            <g
              key={concept.slug}
              className="cursor-pointer"
              onClick={() => onSelectNode(concept.slug)}
              onMouseEnter={() => setHoveredSlug(concept.slug)}
              onMouseLeave={() => setHoveredSlug(null)}
              style={{
                opacity: dimmed ? 0.15 : 1,
                transition: "opacity 300ms ease",
              }}
            >
              {/* Pulse ring for available node */}
              {available && !hoveredSlug && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={42}
                  fill="none"
                  stroke="#C0392B"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  className="opacity-40 animate-pulse-ring"
                />
              )}

              {/* Hover outline ring */}
              {isPartOfHoverChain && !dimmed && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isNodeHovered ? 40 : 34}
                  fill="none"
                  stroke={isNodeHovered ? "#C0392B" : isUpstream ? "#C0392B" : "#e17055"}
                  strokeWidth={1}
                  opacity={0.3}
                  className="animate-pulse-ring"
                />
              )}

              {/* Main Node Circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isNodeHovered || isFocused ? 36 : 30}
                fill={completed ? "#C0392B" : "white"}
                stroke={nodeBorderColor}
                strokeWidth={isNodeHovered || isFocused ? 3.5 : isPartOfHoverChain ? 2.5 : 1.5}
                className="shadow-sm transition-all duration-300"
              />

              {/* Status Indicator Dot */}
              {!completed && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={4.5}
                  fill={diffColor[concept.difficulty]}
                />
              )}

              {/* Checkmark inside completed nodes */}
              {completed && (
                <path
                  d={`M ${pos.x - 5} ${pos.y} L ${pos.x - 1} ${pos.y + 4} L ${pos.x + 6} ${pos.y - 4}`}
                  fill="none"
                  stroke="white"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              <text
                x={pos.x}
                y={pos.y + (isNodeHovered || isFocused ? 24 : 20)}
                textAnchor="middle"
                className={`text-[9px] font-sans ${completed ? "font-bold fill-primary-dark" : "fill-foreground-secondary"} ${isNodeHovered && "fill-foreground font-bold"}`}
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

function MobileMetroLine({
  focusSlug,
  onSelectNode,
}: {
  focusSlug: string | null;
  onSelectNode: (slug: string) => void;
}) {
  const [completedSlugs, setCompletedSlugs] = useState<string[]>([]);

  useEffect(() => {
    const loadProgress = () => {
      try {
        const saved = localStorage.getItem("graphy-completed-concepts");
        if (saved) setCompletedSlugs(JSON.parse(saved));
      } catch {}
    };
    loadProgress();
    window.addEventListener("storage", loadProgress);
    window.addEventListener("concept-completed-updated", loadProgress);
    return () => {
      window.removeEventListener("storage", loadProgress);
      window.removeEventListener("concept-completed-updated", loadProgress);
    };
  }, []);

  const isCompleted = (slug: string) => completedSlugs.includes(slug);
  const isAvailable = (slug: string) => {
    if (isCompleted(slug)) return false;
    const c = concepts.find((cc) => cc.slug === slug);
    return c ? c.prerequisites.every((p) => completedSlugs.includes(p)) : false;
  };

  // Sort topologically for mobile stacked rendering
  const sortedConcepts = useMemo(() => {
    const slugs = concepts.map((c) => c.slug);
    const sorted = GraphEngine.topologicalSort(slugs);
    return sorted.map((s) => concepts.find((c) => c.slug === s)!);
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-[20px] bg-surface-muted/30 border border-border p-4 mb-4 text-center">
        <p className="text-xs text-foreground-secondary font-sans">
          📱 Stacking graph nodes as a vertical sequence for optimal mobile reading. Click a station to inspect.
        </p>
      </div>

      <div className="relative pl-6 space-y-6">
        <div className="absolute left-[17px] top-3 bottom-3 w-0.5 bg-border" />

        {sortedConcepts.map((concept, idx) => {
          const completed = isCompleted(concept.slug);
          const active = isAvailable(concept.slug);
          const selected = focusSlug === concept.slug;

          return (
            <div
              key={`mobile-metro-${concept.slug}`}
              onClick={() => onSelectNode(concept.slug)}
              className={cn(
                "relative flex items-start gap-4 p-4 rounded-2xl border bg-surface-card shadow-sm cursor-pointer transition-all duration-200 active:scale-[0.98]",
                selected ? "border-primary-dark ring-1 ring-primary-dark/30 shadow-md" : "border-border",
                active && "border-primary-dark/30 bg-primary-muted/10"
              )}
            >
              {/* Circle badge on timeline */}
              <div className="absolute left-[-21px] top-[18px] z-10 flex h-4 w-4 items-center justify-center rounded-full bg-white border border-border">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    completed ? "bg-primary-dark" : active ? "bg-primary animate-pulse" : "bg-foreground-dim"
                  )}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-mono text-foreground-secondary">
                    STATION {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className={cn(
                    "text-[8px] font-heading font-bold rounded-full px-2 py-0.5 uppercase",
                    completed ? "bg-success-light text-success-dark" : active ? "bg-primary-light text-primary-dark animate-pulse" : "bg-surface-muted text-foreground-muted"
                  )}>
                    {completed ? "Mastered" : active ? "Learn Next" : "Locked"}
                  </span>
                </div>
                <h4 className="mt-1 text-sm font-medium font-heading text-foreground truncate">
                  {concept.title}
                </h4>
                <p className="mt-1 text-xs text-foreground-secondary line-clamp-2 font-sans">
                  {concept.summary}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView() {
  const [completedSlugs, setCompletedSlugs] = useState<string[]>([]);

  useEffect(() => {
    const loadProgress = () => {
      try {
        const saved = localStorage.getItem("graphy-completed-concepts");
        if (saved) setCompletedSlugs(JSON.parse(saved));
      } catch {}
    };
    loadProgress();
    window.addEventListener("storage", loadProgress);
    window.addEventListener("concept-completed-updated", loadProgress);
    return () => {
      window.removeEventListener("storage", loadProgress);
      window.removeEventListener("concept-completed-updated", loadProgress);
    };
  }, []);

  return (
    <div className="rounded-[24px] border border-border bg-surface-card shadow-card overflow-hidden">
      <table className="w-full text-sm font-sans">
        <thead>
          <tr className="border-b border-border bg-surface-muted/50">
            <th className="px-5 py-3 text-left text-xs font-heading font-bold text-foreground-secondary uppercase tracking-[0.1em]">
              Status
            </th>
            <th className="px-5 py-3 text-left text-xs font-heading font-bold text-foreground-secondary uppercase tracking-[0.1em]">
              Concept
            </th>
            <th className="px-5 py-3 text-left text-xs font-heading font-bold text-foreground-secondary uppercase tracking-[0.1em] hidden sm:table-cell">
              Domain
            </th>
            <th className="px-5 py-3 text-left text-xs font-heading font-bold text-foreground-secondary uppercase tracking-[0.1em] hidden sm:table-cell">
              Difficulty
            </th>
          </tr>
        </thead>
        <tbody>
          {concepts.map((c) => {
            const completed = completedSlugs.includes(c.slug);
            return (
              <tr
                key={c.slug}
                className="border-b border-border last:border-0 hover:bg-surface-hover/50 transition-colors"
              >
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold font-heading ${
                      completed
                        ? "bg-success-light text-success-dark border border-success-dark/20"
                        : "bg-surface-muted text-foreground-secondary border border-border"
                    }`}
                  >
                    {completed ? "Mastered ✓" : "In Progress"}
                  </span>
                </td>
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function GraphPage() {
  const [view, setView] = useState<"graph" | "journey" | "list">("journey");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [syllabus, setSyllabus] = useState<ReturnType<typeof GraphEngine.compileSyllabus>>([]);
  const [startSlug, setStartSlug] = useState("bits");
  const [targetSlug, setTargetSlug] = useState("caching-strategies");

  const selectedConcept = selectedSlug
    ? concepts.find((c) => c.slug === selectedSlug)
    : null;

  // Initialize default journey timeline on mount
  useEffect(() => {
    const defaultSyllabus = GraphEngine.compileSyllabus("bits", "caching-strategies");
    setSyllabus(defaultSyllabus);
  }, []);

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
              onClick={() => setView("journey")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-heading font-bold transition-all duration-200 cursor-pointer ${
                view === "journey"
                  ? "bg-primary-light text-primary-dark"
                  : "text-foreground-secondary hover:text-foreground border border-border"
              }`}
            >
              <Compass className="h-4 w-4" />
              Journey Mode
            </button>
            <button
              onClick={() => setView("graph")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-heading font-bold transition-all duration-200 cursor-pointer ${
                view === "graph"
                  ? "bg-primary-light text-primary-dark"
                  : "text-foreground-secondary hover:text-foreground border border-border"
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
              Graph View
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
              List View
            </button>
          </div>
        </div>
      </Reveal>

      {view === "journey" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {syllabus.length > 0 ? (
              <SubwayTimeline
                syllabus={syllabus}
                startSlug={startSlug}
                targetSlug={targetSlug}
              />
            ) : (
              <div className="rounded-[24px] border border-border bg-surface-card p-12 text-center shadow-card">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-light text-primary-dark border border-primary/25">
                  <Compass className="h-8 w-8 animate-spin" />
                </div>
                <h3 className="mt-6 text-xl font-medium font-heading text-foreground tracking-[-0.02em]">
                  No active journey compiled yet
                </h3>
                <p className="mt-2 text-sm text-foreground-secondary font-sans max-w-sm mx-auto leading-relaxed">
                  Select a starting concept and a target goal in the builder on the right to compile a custom subway learning timeline!
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      const defaultSyllabus = GraphEngine.compileSyllabus("bits", "caching-strategies");
                      setSyllabus(defaultSyllabus);
                      setStartSlug("bits");
                      setTargetSlug("caching-strategies");
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold font-heading text-primary-dark shadow-button hover:bg-primary/95 transition-all cursor-pointer"
                  >
                    Try: Bits ➔ Caching Strategies
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="lg:col-span-1 space-y-6">
            <JourneyBuilder
              onCompile={(compiledSyllabus, start, goal) => {
                setSyllabus(compiledSyllabus);
                setStartSlug(start);
                setTargetSlug(goal);
              }}
            />
            <ProgressMasteryCard />
            {syllabus.length > 0 && <AdvisoryDetours syllabus={syllabus} />}
            <div className="flex justify-end">
              <ResetProgressButton
                onReset={() => {
                  setSyllabus([]);
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {view === "graph" ? (
              <>
                {/* Desktop SVG Canvas */}
                <div className="hidden md:block">
                  <GraphView
                    focusSlug={selectedSlug}
                    onSelectNode={setSelectedSlug}
                  />
                </div>
                {/* Mobile Responsive Metro Line Stack */}
                <div className="block md:hidden">
                  <MobileMetroLine
                    focusSlug={selectedSlug}
                    onSelectNode={setSelectedSlug}
                  />
                </div>
              </>
            ) : (
              <ListView />
            )}
          </div>

          {/* Side panel for Graph selection detail */}
          <div className="lg:col-span-1">
            {selectedConcept ? (
              <Reveal>
                <div className="rounded-[24px] border border-border bg-surface-card p-6 shadow-card sticky top-24 space-y-4">
                  <div>
                    <p className="text-xs font-bold tracking-[0.15em] text-foreground-secondary uppercase font-heading mb-1">
                      Selected
                    </p>
                    <h2 className="text-xl font-medium font-heading text-foreground">
                      {selectedConcept.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-foreground-secondary font-sans">
                      {selectedConcept.summary}
                    </p>
                  </div>

                  {/* Dynamic Prerequisite Warning Banner inside Side Panel */}
                  <PrerequisiteWarningBanner
                    slug={selectedConcept.slug}
                    prerequisites={selectedConcept.prerequisites}
                  />

                  <div className="flex flex-wrap items-center gap-2 pt-1">
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
                  <div className="flex flex-col gap-2 pt-1 border-t border-border/40">
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
                  <div className="flex gap-3 pt-3 border-t border-border/40">
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
                  Click a node in the graph view to see its details here.
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
      )}
    </div>
  );
}
