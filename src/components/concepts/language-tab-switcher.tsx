"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CodeExample {
  language: string;
  title: string;
  code: string;
}

const langMap: Record<string, string> = {
  Go: "go",
  Python: "python",
  TypeScript: "typescript",
  Java: "java",
  Rust: "rust",
};

export function LanguageTabSwitcher({ examples }: { examples: CodeExample[] }) {
  const [active, setActive] = useState(examples[0]?.language ?? "");
  const [copied, setCopied] = useState(false);
  const current = examples.find((e) => e.language === active);

  const handleCopy = async () => {
    if (!current) return;
    await navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (examples.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-muted p-8 text-center">
        <p className="text-sm text-foreground-secondary font-sans">
          No code examples available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-surface-card shadow-card">
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-border bg-surface-muted/50 px-4">
        <div className="flex gap-1">
          {examples.map((ex) => (
            <button
              key={ex.language}
              onClick={() => setActive(ex.language)}
              className={`px-3.5 py-2.5 text-xs font-heading font-bold transition-all duration-200 cursor-pointer select-none relative ${
                active === ex.language
                  ? "text-primary-dark"
                  : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              {ex.language}
              {active === ex.language && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-dark rounded-full" />
              )}
            </button>
          ))}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-foreground-secondary hover:text-foreground transition-colors cursor-pointer"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
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
      {/* Code content */}
      {current && (
        <div className="p-4 overflow-x-auto">
          <p className="text-[10px] text-foreground-muted font-mono uppercase tracking-wider mb-2">
            {current.title}
          </p>
          <pre className="text-sm font-mono leading-relaxed text-foreground">
            <code>{current.code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
