"use client";

import { useState, useEffect } from "react";
import { Trash2, Trophy, Award, Flame } from "lucide-react";
import { toast } from "sonner";
import { concepts } from "@/lib/data/concepts";

export function ProgressMasteryCard({
  completedCount: externalCompletedCount,
  onReset,
}: {
  completedCount?: number;
  onReset?: () => void;
}) {
  const [completedSlugs, setCompletedSlugs] = useState<string[]>([]);
  const totalConcepts = concepts.length;

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem("graphy-completed-concepts");
        if (saved) {
          setCompletedSlugs(JSON.parse(saved));
        } else {
          setCompletedSlugs([]);
        }
      } catch {}
    };

    handleStorageChange();
    window.addEventListener("storage", handleStorageChange);
    // Listen for custom dispatch events to update stats instantly in the same window
    window.addEventListener("concept-completed-updated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("concept-completed-updated", handleStorageChange);
    };
  }, [externalCompletedCount]);

  const completedCount = externalCompletedCount ?? completedSlugs.length;
  const percentage = totalConcepts > 0 ? Math.round((completedCount / totalConcepts) * 100) : 0;

  // Simple clean level system
  let userLevel = 1;
  let levelName = "Novice Backend Engineer";
  if (completedCount >= 7) {
    userLevel = 3;
    levelName = "System Architect";
  } else if (completedCount >= 4) {
    userLevel = 2;
    levelName = "Production Engineer";
  }

  return (
    <div className="rounded-[24px] border border-border bg-surface-card p-6 shadow-card transition-all hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] text-foreground-secondary uppercase font-heading">
            Your Mastery Stats
          </p>
          <h3 className="mt-1 text-2xl font-medium font-heading text-foreground tracking-[-0.02em]">
            Level {userLevel}
          </h3>
          <p className="text-xs text-primary-dark font-heading font-bold mt-0.5">
            {levelName}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary-dark border border-primary/20">
          <Trophy className="h-6 w-6" />
        </div>
      </div>

      {/* Progress metrics */}
      <div className="mt-6 space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs font-sans text-foreground-secondary mb-1.5">
            <span>Overall Progress</span>
            <span className="font-bold font-mono text-foreground">
              {completedCount} / {totalConcepts} Concepts ({percentage}%)
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-surface-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-dark transition-all duration-500 ease-graphy"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Small stats badges */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-2 rounded-xl bg-surface-muted/50 p-2.5 border border-border/40">
            <Award className="h-4 w-4 text-success-dark" />
            <div className="text-[11px] font-sans">
              <p className="font-bold text-foreground">{completedCount * 100} XP</p>
              <p className="text-foreground-secondary text-[10px]">Total Earned</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-surface-muted/50 p-2.5 border border-border/40">
            <Flame className="h-4 w-4 text-accent-dark" />
            <div className="text-[11px] font-sans">
              <p className="font-bold text-foreground">3 Days</p>
              <p className="text-foreground-secondary text-[10px]">Active Streak</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResetProgressButton({ onReset }: { onReset?: () => void }) {
  const handleReset = () => {
    if (confirm("Are you sure you want to reset all your learning progress? This cannot be undone.")) {
      try {
        localStorage.removeItem("graphy-completed-concepts");
        // Also clear path progress keys
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("path-") || key.includes("progress"))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));

        // Dispatch storage update events
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("concept-completed-updated"));

        toast.success("Progress reset successfully!");
        if (onReset) onReset();
      } catch (err) {
        toast.error("Failed to reset progress.");
      }
    }
  };

  return (
    <button
      onClick={handleReset}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-heading font-bold text-foreground-secondary hover:text-destructive-dark border border-border hover:border-destructive/30 hover:bg-destructive-light/20 transition-all duration-200 cursor-pointer"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Reset Progress
    </button>
  );
}
