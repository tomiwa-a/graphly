"use client";

import { useState, useEffect, useRef } from "react";

const languageMap: Record<string, string> = {
  go: "go", typescript: "typescript", python: "python",
  js: "javascript", ts: "typescript", py: "python",
  sql: "sql", bash: "bash", json: "json",
  yaml: "yaml", rust: "rust", csharp: "csharp", java: "java",
};

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function MarkdownRenderer({ content, initialHtml }: { content: string; initialHtml?: string }) {
  const [html, setHtml] = useState<string | null>(initialHtml ?? null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const highlighterRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const { renderFullMarkdown } = await import("@/lib/markdown-utils");
      if (cancelled) return;

      const fullHtml = await renderFullMarkdown(content);
      if (cancelled) return;

      // Highlight code blocks with Shiki
      const { createHighlighter } = await import("shiki");
      if (cancelled) return;

      if (!highlighterRef.current) {
        highlighterRef.current = await createHighlighter({
          themes: ["github-dark"],
          langs: [
            "go", "typescript", "python", "java", "csharp",
            "javascript", "tsx", "json", "bash", "sql",
            "yaml", "markdown", "rust", "php", "kotlin", "ruby",
          ],
        });
      }

      if (cancelled) return;

      const hl = highlighterRef.current;
      const highlighted = fullHtml.replace(
        /<pre class="shiki"[^>]*><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
        (_, lang, code) => {
          const decoded = code
            .replace(/&amp;/g, "&").replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">").replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
          try {
            return hl.codeToHtml(decoded, {
              lang: languageMap[lang] ?? lang,
              theme: "github-dark",
            });
          } catch {
            return `<pre class="shiki" style="background-color:#24292e;color:#e1e4e8;padding:1rem;border-radius:1rem;overflow-x:auto;margin:1rem 0;border:1px solid var(--color-border)"><code class="language-${lang}">${escapeHtml(decoded)}</code></pre>`;
          }
        },
      );

      if (!cancelled) setHtml(highlighted);
    }

    render();
    return () => { cancelled = true; };
  }, [content]);

  if (html === null) {
    return <p className="text-foreground-secondary whitespace-pre-wrap">{content}</p>;
  }

  return (
    <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
