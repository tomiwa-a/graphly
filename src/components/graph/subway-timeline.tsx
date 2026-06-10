"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, BookOpen, Lock, HelpCircle, ArrowRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { concepts } from "@/lib/data/concepts";
import { chapters } from "@/lib/data/chapters";

export interface SubwayStep {
  title: string;
  description: string;
  slug: string;
  estimatedMinutes: number;
  difficulty: string;
  domain: string;
  chapterId: string;
  reason: string;
}

export function SubwayTimeline({
  syllabus,
  startSlug,
  targetSlug,
  onProgressChange,
}: {
  syllabus: SubwayStep[];
  startSlug: string;
  targetSlug: string;
  onProgressChange?: (count: number) => void;
}) {
  const [completedSlugs, setCompletedSlugs] = useState<string[]>([]);

  // Load completed concepts on mount and update when keys change
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

  const toggleComplete = (slug: string) => {
    let nextSlugs = [...completedSlugs];
    const index = nextSlugs.indexOf(slug);
    let completed = false;

    if (index !== -1) {
      nextSlugs.splice(index, 1);
    } else {
      nextSlugs.push(slug);
      completed = true;
    }

    try {
      localStorage.setItem("graphy-completed-concepts", JSON.stringify(nextSlugs));
      setCompletedSlugs(nextSlugs);

      // Dispatch custom events to keep other views (like SVG graph or paths) in sync instantly
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("concept-completed-updated"));

      if (onProgressChange) {
        onProgressChange(syllabus.filter(s => nextSlugs.includes(s.slug)).length);
      }

      if (completed) {
        const c = concepts.find(cc => cc.slug === slug);
        toast.success(`🎉 Mastered ${c?.title ?? slug}! +100 XP`);
      }
    } catch {}
  };

  const isCompleted = (slug: string) => completedSlugs.includes(slug);

  // Helper to determine if a node is "Available/Up Next" (its prerequisites in this syllabus are completed)
  const isAvailable = (slug: string) => {
    if (isCompleted(slug)) return false;
    const c = concepts.find((cc) => cc.slug === slug);
    if (!c) return false;
    // Check if all of this concept's prerequisites that are present in the current syllabus are complete
    return c.prerequisites.every((prereq) => {
      // If the prerequisite is in this syllabus, it must be completed
      const inSyllabus = syllabus.some((s) => s.slug === prereq);
      return !inSyllabus || isCompleted(prereq);
    });
  };

  const completedInSyllabus = syllabus.filter((s) => isCompleted(s.slug)).length;
  const syllabusPercentage = syllabus.length > 0 ? Math.round((completedInSyllabus / syllabus.length) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Dynamic Path Header */}
      <div className="rounded-[24px] border border-border bg-surface-card p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-heading font-bold text-foreground-secondary uppercase tracking-[0.1em]">
              Compiled Syllabus
            </p>
            <h4 className="text-lg font-medium font-heading text-foreground mt-1 tracking-[-0.02em] flex items-center gap-2 flex-wrap">
              <span>{concepts.find(c => c.slug === startSlug)?.title}</span>
              <ArrowRight className="h-4 w-4 text-foreground-secondary" />
              <span>{concepts.find(c => c.slug === targetSlug)?.title}</span>
            </h4>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-heading font-bold text-foreground-secondary uppercase tracking-[0.1em]">
              Path Progress
            </span>
            <span className="text-sm font-mono font-bold text-primary-dark">
              {completedInSyllabus} / {syllabus.length} Stops ({syllabusPercentage}%)
            </span>
          </div>
        </div>

        <div className="h-2 rounded-full bg-surface-muted overflow-hidden mt-4">
          <div
            className="h-full rounded-full bg-primary-dark transition-all duration-500 ease-graphy"
            style={{ width: `${syllabusPercentage}%` }}
          />
        </div>
      </div>

      {/* Vertical Timeline */}
      <div className="relative pl-6 sm:pl-10 space-y-8">
        {/* The Rails (Subway lines background) */}
        <div className="absolute left-[37px] sm:left-[53px] top-4 bottom-4 w-1 bg-border rounded-full" />

        {syllabus.map((step, idx) => {
          const completed = isCompleted(step.slug);
          const active = isAvailable(step.slug);
          const isLast = idx === syllabus.length - 1;

          // Connective track highlight between this stop and the next
          const nextStepCompleted = !isLast && isCompleted(syllabus[idx + 1].slug);
          const showCompletedTrack = completed && nextStepCompleted;

          const currentChapter = chapters.find((ch) => ch.id === step.chapterId);
          const showChapterHeader = idx === 0 || step.chapterId !== syllabus[idx - 1].chapterId;

          return (
            <div key={`subway-step-group-${step.slug}`} className="space-y-6">
              {showChapterHeader && (
                <div className="relative py-2 flex items-start gap-4">
                  <div className="absolute left-[5px] top-[14px] z-20 h-4 w-4 rounded-full bg-primary-dark border-4 border-white shadow-md animate-pulse" />
                  <div className="ml-10">
                    <span className="text-[9px] font-heading font-bold text-primary-dark bg-primary-muted border border-primary/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Entering Zone: {currentChapter?.title || step.chapterId}
                    </span>
                    <p className="mt-1 text-[10px] text-foreground-secondary font-sans leading-relaxed max-w-lg">
                      {currentChapter?.summary}
                    </p>
                  </div>
                </div>
              )}

              <div className="relative flex gap-6">
              {/* Dynamic Connecting Track segment overlay */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-[11px] sm:left-[13px] top-10 h-[calc(100%+32px)] w-1 rounded-full transition-all duration-500",
                    showCompletedTrack
                      ? "bg-primary-dark z-10 animate-pulse"
                      : "bg-transparent"
                  )}
                />
              )}

              {/* Subway Station Node (Circle) */}
              <div className="absolute left-[-26px] sm:left-[-42px] top-1 z-20 flex h-[26px] w-[26px] sm:h-[34px] sm:w-[34px] items-center justify-center">
                {completed ? (
                  <button
                    onClick={() => toggleComplete(step.slug)}
                    className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-primary-dark text-white border-2 border-primary-dark hover:bg-primary hover:border-primary hover:scale-[1.05] active:scale-[0.95] transition-all cursor-pointer shadow-button"
                    title="Mark incomplete"
                  >
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                ) : active ? (
                  <div className="relative flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center">
                    {/* Pulsing ring around available/active node */}
                    <div className="absolute inset-0 rounded-full border-4 border-primary-dark/30 animate-ping opacity-75" />
                    <button
                      onClick={() => toggleComplete(step.slug)}
                      className="relative flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-surface-card border-2 border-primary-dark text-primary-dark hover:bg-primary-light hover:scale-[1.05] active:scale-[0.95] transition-all cursor-pointer shadow-card"
                      title="Mark complete"
                    >
                      <BookOpen className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => toggleComplete(step.slug)}
                    className="flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-surface-muted border border-border text-foreground-muted hover:border-foreground-secondary hover:text-foreground-secondary hover:scale-[1.05] active:scale-[0.95] transition-all cursor-pointer"
                    title="Mark complete"
                  >
                    <Lock className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                )}
              </div>

              {/* Subway Card (Content) */}
              <div
                className={cn(
                  "flex-1 rounded-[20px] border p-5 bg-surface-card shadow-card transition-all duration-300",
                  completed ? "border-border-light bg-surface-muted/10 opacity-90" : "border-border",
                  active && "ring-1 ring-primary-dark/35 border-primary-dark/30 shadow-card-hover"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-foreground-secondary bg-surface-muted px-2 py-0.5 rounded-md border border-border/40">
                      STOP {String(idx + 1).padStart(2, "0")}
                    </span>
                    <h5 className="mt-2 text-base font-medium font-heading text-foreground hover:text-primary-dark transition-colors flex items-center gap-1">
                      <Link href={`/concepts/${step.slug}`}>
                        {step.title}
                      </Link>
                      <Link href={`/concepts/${step.slug}`} className="text-foreground-muted hover:text-foreground">
                        <ExternalLink className="h-3 w-3 inline" />
                      </Link>
                    </h5>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-heading font-bold bg-primary-muted text-primary-dark border border-primary/20 rounded-full px-2 py-0.5">
                      {step.domain}
                    </span>
                    <span className={cn(
                      "text-[10px] font-heading font-bold rounded-full px-2 py-0.5 uppercase tracking-wide",
                      step.difficulty === "beginner" && "bg-success-light text-success-dark",
                      step.difficulty === "intermediate" && "bg-warning-light text-warning-dark",
                      step.difficulty === "advanced" && "bg-destructive-light text-destructive-dark"
                    )}>
                      {step.difficulty}
                    </span>
                  </div>
                </div>

                <p className="mt-2.5 text-xs text-foreground-secondary leading-relaxed font-sans">
                  {step.description}
                </p>

                {/* Transition Connection Reason card */}
                {step.reason && (
                  <div className="mt-3 rounded-xl bg-surface-muted/60 p-3 border border-border/40 text-[11px] leading-relaxed text-foreground-secondary font-sans">
                    <span className="font-heading font-bold text-foreground-secondary block mb-1 uppercase tracking-wide text-[9px]">
                      Connection Link:
                    </span>
                    {step.reason}
                  </div>
                )}

                {/* completion actions inside timeline */}
                <div className="mt-4 flex items-center justify-between gap-4 pt-3 border-t border-border/30">
                  <span className="text-[10px] text-foreground-muted font-sans">
                    ⏱️ ~{step.estimatedMinutes} mins read
                  </span>
                  <button
                    onClick={() => toggleComplete(step.slug)}
                    className={cn(
                      "inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-heading font-bold transition-all duration-200 cursor-pointer shadow-button",
                      completed
                        ? "bg-surface-muted text-foreground-secondary border border-border hover:bg-destructive-light/20 hover:text-destructive-dark hover:border-destructive/20"
                        : "bg-primary text-primary-dark hover:bg-primary/95"
                    )}
                  >
                    {completed ? "Completed ✓" : "Mark Mastered"}
                  </button>
                </div>
              </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
