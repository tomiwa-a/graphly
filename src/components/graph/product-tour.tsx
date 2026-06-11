"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { ArrowLeft, ArrowRight, X, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  title: string;
  description: string;
  selector?: string;
  position?: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to Graphly! 🕸️",
    description: "Let's take a quick 1-minute interactive tour to show you how to navigate prerequisite dependencies and build custom learning tracks.",
  },
  {
    title: "1. Navigation Modes",
    description: "Toggle between different layout modes. Use Graph View to explore the visual subway map, or switch to Journey Mode to compile a custom prerequisite path.",
    selector: "#tour-tabs",
    position: "bottom",
  },
  {
    title: "2. The Connected Canvas",
    description: "This is the interactive learning map. Click a concept node to view its summary. Green nodes represent beginner topics, orange are intermediate, and red are advanced. Mastered topics turn solid red.",
    selector: "#tour-canvas",
    position: "right",
  },
  {
    title: "3. Concept Details & Code",
    description: "Once selected, this panel breaks down the topic's core problems, prerequisite checks, and direct literature references. You can also switch language tabs for inline code examples!",
    selector: "#tour-sidebar",
    position: "left",
  },
  {
    title: "4. Color & Connection Keys",
    description: "Quickly identify concept difficulty and prerequisite lines. Solid red lines represent direct prerequisite paths, while dashed red lines denote related systems concepts.",
    selector: "#tour-legend",
    position: "left",
  },
  {
    title: "5. Journey Mode Tab",
    description: "Ready to study a track? Select Journey Mode to automatically calculate and compile the shortest path between any starting point and final goal.",
    selector: "#tour-tabs",
    position: "bottom",
  },
  {
    title: "You're All Set! 🚀",
    description: "That's it! You now know how to explore Graphly. Click 'Get Started' to begin your systems design journey.",
  },
];

interface ProductTourProps {
  onStepChange: (stepIndex: number) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function ProductTour({ onStepChange, onClose, isOpen }: ProductTourProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  const currentStep = TOUR_STEPS[activeStep];

  // Calculate spotlight position of target element
  const updateSpotlight = () => {
    if (!isOpen) return;
    const selector = TOUR_STEPS[activeStep]?.selector;
    if (!selector) {
      setSpotlightRect(null);
      setTooltipPos(null);
      return;
    }

    const el = document.querySelector(selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      // Add a small padding margin around the highlighted element
      const padding = 8;
      const nextRect = {
        top: Math.max(0, rect.top - padding),
        left: Math.max(0, rect.left - padding),
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      };
      setSpotlightRect(nextRect);
      
      // Calculate tooltip position
      const position = TOUR_STEPS[activeStep].position || "bottom";
      const tooltipWidth = 320;
      const tooltipHeight = 180;
      const gap = 24;

      let top = 0;
      let left = 0;

      if (position === "bottom") {
        top = nextRect.top + nextRect.height + gap;
        left = nextRect.left + nextRect.width / 2 - tooltipWidth / 2;
      } else if (position === "top") {
        top = nextRect.top - tooltipHeight - gap;
        left = nextRect.left + nextRect.width / 2 - tooltipWidth / 2;
      } else if (position === "left") {
        top = nextRect.top + nextRect.height / 2 - tooltipHeight / 2;
        left = nextRect.left - tooltipWidth - gap;
      } else if (position === "right") {
        top = nextRect.top + nextRect.height / 2 - tooltipHeight / 2;
        left = nextRect.left + nextRect.width + gap;
      }

      // Viewport boundaries check (avoid rendering offscreen)
      const paddingEdge = 16;
      left = Math.max(paddingEdge, Math.min(window.innerWidth - tooltipWidth - paddingEdge, left));
      top = Math.max(paddingEdge, Math.min(window.innerHeight - tooltipHeight - paddingEdge, top));

      setTooltipPos({ top, left });
    } else {
      setSpotlightRect(null);
      setTooltipPos(null);
    }
  };

  // Run spotlight update when activeStep changes or when screen scrolls/resizes
  useEffect(() => {
    updateSpotlight();
    onStepChange(activeStep);

    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);

    return () => {
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
    };
  }, [activeStep, isOpen]);

