"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type CodeExample = {
  language: string;
  title?: string;
  code: string;
};

type CodeBlockProps = {
  examples: CodeExample[];
  className?: string;
};

const languageIcons: Record<string, string> = {
  go: "go",
  typescript: "ts",
  python: "py",
  csharp: "cs",
  java: "java",
};

export function CodeBlock({ examples, className }: CodeBlockProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const active = examples[activeIndex];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(active.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!examples.length) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-surface-muted p-8 text-center",
          className,
        )}
      >
        <p className="text-sm text-foreground-muted">
          No code examples available yet.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border shadow-card",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border bg-surface-muted px-4">
        <div className="flex gap-0">
          {examples.map((ex, i) => (
            <button
              key={ex.language}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "relative px-3 py-2.5 text-xs font-medium transition-colors",
                i === activeIndex
                  ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                  : "text-foreground-muted hover:text-foreground",
              )}
            >
              {ex.language.charAt(0).toUpperCase() + ex.language.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-success" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto bg-[#1c1917] p-4 text-sm leading-relaxed text-[#f5f5f4]">
        <code>{active.code}</code>
      </pre>
    </div>
  );
}
