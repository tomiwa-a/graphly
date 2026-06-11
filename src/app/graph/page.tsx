"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { concepts } from "@/lib/data/concepts";
import { chapters, type Chapter } from "@/lib/data/chapters";
import { Reveal } from "@/components/reveal";
import { ZoomIn, ZoomOut, Maximize2, List, Grid3X3, Compass, ChevronDown, ChevronUp } from "lucide-react";
import { JourneyBuilder } from "@/components/graph/journey-builder";
import { SubwayTimeline } from "@/components/graph/subway-timeline";
import { AdvisoryDetours } from "@/components/graph/advisory-detours";
import { ProgressMasteryCard, ResetProgressButton } from "@/components/graph/progress-mastery-card";
import { PrerequisiteWarningBanner } from "@/components/concepts/prerequisite-warning-banner";
import { GraphEngine } from "@/lib/graph-engine";
import { cn } from "@/lib/utils";

type NodePosition = { x: number; y: number };

const nodePositions: Record<string, NodePosition> = {
  // Foundations
  bits: { x: 80, y: 100 },
  "processes-threads": { x: 80, y: 220 },
  "virtual-memory": { x: 80, y: 340 },
  "file-descriptors": { x: 80, y: 460 },
  "hash-functions": { x: 220, y: 150 },
  http: { x: 220, y: 320 },

  // API Design
  idempotency: { x: 410, y: 100 },
  grpc: { x: 410, y: 200 },

  // Infrastructure
  containerization: { x: 410, y: 320 },
  docker: { x: 410, y: 400 },
  kubernetes: { x: 410, y: 480 },

  // Reliability & Scale
  "circuit-breakers": { x: 590, y: 100 },
  "vector-clocks": { x: 720, y: 80 },
  "message-queues": { x: 720, y: 180 },

  // Database Systems
  indexes: { x: 590, y: 300 },
  "bloom-filters": { x: 590, y: 420 },
  "lsm-trees": { x: 720, y: 300 },
  "change-data-capture": { x: 720, y: 420 },

  // Caching Infrastructure
  "caching-strategies": { x: 860, y: 360 }
};

const chapterBoxes = [
  { id: "foundations", title: "Foundations", x: 30, y: 40, w: 260, h: 470 },
  { id: "api-design", title: "API Design", x: 320, y: 40, w: 180, h: 220 },
  { id: "infrastructure", title: "Infrastructure", x: 320, y: 280, w: 180, h: 230 },
  { id: "reliability", title: "Reliability & Scale", x: 530, y: 40, w: 240, h: 200 },
  { id: "databases", title: "Database Systems", x: 530, y: 260, w: 240, h: 250 },
  { id: "caching", title: "Caching Infrastructure", x: 800, y: 290, w: 120, h: 140 }
];

const diffColor: Record<string, string> = {
  beginner: "#00b894",
  intermediate: "#e17055",
  advanced: "#d63031",
};

const edges = (() => {
  const list: { from: string; to: string; type: "requires" | "related" }[] = [];
  const requiresPairs = new Set<string>();

  concepts.forEach((concept) => {
    concept.prerequisites.forEach((prereq) => {
      list.push({
        from: prereq,
        to: concept.slug,
        type: "requires"
      });
      requiresPairs.add(`${prereq}->${concept.slug}`);
      requiresPairs.add(`${concept.slug}->${prereq}`);
    });
  });

  const seenRelatedPairs = new Set<string>();
  concepts.forEach((concept) => {
    concept.related.forEach((rel) => {
      const pairKey = `${concept.slug}->${rel}`;
      const revPairKey = `${rel}->${concept.slug}`;
      if (!requiresPairs.has(pairKey) && !requiresPairs.has(revPairKey)) {
        const [first, second] = [concept.slug, rel].sort();
        const dupKey = `${first}->${second}`;
        if (!seenRelatedPairs.has(dupKey)) {
          list.push({
            from: concept.slug,
            to: rel,
            type: "related"
          });
          seenRelatedPairs.add(dupKey);
        }
      }
    });
  });

  return list;
})();

