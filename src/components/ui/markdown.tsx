"use client";

import { useState, useEffect, useRef } from "react";

const ADMONITION_COLORS: Record<string, { border: string; bg: string; icon: string; label: string }> = {
  note: { border: "#0ea5e9", bg: "#f0f9ff", icon: "info", label: "Note" },
  tip: { border: "#10b981", bg: "#ecfdf5", icon: "lightbulb", label: "Tip" },
  warning: { border: "#f59e0b", bg: "#fffbeb", icon: "alert", label: "Warning" },
  caution: { border: "#ef4444", bg: "#fef2f2", icon: "danger", label: "Caution" },
};

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

export function MarkdownRenderer({ content }: { content: string }) {
  const [html, setHtml] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const highlighterRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      // Preprocess admonitions: convert > [!NOTE]\n> body to raw HTML
      const preprocessed = content.replace(
        /^> \[!(\w+)\]\n((?:^> .*\n?)*)/gm,
        (_match: string, type: string, body: string) => {
          const t = type.toLowerCase();
          const cfg = ADMONITION_COLORS[t] || ADMONITION_COLORS.note;
          const inner = body
            .split("\n")
            .map((l: string) => l.replace(/^> /, "").replace(/^>$/, ""))
            .join("\n")
            .trim();
          return `<div class="admonition" style="background:${cfg.bg};border-left:4px solid ${cfg.border};border-radius:0.75rem;padding:1.25rem;margin:1.25rem 0">
<div style="display:flex;align-items:center;gap:0.5rem;font-weight:700;font-size:0.875rem;color:${cfg.border}">${cfg.label}</div>
<div style="margin-top:0.625rem;font-size:0.875rem;line-height:1.75">${inner}</div>
</div>`;
        },
      );

      if (cancelled) return;

      const { marked } = await import("marked");
      if (cancelled) return;
      const raw = await marked.parse(preprocessed, { gfm: true, breaks: false });
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
      const highlighted = raw.replace(
        /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
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
            return `<pre class="shiki" style="background-color:#24292e;color:#e1e4e8;padding:1rem;border-radius:1rem;overflow-x:auto;margin:1rem 0;border:1px solid var(--color-border)"><code>${escapeHtml(decoded)}</code></pre>`;
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
