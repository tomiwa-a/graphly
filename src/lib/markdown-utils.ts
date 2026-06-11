import { marked } from "marked";

export const ADMONITION_COLORS: Record<string, { border: string; bg: string; label: string }> = {
  note: { border: "#0ea5e9", bg: "#f0f9ff", label: "Note" },
  tip: { border: "#10b981", bg: "#ecfdf5", label: "Tip" },
  warning: { border: "#f59e0b", bg: "#fffbeb", label: "Warning" },
  caution: { border: "#ef4444", bg: "#fef2f2", label: "Caution" },
};

export type AdmonitionType = keyof typeof ADMONITION_COLORS;

// Admonition regex: matches > [!TYPE]\n followed by > body lines (but not another > [!TYPE])
const ADMONITION_RE = /^> \[!(\w+)\]\n((?:^>(?!\s*\[!\w+\]).*\n?)*)/gm;
const PLACEHOLDER_PREFIX = "<!-- ADM";
const PLACEHOLDER_SUFFIX = " -->";

export interface AdmonitionMatch {
  type: AdmonitionType;
  body: string;
}

export function extractAdmonitions(text: string): { cleaned: string; admonitions: AdmonitionMatch[] } {
  const admonitions: AdmonitionMatch[] = [];
  const cleaned = text.replace(ADMONITION_RE, (_match: string, type: string, body: string) => {
    const idx = admonitions.length;
    admonitions.push({ type: type.toLowerCase() as AdmonitionType, body });
    return `${PLACEHOLDER_PREFIX}${idx}${PLACEHOLDER_SUFFIX}`;
  });
  return { cleaned, admonitions };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderAdmonitionHtml(type: AdmonitionType, bodyHtml: string): string {
  const cfg = ADMONITION_COLORS[type] || ADMONITION_COLORS.note;
  return `<div class="admonition" style="background:${cfg.bg};border-left:4px solid ${cfg.border};border-radius:0.75rem;padding:1.25rem;margin:1.25rem 0">
<div style="display:flex;align-items:center;gap:0.5rem;font-weight:700;font-size:0.875rem;color:${cfg.border}">${cfg.label}</div>
<div style="margin-top:0.625rem;font-size:0.875rem;line-height:1.75">${bodyHtml}</div>
</div>`;
}

export function processBodyContent(body: string): string {
  return body
    .split("\n")
    .map((l) => l.replace(/^> ?/, ""))
    .join("\n")
    .trim();
}

export function codeBlockFallback(code: string, lang: string): string {
  return `<pre class="shiki" style="background-color:#24292e;color:#e1e4e8;padding:1rem;border-radius:1rem;overflow-x:auto;margin:1rem 0;border:1px solid var(--color-border)"><code class="language-${lang}">${code}</code></pre>`;
}

export async function renderFullMarkdown(text: string): Promise<string> {
  const { cleaned, admonitions } = extractAdmonitions(text);

  let html = await marked.parse(cleaned, { gfm: true, breaks: false });

  for (let i = 0; i < admonitions.length; i++) {
    const { type, body } = admonitions[i];
    const bodyContent = processBodyContent(body);
    const bodyHtml = await marked.parse(bodyContent, { gfm: true, breaks: false });
    const admonitionHtml = renderAdmonitionHtml(type, bodyHtml);
    html = html.replace(`${PLACEHOLDER_PREFIX}${i}${PLACEHOLDER_SUFFIX}`, admonitionHtml);
  }

  // Style code blocks (SSR version without Shiki)
  html = html.replace(
    /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
    (_, lang, code) => codeBlockFallback(code, lang),
  );

  return html;
}