function GraphView({
  focusSlug,
  onSelectNode,
}: {
  focusSlug: string | null;
  onSelectNode: (slug: string | null) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [completedSlugs, setCompletedSlugs] = useState<string[]>([]);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);

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

  const handleChapterClick = (chapterId: string) => {
    if (activeChapter === chapterId) {
      setActiveChapter(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      onSelectNode(null);
    } else {
      setActiveChapter(chapterId);
      const box = chapterBoxes.find((b) => b.id === chapterId);
      if (box) {
        const nextZoom = Math.min(Math.min(960 / (box.w + 60), 540 / (box.h + 60)), 1.8);
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;
        const panX = (960 / 2) / nextZoom - cx;
        const panY = (540 / 2) / nextZoom - cy;
        setZoom(nextZoom);
        setPan({ x: panX, y: panY });
      }
    }
  };

  const handleCanvasClick = () => {
    setActiveChapter(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    onSelectNode(null);
  };

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
            setActiveChapter(null);
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
        viewBox="0 0 960 540"
        className="w-full h-[450px] sm:h-[580px]"
        style={{
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: "0 0",
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
        <rect
          width="960"
          height="540"
          fill="url(#dots)"
          className="cursor-grab"
          onClick={handleCanvasClick}
        />

        {/* Chapter Bounding Boxes */}
        {chapterBoxes.map((box) => {
          const isActive = activeChapter === box.id;
          const isDimmed = activeChapter && activeChapter !== box.id;

          return (
            <g
              key={`chapter-box-${box.id}`}
              className="cursor-pointer transition-all duration-300"
              onClick={(e) => {
                e.stopPropagation();
                handleChapterClick(box.id);
              }}
              style={{
                opacity: isDimmed ? 0.22 : 1,
              }}
            >
              <rect
                x={box.x}
                y={box.y}
                width={box.w}
                height={box.h}
                rx={16}
                fill={isActive ? "rgba(192, 57, 43, 0.01)" : "rgba(45, 42, 38, 0.01)"}
                stroke={isActive ? "#C0392B" : "rgba(45, 42, 38, 0.04)"}
                strokeWidth={isActive ? 2 : 1.2}
                strokeDasharray={isActive ? "none" : "3 3"}
                pointerEvents="all"
                className="hover:fill-primary-muted/20 hover:stroke-primary-dark/20 transition-all duration-300"
              />
              <text
                x={box.x + 12}
                y={box.y + 22}
                className={`text-[7px] font-heading font-bold tracking-[0.1em] uppercase select-none transition-colors ${isActive ? "fill-primary-dark" : "fill-foreground-muted"}`}
              >
                {box.title}
              </text>
            </g>
          );
        })}

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

          const fromConcept = concepts.find(c => c.slug === edge.from);
          const toConcept = concepts.find(c => c.slug === edge.to);

          // Dim edges that belong to inactive chapters if a chapter is focused
          const isEdgeInActiveChapter = activeChapter 
            ? (fromConcept?.chapterId === activeChapter && toConcept?.chapterId === activeChapter)
            : true;

          const dimmed =
            (focusedNeighbors &&
              !(focusedNeighbors.has(edge.from) && focusedNeighbors.has(edge.to))) ||
            (hoveredSlug && !isEdgeHovered) ||
            (!isEdgeInActiveChapter);

          let strokeColor = "rgba(45,42,38,0.2)";
          if (hoveredSlug) {
            if (isIncomingPrereq) strokeColor = "#C0392B"; 
            else if (isOutgoingDep) strokeColor = "#e17055"; 
          } else if (edgeCompleted) {
            strokeColor = "#C0392B";
          }

          return (
            <g key={`edge-group-${i}`}>
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

              {/* Flow Overlay animation */}
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

          // Dim nodes not in the active chapter
          const isNodeInActiveChapter = activeChapter ? concept.chapterId === activeChapter : true;

          const dimmed =
            (focusedNeighbors && !focusedNeighbors.has(concept.slug)) ||
            (hoveredSlug && !isPartOfHoverChain) ||
            (!isNodeInActiveChapter);

          let nodeBorderColor = "rgba(45,42,38,0.15)";
          if (isNodeHovered) {
            nodeBorderColor = "#C0392B";
          } else if (isUpstream) {
            nodeBorderColor = "#C0392B";
          } else if (isDownstream) {
            nodeBorderColor = "#e17055";
          } else if (isFocused) {
            nodeBorderColor = "#C0392B";
          }

          return (
            <g
              key={concept.slug}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (focusSlug === concept.slug) {
                  onSelectNode(null);
                } else {
                  onSelectNode(concept.slug);
                }
              }}
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
                className={`text-[9px] font-sans ${completed ? "font-bold fill-white" : isNodeHovered ? "fill-foreground font-bold" : "fill-foreground-secondary"}`}
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
  onSelectNode: (slug: string | null) => void;
}) {
  const [completedSlugs, setCompletedSlugs] = useState<string[]>([]);
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({
    foundations: true,
    databases: true,
  });

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

  const toggleChapter = (chapterId: string) => {
    setOpenChapters((prev) => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[20px] bg-surface-muted/30 border border-border p-4 mb-4 text-center">
        <p className="text-xs text-foreground-secondary font-sans">
          📱 Stacking chapters into collapsible mobile accordions. Open a chapter to check your sub-stops.
        </p>
      </div>

      <div className="space-y-3">
        {chapters.map((chapter) => {
          const chapterConcepts = concepts.filter((c) => c.chapterId === chapter.id);
          const completedCount = chapterConcepts.filter((c) => isCompleted(c.slug)).length;
          const totalCount = chapterConcepts.length;
          const chapterProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
          const isOpen = openChapters[chapter.id];

          return (
            <div
              key={`mobile-chapter-${chapter.id}`}
              className="rounded-[20px] border border-border bg-surface-card overflow-hidden shadow-sm transition-all"
            >
              {/* Accordion Header */}
              <button
                onClick={() => toggleChapter(chapter.id)}
                className="w-full flex items-center justify-between p-4 bg-surface-card hover:bg-surface-muted/30 transition-colors text-left border-b border-transparent cursor-pointer"
              >
                <div>
                  <h4 className="font-heading font-medium text-sm text-foreground">
                    {chapter.title}
                  </h4>
                  <p className="text-[10px] text-foreground-muted font-sans mt-0.5">
                    {completedCount}/{totalCount} mastered ({chapterProgress}%) • {chapter.estimatedHours}h
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-16 rounded-full bg-surface-muted overflow-hidden hidden sm:block">
                    <div
                      className="h-full bg-primary-dark transition-all duration-300"
                      style={{ width: `${chapterProgress}%` }}
                    />
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-foreground-secondary" /> : <ChevronDown className="h-4 w-4 text-foreground-secondary" />}
                </div>
              </button>

              {/* Accordion Content */}
              {isOpen && (
                <div className="p-4 bg-surface-muted/10 border-t border-border/40 space-y-3">
                  <p className="text-[11px] text-foreground-secondary font-sans leading-relaxed italic mb-2">
                    {chapter.summary}
                  </p>
                  <div className="relative pl-6 space-y-4">
                    <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />

                    {chapterConcepts.map((concept, idx) => {
                      const completed = isCompleted(concept.slug);
                      const active = isAvailable(concept.slug);
                      const selected = focusSlug === concept.slug;

                      return (
                        <div
                          key={`mobile-metro-${concept.slug}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (focusSlug === concept.slug) {
                              onSelectNode(null);
                            } else {
                              onSelectNode(concept.slug);
                            }
                          }}
                          className={cn(
                            "relative flex items-start gap-3 p-3 rounded-xl border bg-surface-card shadow-sm cursor-pointer transition-all duration-200 active:scale-[0.98]",
                            selected ? "border-primary-dark ring-1 ring-primary-dark/30" : "border-border",
                            active && "border-primary-dark/30 bg-primary-muted/5"
                          )}
                        >
                          <div className="absolute left-[-23px] top-[14px] z-10 flex h-3 w-3 items-center justify-center rounded-full bg-white border border-border">
                            <div
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                completed ? "bg-primary-dark" : active ? "bg-primary animate-pulse" : "bg-foreground-dim"
                              )}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="text-xs font-heading font-medium text-foreground truncate">
                                {concept.title}
                              </h5>
                              <span className={cn(
                                "text-[7px] font-heading font-bold rounded-full px-1.5 py-0.2 uppercase tracking-wider shrink-0",
                                completed ? "bg-success-light text-success-dark" : active ? "bg-primary-light text-primary-dark" : "bg-surface-muted text-foreground-muted"
                              )}>
                                {completed ? "Mastered" : active ? "Learn Next" : "Locked"}
                              </span>
                            </div>
                            <p className="mt-1 text-[10px] text-foreground-secondary line-clamp-1 font-sans">
                              {concept.summary}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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

function GraphPageContent() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<"graph" | "journey" | "list">("graph");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [syllabus, setSyllabus] = useState<ReturnType<typeof GraphEngine.compileSyllabus>>([]);
  const [startSlug, setStartSlug] = useState("bits");
  const [targetSlug, setTargetSlug] = useState("caching-strategies");

  const selectedConcept = selectedSlug
    ? concepts.find((c) => c.slug === selectedSlug)
    : null;

  useEffect(() => {
    const tab = searchParams.get("tab") || searchParams.get("view");
    if (tab === "journey" || tab === "list" || tab === "graph") {
      setView(tab);
    }
  }, [searchParams]);

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
            <div className="sticky top-24 space-y-6">
              {selectedConcept ? (
                <Reveal>
                  <div className="rounded-[24px] border border-border bg-surface-card p-6 shadow-card space-y-4">
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
                </div>
              )}

              {/* Dynamic Persistent Legend Card */}
              <div className="rounded-[24px] border border-border bg-surface-card p-6 shadow-card">
                <h3 className="text-xs font-bold tracking-[0.15em] text-foreground-secondary uppercase font-heading mb-4">
                  Graph Legend
                </h3>
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3">
                    <span className="h-0.5 w-6 bg-[#C0392B]/60 rounded" />
                    <span className="text-xs text-foreground-secondary font-sans font-medium">
                      Prerequisite connection (solid)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-0.5 w-6 border-t border-dashed border-[#C0392B]/40" />
                    <span className="text-xs text-foreground-secondary font-sans font-medium">
                      Related connection (dashed)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#00b894] ring-2 ring-[#00b894]/20" />
                    <span className="text-xs text-foreground-secondary font-sans font-medium">
                      Beginner Concept
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#e17055] ring-2 ring-[#e17055]/20" />
                    <span className="text-xs text-foreground-secondary font-sans font-medium">
                      Intermediate Concept
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#d63031] ring-2 ring-[#d63031]/20" />
                    <span className="text-xs text-foreground-secondary font-sans font-medium">
                      Advanced Concept
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-[#C0392B] flex items-center justify-center shadow-sm">
                      <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <span className="text-xs text-foreground-secondary font-sans font-medium">
                      Mastered / Completed Concept
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-6xl px-5 py-20 text-center text-foreground-secondary font-sans">
        Loading knowledge graph...
      </div>
    }>
      <GraphPageContent />
    </Suspense>
  );
}
