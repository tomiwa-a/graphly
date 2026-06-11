"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, X, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  title: string;
  description: string;
  page: string;
  selector?: string;
  position?: "top" | "bottom" | "left" | "right";
  action?: () => void;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to Graphly! 🕸️",
    description: "Let's take a quick guided tour around the platform to learn how to navigate prerequisite dependencies and build custom learning tracks.",
    page: "/",
  },
  {
    title: "1. Let's Get Started",
    description: "These CTAs let you browse all concepts, view guided paths, or explore the visual knowledge graph. Let's look at the concepts first.",
    page: "/",
    selector: "#tour-hero-cta",
    position: "bottom",
  },
  {
    title: "2. Concepts Catalog",
    description: "This lists all backend engineering concepts grouped by chapters. Click any card to read its textbook-grounded explanation and prerequisites.",
    page: "/concepts",
    selector: "#tour-concepts-grid",
    position: "top",
  },
  {
    title: "3. Domain Search",
    description: "Looking for a specific topic? Use search to filter by domain tags (Foundations, Databases, Reliability, Caching) or query topic names.",
    page: "/search",
    selector: "#tour-search-input",
    position: "bottom",
  },
  {
    title: "4. Guided Paths",
    description: "If you prefer structured tracks, follow our curated sequences. They group concepts from fundamentals to advanced distributed systems.",
    page: "/paths",
    selector: "#tour-paths-grid",
    position: "top",
  },
  {
    title: "5. The Knowledge Graph",
    description: "This is the interactive 2D subway map of backend systems. It maps prerequisite connections so you see how concepts link. Click a node to view its summary.",
    page: "/graph",
    selector: "#tour-canvas",
    position: "right",
    action: () => {
      window.dispatchEvent(new CustomEvent("graphly-tour-setview", { detail: "graph" }));
      window.dispatchEvent(new CustomEvent("graphly-tour-select", { detail: null }));
    }
  },
  {
    title: "6. Concept Selection & Zoom",
    description: "Clicking a node highlights it, shows details, and loads multi-language code examples. Double-clicking zoom-centers a chapter box.",
    page: "/graph",
    selector: "#tour-sidebar",
    position: "left",
    action: () => {
      window.dispatchEvent(new CustomEvent("graphly-tour-setview", { detail: "graph" }));
      window.dispatchEvent(new CustomEvent("graphly-tour-select", { detail: "bits" }));
    }
  },
  {
    title: "7. Color & Connection Keys",
    description: "Quickly identify concept difficulty and prerequisites. Solid red lines represent direct prerequisite paths, while dashed red lines denote related concepts.",
    page: "/graph",
    selector: "#tour-legend",
    position: "left",
    action: () => {
      window.dispatchEvent(new CustomEvent("graphly-tour-setview", { detail: "graph" }));
      window.dispatchEvent(new CustomEvent("graphly-tour-select", { detail: null }));
    }
  },
  {
    title: "You're All Set! 🚀",
    description: "You now know how to explore Graphly. Click 'Get Started' to begin your systems design journey.",
    page: "/graph",
    action: () => {
      window.dispatchEvent(new CustomEvent("graphly-tour-setview", { detail: "graph" }));
      window.dispatchEvent(new CustomEvent("graphly-tour-select", { detail: null }));
    }
  },
];

