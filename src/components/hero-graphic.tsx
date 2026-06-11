"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";

interface HeroNode {
  id: string;
  label: string;
  cx: number;
  cy: number;
  r: number;
  difficulty: "beginner" | "intermediate" | "advanced";
}

interface HeroEdge {
  from: string;
  to: string;
}

const NODES: HeroNode[] = [
  { id: "node1", label: "HTTP Foundations", cx: 80, cy: 60, r: 16, difficulty: "beginner" },
  { id: "node2", label: "LSM-Trees", cx: 160, cy: 100, r: 20, difficulty: "intermediate" },
  { id: "node3", label: "Bloom Filters", cx: 120, cy: 180, r: 14, difficulty: "intermediate" },
  { id: "node4", label: "gRPC Streaming", cx: 200, cy: 50, r: 10, difficulty: "advanced" },
  { id: "node5", label: "Processes & Threads", cx: 40, cy: 140, r: 8, difficulty: "beginner" },
];

const EDGES: HeroEdge[] = [
  { from: "node1", to: "node2" },
  { from: "node2", to: "node3" },
  { from: "node1", to: "node3" },
  { from: "node2", to: "node4" },
  { from: "node1", to: "node5" },
];

const DIFF_COLORS = {
  beginner: "#00b894",
  intermediate: "#e17055",
  advanced: "#d63031",
};

export function HeroGraphic() {
  const [activeId, setActiveId] = useState<string | null>("node1");
  const [isHovered, setIsHovered] = useState(false);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get active node and its immediate neighbors
  const { activeNode, neighbors } = useMemo(() => {
    if (!activeId) return { activeNode: null, neighbors: new Set<string>() };
    const node = NODES.find((n) => n.id === activeId) || null;
    const connected = new Set<string>([activeId]);
    EDGES.forEach((edge) => {
      if (edge.from === activeId) connected.add(edge.to);
      if (edge.to === activeId) connected.add(edge.from);
    });
    return { activeNode: node, neighbors: connected };
  }, [activeId]);

  // Autoplay cycle implementation
  useEffect(() => {
    if (isHovered) {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
      return;
    }

    autoplayTimerRef.current = setInterval(() => {
      setActiveId((current) => {
        if (!current) return "node1";
        const currentIndex = NODES.findIndex((n) => n.id === current);
        const nextIndex = (currentIndex + 1) % NODES.length;
        return NODES[nextIndex].id;
      });
    }, 3200);

    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, [isHovered]);

  return (
    <div
      className="relative flex items-center justify-center w-full max-w-[320px] aspect-square select-none group/container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setActiveId("node1"); // Reset focus back to node1 default on mouse leave
      }}
    >
      {/* Floating container for overall graphic movement */}
      <svg
        viewBox="0 0 240 240"
        fill="none"
        className="w-full h-full animate-float-node"
        aria-hidden="true"
      >
        {/* Dot pattern background */}
        <defs>
          <pattern
            id="hero-dots"
            x="0"
            y="0"
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="0.6" fill="rgba(45, 42, 38, 0.08)" />
          </pattern>
        </defs>
        <rect width="240" height="240" fill="url(#hero-dots)" rx={24} />

        {/* Connection lines */}
        {EDGES.map((edge, idx) => {
          const fromNode = NODES.find((n) => n.id === edge.from);
          const toNode = NODES.find((n) => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          const isConnectedToActive = activeId && (edge.from === activeId || edge.to === activeId);
          const isDimmed = activeId && !isConnectedToActive;

          return (
            <g key={`hero-edge-${idx}`} className="transition-opacity duration-300">
              <line
                x1={fromNode.cx}
                y1={fromNode.cy}
                x2={toNode.cx}
                y2={toNode.cy}
                stroke={isConnectedToActive ? "#C0392B" : "rgba(45, 42, 38, 0.12)"}
                strokeWidth={isConnectedToActive ? 2 : 1.2}
                opacity={isDimmed ? 0.2 : 0.8}
                style={{ transition: "stroke 300ms ease, stroke-width 300ms ease, opacity 300ms ease" }}
              />
              {/* Flow Overlay animation when connected to active node */}
              {isConnectedToActive && !isDimmed && (
                <line
                  x1={fromNode.cx}
                  y1={fromNode.cy}
                  x2={toNode.cx}
                  y2={toNode.cy}
                  stroke="#C0392B"
                  strokeWidth={2.5}
                  opacity={0.6}
                  strokeDasharray="5 5"
                  className="animate-dash-flow"
                  style={{ transition: "opacity 300ms ease" }}
                />
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {NODES.map((node) => {
          const isActive = activeId === node.id;
          const isNeighbor = neighbors.has(node.id);
          const isDimmed = activeId && !isNeighbor;
          const diffColor = DIFF_COLORS[node.difficulty];

          return (
            <g
              key={`hero-node-${node.id}`}
              className="cursor-pointer"
              onMouseEnter={() => setActiveId(node.id)}
              style={{
                opacity: isDimmed ? 0.35 : 1,
                transition: "opacity 300ms ease",
              }}
            >
              {/* Pulse Ring around active node */}
              {isActive && (
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r={node.r + 7}
                  fill="none"
                  stroke="#C0392B"
                  strokeWidth="1.5"
                  className="animate-pulse-ring"
                  style={{
                    transformOrigin: `${node.cx}px ${node.cy}px`,
                  }}
                />
              )}

              {/* Node Group for smooth zoom effect */}
              <g
                style={{
                  transform: isActive ? "scale(1.12)" : "scale(1)",
                  transformOrigin: `${node.cx}px ${node.cy}px`,
                  transition: "transform 300ms var(--ease-graphy)",
                }}
              >
                {/* Node Outer Circle */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r={node.r}
                  fill={isActive ? "#FEF0F0" : "#ffffff"}
                  stroke={isActive ? "#C0392B" : "rgba(45, 42, 38, 0.15)"}
                  strokeWidth={isActive ? 2 : 1.2}
                  className="shadow-sm transition-colors duration-300"
                />

                {/* Inner core circle */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r={node.r * 0.35}
                  fill={isActive ? "#C0392B" : diffColor}
                  className="transition-colors duration-300"
                />
              </g>
            </g>
          );
        })}

        {/* Floating Interactive HUD labels inside the graph card */}
        {activeNode && (
          <g className="transition-all duration-300 ease-in-out">
            <rect
              x={Math.max(10, Math.min(240 - 130, activeNode.cx - 60))}
              y={activeNode.cy > 120 ? activeNode.cy - activeNode.r - 28 : activeNode.cy + activeNode.r + 8}
              width="120"
              height="20"
              rx="6"
              fill="#ffffff"
              stroke="rgba(45, 42, 38, 0.08)"
              strokeWidth="1"
              className="shadow-card"
            />
            <text
              x={Math.max(10, Math.min(240 - 130, activeNode.cx - 60)) + 60}
              y={activeNode.cy > 120 ? activeNode.cy - activeNode.r - 15 : activeNode.cy + activeNode.r + 21}
              textAnchor="middle"
              className="text-[6.5px] font-heading font-bold fill-foreground tracking-tight select-none"
            >
              {activeNode.label}
            </text>
          </g>
        )}
      </svg>

      {/* Floating badge for active node difficulty info */}
      {activeNode && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-surface-card shadow-button transition-all duration-300 select-none animate-fade-in"
          style={{ opacity: 0.95 }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: DIFF_COLORS[activeNode.difficulty] }}
          />
          <span className="text-[9px] font-bold font-heading uppercase tracking-widest text-foreground-secondary">
            {activeNode.difficulty}
          </span>
        </div>
      )}
    </div>
  );
}
