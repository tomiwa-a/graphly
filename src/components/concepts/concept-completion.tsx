"use client";

import { useState, useEffect } from "react";
import { Check, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ConceptCompletion({ slug, title }: { slug: string; title: string }) {
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      try {
        const saved = localStorage.getItem("graphy-completed-concepts");
        if (saved) {
          const list = JSON.parse(saved);
          setCompleted(list.includes(slug));
        } else {
          setCompleted(false);
        }
      } catch {}
    };

    checkStatus();
    window.addEventListener("storage", checkStatus);
    window.addEventListener("concept-completed-updated", checkStatus);

    return () => {
      window.removeEventListener("storage", checkStatus);
      window.removeEventListener("concept-completed-updated", checkStatus);
    };
  }, [slug]);

  const handleToggle = () => {
    try {
      const saved = localStorage.getItem("graphy-completed-concepts");
      let list: string[] = saved ? JSON.parse(saved) : [];
      let isNowComplete = false;

      if (list.includes(slug)) {
        list = list.filter((s) => s !== slug);
      } else {
        list.push(slug);
        isNowComplete = true;
      }

      localStorage.setItem("graphy-completed-concepts", JSON.stringify(list));
      setCompleted(isNowComplete);

      // Trigger events for the rest of the application
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("concept-completed-updated"));

      if (isNowComplete) {
        toast.success(`🎉 You've mastered ${title}! +100 XP`);
      } else {
        toast.info(`Marked ${title} as incomplete.`);
      }
    } catch {
      toast.error("Failed to update concept completion status.");
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-heading font-bold px-4 transition-all duration-200 cursor-pointer shadow-button",
        completed
          ? "bg-primary-dark text-white hover:bg-primary-dark/90 hover:scale-[1.01] active:scale-[0.98]"
          : "border border-border bg-surface-card text-foreground-secondary hover:text-foreground hover:bg-surface-hover hover:scale-[1.01] active:scale-[0.98]"
      )}
    >
      {completed ? (
        <>
          <Check className="h-4 w-4 shrink-0 stroke-[3px]" />
          <span>Mastered ✓</span>
        </>
      ) : (
        <>
          <BookOpen className="h-4 w-4 shrink-0" />
          <span>Mark as Mastered</span>
        </>
      )}
    </button>
  );
}