  // Restart step when tour opens
  useEffect(() => {
    if (isOpen) {
      setActiveStep(0);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (activeStep < TOUR_STEPS.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      localStorage.setItem("graphly-tour-completed", "true");
      onClose();
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("graphly-tour-completed", "true");
    onClose();
  };

  // Compute curved arrow points for the active step
  const arrowPath = useMemo(() => {
    if (!spotlightRect || !tooltipPos) return null;

    const sx = spotlightRect.left + spotlightRect.width / 2;
    const sy = spotlightRect.top + spotlightRect.height / 2;
    const tx = tooltipPos.left + 160; // center of tooltip card (width 320)
    const ty = tooltipPos.top + 90;   // center of tooltip card (height ~180)

    const position = TOUR_STEPS[activeStep].position || "bottom";

    let x1 = tx;
    let y1 = ty;
    let x2 = sx;
    let y2 = sy;

    // Anchor points relative to boundaries
    if (position === "bottom") {
      x1 = tx;
      y1 = tooltipPos.top;
      x2 = sx;
      y2 = spotlightRect.top + spotlightRect.height + 6;
    } else if (position === "top") {
      x1 = tx;
      y1 = tooltipPos.top + 180;
      x2 = sx;
      y2 = spotlightRect.top - 6;
    } else if (position === "left") {
      x1 = tooltipPos.left + 320;
      y1 = ty;
      x2 = spotlightRect.left - 6;
      y2 = sy;
    } else if (position === "right") {
      x1 = tooltipPos.left;
      y1 = ty;
      x2 = spotlightRect.left + spotlightRect.width + 6;
      y2 = sy;
    }

    // Determine quadratic bezier curve control point (slightly offset for natural curve)
    let cx = (x1 + x2) / 2;
    let cy = (y1 + y2) / 2;

    if (position === "bottom" || position === "top") {
      cx += 25; // bend horizontally
    } else {
      cy -= 20; // bend vertically
    }

    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  }, [spotlightRect, tooltipPos, activeStep]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Background Mask/Scrim with Spotlight cutout */}
      <div className="absolute inset-0 pointer-events-auto bg-foreground/50 backdrop-blur-[1px] transition-all duration-300" />

      {/* Spotlight highlight element */}
      {spotlightRect && (
        <div
          className="fixed rounded-2xl border-2 border-primary-dark shadow-[0_0_0_9999px_rgba(45,42,38,0.65)] transition-all duration-300 pointer-events-none"
          style={{
            top: `${spotlightRect.top}px`,
            left: `${spotlightRect.left}px`,
            width: `${spotlightRect.width}px`,
            height: `${spotlightRect.height}px`,
          }}
        />
      )}

      {/* Curved Arrow SVG overlay */}
      {spotlightRect && arrowPath && (
        <svg className="fixed inset-0 w-full h-full pointer-events-none z-50">
          <defs>
            <marker
              id="tour-arrowhead"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#C0392B" />
            </marker>
          </defs>
          <path
            d={arrowPath}
            fill="none"
            stroke="#C0392B"
            strokeWidth="2"
            strokeDasharray="4 4"
            className="animate-dash-flow"
            markerEnd="url(#tour-arrowhead)"
          />
        </svg>
      )}

      {/* Tooltip dialog card */}
      <div
        ref={tooltipRef}
        className={cn(
          "fixed z-50 w-[320px] rounded-[24px] border border-border bg-surface-card p-6 shadow-modal transition-all duration-300 flex flex-col justify-between",
          !spotlightRect && "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
        style={
          spotlightRect && tooltipPos
            ? {
                top: `${tooltipPos.top}px`,
                left: `${tooltipPos.left}px`,
              }
            : undefined
        }
      >
        {/* Card Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-primary-dark">
            {activeStep === 0 || activeStep === TOUR_STEPS.length - 1 ? (
              <Sparkles className="h-5 w-5" />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-light text-[10px] font-bold font-heading">
                {activeStep}
              </span>
            )}
            <h3 className="text-base font-bold font-heading text-foreground tracking-tight leading-tight">
              {currentStep.title}
            </h3>
          </div>
          <button
            onClick={handleSkip}
            className="h-6 w-6 flex items-center justify-center rounded-full text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Card Body */}
        <p className="text-sm leading-relaxed text-foreground-secondary font-sans font-medium mb-6">
          {currentStep.description}
        </p>

        {/* Card Footer / Controls */}
        <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-auto">
          {activeStep > 0 && activeStep < TOUR_STEPS.length - 1 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-xs font-bold font-heading text-foreground-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          ) : (
            <button
              onClick={handleSkip}
              className="text-xs font-bold font-heading text-foreground-muted hover:text-foreground-secondary transition-colors cursor-pointer"
            >
              Skip
            </button>
          )}

          {/* Step indicators */}
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <span
                key={`dot-${idx}`}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-all duration-300",
                  idx === activeStep ? "bg-primary-dark w-3" : "bg-foreground-dim"
                )}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold font-heading text-primary-dark shadow-button hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer"
          >
            {activeStep === TOUR_STEPS.length - 1 ? (
              <>
                Get Started
                <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.2]" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-3.5 w-3.5 stroke-[2.2]" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