export function GlobalTour() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isActive, setIsActive] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentStep = TOUR_STEPS[activeStep];

  // Initialize and check localStorage
  useEffect(() => {
    const tourActive = localStorage.getItem("graphly-global-tour-active") === "true";
    const tourStepStr = localStorage.getItem("graphly-global-tour-step");
    const tourCompleted = localStorage.getItem("graphly-global-tour-completed") === "true";

    const forceTour = searchParams.get("startTour") === "true" || searchParams.get("tour") === "true";

    if (forceTour) {
      localStorage.setItem("graphly-global-tour-active", "true");
      localStorage.setItem("graphly-global-tour-step", "0");
      setIsActive(true);
      setActiveStep(0);
      router.push("/");
    } else if (tourActive && tourStepStr !== null) {
      setIsActive(true);
      setActiveStep(parseInt(tourStepStr, 10));
    } else if (!tourCompleted && pathname === "/") {
      // Auto-open after 1.5 seconds on landing page for new visitors
      const t = setTimeout(() => {
        localStorage.setItem("graphly-global-tour-active", "true");
        localStorage.setItem("graphly-global-tour-step", "0");
        setIsActive(true);
        setActiveStep(0);
      }, 1500);
      return () => clearTimeout(t);
    }

    // Listen for manual trigger events (e.g. from footer)
    const handleTrigger = () => {
      localStorage.setItem("graphly-global-tour-active", "true");
      localStorage.setItem("graphly-global-tour-step", "0");
      setIsActive(true);
      setActiveStep(0);
      router.push("/");
    };
    window.addEventListener("graphly-tour-trigger", handleTrigger);
    return () => window.removeEventListener("graphly-tour-trigger", handleTrigger);
  }, [searchParams]);

  // Adjust active step if user manually browses to another page during tour
  useEffect(() => {
    if (!isActive) return;

    const expectedPage = currentStep?.page;
    if (expectedPage && pathname !== expectedPage) {
      const matchingStepIndex = TOUR_STEPS.findIndex((s) => s.page === pathname);
      if (matchingStepIndex !== -1) {
        setActiveStep(matchingStepIndex);
        localStorage.setItem("graphly-global-tour-step", String(matchingStepIndex));
      }
    }
  }, [pathname, isActive]);

  // Calculate spotlight position
  const updateSpotlight = () => {
    if (!isActive) return;

    // Trigger step action if defined
    if (currentStep?.action) {
      currentStep.action();
    }

    const selector = currentStep?.selector;
    if (!selector) {
      setSpotlightRect(null);
      setTooltipPos(null);
      return;
    }

    const el = document.querySelector(selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      const padding = 8;
      const nextRect = {
        top: Math.max(0, rect.top - padding),
        left: Math.max(0, rect.left - padding),
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      };
      setSpotlightRect(nextRect);

      const position = currentStep.position || "bottom";
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

      const paddingEdge = 16;
      left = Math.max(paddingEdge, Math.min(window.innerWidth - tooltipWidth - paddingEdge, left));
      top = Math.max(paddingEdge, Math.min(window.innerHeight - tooltipHeight - paddingEdge, top));

      setTooltipPos({ top, left });
    } else {
      setSpotlightRect(null);
      setTooltipPos(null);
    }
  };

  // Perform spotlight calculation. Polls DOM on page changes to wait for hydration.
  useEffect(() => {
    if (!isActive) return;

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Run immediately
    updateSpotlight();

    // Setup polling for page transition hydration
    let count = 0;
    pollIntervalRef.current = setInterval(() => {
      updateSpotlight();
      count++;
      if (count > 20) { // stop polling after 2 seconds
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      }
    }, 100);

    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
    };
  }, [activeStep, isActive, pathname]);

  const handleNext = () => {
    const nextIdx = activeStep + 1;
    if (nextIdx < TOUR_STEPS.length) {
      const nextStep = TOUR_STEPS[nextIdx];
      localStorage.setItem("graphly-global-tour-step", String(nextIdx));
      
      if (nextStep.page !== pathname) {
        router.push(nextStep.page);
      } else {
        setActiveStep(nextIdx);
      }
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    const prevIdx = activeStep - 1;
    if (prevIdx >= 0) {
      const prevStep = TOUR_STEPS[prevIdx];
      localStorage.setItem("graphly-global-tour-step", String(prevIdx));

      if (prevStep.page !== pathname) {
        router.push(prevStep.page);
      } else {
        setActiveStep(prevIdx);
      }
    }
  };

  const handleSkip = () => {
    localStorage.setItem("graphly-global-tour-completed", "true");
    localStorage.removeItem("graphly-global-tour-active");
    localStorage.removeItem("graphly-global-tour-step");
    setIsActive(false);
    
    // Clear page triggers
    window.dispatchEvent(new CustomEvent("graphly-tour-select", { detail: null }));
    window.dispatchEvent(new CustomEvent("graphly-tour-setview", { detail: "graph" }));
  };

  const handleComplete = () => {
    localStorage.setItem("graphly-global-tour-completed", "true");
    localStorage.removeItem("graphly-global-tour-active");
    localStorage.removeItem("graphly-global-tour-step");
    setIsActive(false);

    // Clear page triggers
    window.dispatchEvent(new CustomEvent("graphly-tour-select", { detail: null }));
    window.dispatchEvent(new CustomEvent("graphly-tour-setview", { detail: "graph" }));
  };

  const arrowPath = useMemo(() => {
    if (!spotlightRect || !tooltipPos) return null;

    const sx = spotlightRect.left + spotlightRect.width / 2;
    const sy = spotlightRect.top + spotlightRect.height / 2;
    const tx = tooltipPos.left + 160;
    const ty = tooltipPos.top + 90;

    const position = currentStep.position || "bottom";

    let x1 = tx;
    let y1 = ty;
    let x2 = sx;
    let y2 = sy;

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

    let cx = (x1 + x2) / 2;
    let cy = (y1 + y2) / 2;

    if (position === "bottom" || position === "top") {
      cx += 25;
    } else {
      cy -= 20;
    }

    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  }, [spotlightRect, tooltipPos, activeStep]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Scrim Overlay */}
      <div className="absolute inset-0 pointer-events-auto bg-foreground/50 backdrop-blur-[1px] transition-all duration-300" />

      {/* Spotlight highlight */}
      {spotlightRect && (
        <div
          className="fixed rounded-2xl border-2 border-primary-dark shadow-[0_0_0_9999px_rgba(45, 42, 38, 0.65)] transition-all duration-300 pointer-events-none"
          style={{
            top: `${spotlightRect.top}px`,
            left: `${spotlightRect.left}px`,
            width: `${spotlightRect.width}px`,
            height: `${spotlightRect.height}px`,
          }}
        />
      )}

      {/* Curved Arrow Overlay */}
      {spotlightRect && arrowPath && (
        <svg className="fixed inset-0 w-full h-full pointer-events-none z-50">
          <defs>
            <marker
              id="global-tour-arrowhead"
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
            markerEnd="url(#global-tour-arrowhead)"
          />
        </svg>
      )}

      {/* Tooltip Dialog Card */}
      <div
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

        <p className="text-sm leading-relaxed text-foreground-secondary font-sans font-medium mb-6">
          {currentStep.description}
        </p>

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

          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <span
                key={`global-dot-${idx}`}
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
