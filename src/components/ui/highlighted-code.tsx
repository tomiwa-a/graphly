"use client";

import { useEffect, useState, useRef } from "react";
import { Copy, Check } from "lucide-react";

const languageMap: Record<string, string> = {
  go: "go",
  typescript: "typescript",
  python: "python",
  js: "javascript",
  ts: "typescript",
  py: "python",
  sql: "sql",
  bash: "bash",
  json: "json",
  yaml: "yaml",
  rust: "rust",
  csharp: "csharp",
  java: "java",
  ruby: "ruby",
  php: "php",
  kotlin: "kotlin",
};

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function HighlightedCode({
  code,
  language,
}: {
  code: string;
  language?: string;
}) {
  const [html, setHtml] = useState("");
  const [copied, setCopied] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const highlighterRef = useRef<any>(null);

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
        const result = highlighterRef.current.codeToHtml(code, {
          lang: languageMap[language ?? ""] ?? language ?? "text",
          theme: "github-dark",
        });
        if (!cancelled) setHtml(result);
      } catch {
        if (!cancelled)
          setHtml(
            `<pre class="shiki" style="background-color:#24292e;color:#e1e4e8"><code>${escapeHtml(code)}</code></pre>`,
          );
      }
    }

    highlight();
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-border shadow-card">
      <div className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-1.5">
        {language ? (
          <span className="text-xs font-mono font-medium text-foreground-muted uppercase tracking-wider">
            {language}
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-card px-2.5 py-1 text-xs font-bold font-heading shadow-button hover:bg-surface-hover hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 cursor-pointer select-none"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-success-dark" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 text-foreground-secondary" />
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
