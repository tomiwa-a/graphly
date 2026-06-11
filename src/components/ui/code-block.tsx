"use client";

import { useEffect, useState, useRef } from "react";
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

export function CodeBlock({ examples, className }: CodeBlockProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [html, setHtml] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const highlighterRef = useRef<any>(null);

  const active = examples[activeIndex];

  useEffect(() => {
    let cancelled = false;

    async function highlight() {
      const { createHighlighter } = await import("shiki");

      if (!highlighterRef.current) {
        highlighterRef.current = await createHighlighter({
          themes: ["github-dark"],
          langs: [
            "go",
            "typescript",
            "python",
            "java",
            "csharp",
            "javascript",
            "tsx",
            "json",
            "bash",
            "sql",
            "yaml",
            "markdown",
            "rust",
            "php",
            "kotlin",
            "ruby",
          ],
        });
      }

      if (cancelled) return;

      try {
        const result = highlighterRef.current.codeToHtml(active.code, {
          lang: languageMap[active.language] ?? active.language,
          theme: "github-dark",
        });
        if (!cancelled) setHtml(result);
      } catch {
        if (!cancelled)
          setHtml(
            `<pre class="shiki" style="background-color:#24292e;color:#e1e4e8"><code>${escapeHtml(active.code)}</code></pre>`,
          );
      }
    }

    highlight();
    return () => {
      cancelled = true;
    };
  }, [activeIndex, active]);

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
        "overflow-hidden rounded-2xl border border-border shadow-card",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-2.5">
        <div className="flex gap-1.5">
          {examples.map((ex, i) => {
            const isActive = i === activeIndex;
            const hasDuplicateLang = examples.filter((e) => e.language === ex.language).length > 1;
            const label = hasDuplicateLang && ex.title
              ? ex.title
              : ex.language.charAt(0).toUpperCase() + ex.language.slice(1);
            return (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  "px-3 py-1 text-xs font-bold font-heading transition-all duration-200 rounded-lg select-none cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-dark border border-border shadow-sm"
                    : "text-foreground-secondary hover:text-foreground border border-transparent"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-card px-3 py-1 text-xs font-bold font-heading shadow-button hover:bg-surface-hover hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 cursor-pointer select-none"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-success-dark" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-foreground-secondary" />
              Copy
            </>
          )}
        </button>
      </div>
      <div
        className="overflow-x-auto [&_pre]:m-0 [&_pre]:bg-[#24292e] [&_pre]:p-4 [&_pre]:text-sm [&_pre]:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

const languageMap: Record<string, string> = {
  go: "go",
  typescript: "typescript",
  python: "python",
  csharp: "csharp",
  java: "java",
  js: "javascript",
  ts: "typescript",
  py: "python",
  cs: "csharp",
};

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
