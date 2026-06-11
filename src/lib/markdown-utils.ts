import { marked } from "marked";
import { createHighlighter, type Highlighter } from "shiki";

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function getHighlighterInstance() {
  const g = globalThis as any;
  if (!g._shikiHighlighter) {
    g._shikiHighlighter = await createHighlighter({
      themes: ["github-dark"],
      langs: [
        "go", "typescript", "python", "java", "csharp",
        "javascript", "tsx", "json", "bash", "sql",
        "yaml", "markdown", "rust",
      ],
    });
  }
  return g._shikiHighlighter;
}

function parseLineHighlights(meta: string): Set<number> {
  const lines = new Set<number>();
  const match = meta.match(/\{([^}]+)\}/);
  if (!match) return lines;
  
  const parts = match[1].split(",");
  for (const part of parts) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          lines.add(i);
        }
      }
    } else {
      const num = Number(part);
      if (!isNaN(num)) {
        lines.add(num);
      }
    }
  }
  return lines;
}

const languageMap: Record<string, string> = {
  go: "go", typescript: "typescript", python: "python",
  js: "javascript", ts: "typescript", py: "python",
  sql: "sql", bash: "bash", json: "json",
  yaml: "yaml", rust: "rust", csharp: "csharp", java: "java",
};

export async function renderFullMarkdown(text: string): Promise<string> {
  // Strip YAML frontmatter if present
  let contentToParse = text;
  if (text.startsWith("---")) {
    const endFrontmatter = text.indexOf("---", 3);
    if (endFrontmatter !== -1) {
      contentToParse = text.slice(endFrontmatter + 3);
    }
  }

  const { cleaned, admonitions } = extractAdmonitions(contentToParse);

  // Replace video shortcodes
  // Format: [[video platform="youtube" id="h0g2d4F" title="Visualizing B-Trees"]]
  const VIDEO_SHORTCODE_RE = /\[\[video\s+platform=["'](youtube|loom|vimeo)["']\s+id=["']([^"']+)["'](?:\s+title=["']([^"']*)["'])?\s*\]\]/g;
  const preprocessedText = cleaned.replace(VIDEO_SHORTCODE_RE, (_, platform, id, title) => {
    let embedUrl = "";
    if (platform === "youtube") {
      embedUrl = `https://www.youtube.com/embed/${id}`;
    } else if (platform === "loom") {
      embedUrl = `https://www.loom.com/embed/${id}`;
    } else if (platform === "vimeo") {
      embedUrl = `https://player.vimeo.com/video/${id}`;
    }
    return `<div class="video-container my-8 relative w-full aspect-video rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-lg bg-black"><iframe src="${embedUrl}" title="${title || 'Video supplement'}" class="absolute inset-0 w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  });

  const hl = await getHighlighterInstance();
  const customRenderer = new marked.Renderer();

  let imageCount = 0;
  customRenderer.image = ({ href, title, text }) => {
    imageCount++;
    const isFirst = imageCount === 1;
    const loading = isFirst ? "eager" : "lazy";
    const fetchPriority = isFirst ? "high" : "low";
    
    return `
      <figure class="my-8 flex flex-col items-center gap-3 w-full">
        <div class="relative w-full rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-md bg-[#1f2428]">
          <img 
            src="${href}" 
            alt="${text || ''}" 
            title="${title || ''}" 
            loading="${loading}" 
            fetchpriority="${fetchPriority}"
            class="w-full h-auto max-h-[500px] object-contain mx-auto block"
          />
        </div>
        ${text ? `<figcaption class="text-sm font-sans text-foreground-secondary italic text-center">${text}</figcaption>` : ""}
      </figure>
    `;
  };

  customRenderer.code = ({ text, lang }) => {
    const cleanLangMeta = lang || "";
    const langWord = cleanLangMeta.split(" ")[0] || "text";
    const mappedLang = languageMap[langWord.toLowerCase()] || langWord;
    const highlightedLines = parseLineHighlights(cleanLangMeta);

    const escapedCode = escapeHtml(text);

    let shikiHtml = "";
    try {
      shikiHtml = hl.codeToHtml(text, {
        lang: mappedLang,
        theme: "github-dark",
      });
    } catch {
      shikiHtml = `<pre class="shiki" style="background-color:#24292e;color:#e1e4e8"><code><span class="line">${escapedCode}</span></code></pre>`;
    }

    // Now post-process the Shiki output to insert line numbers and highlight specific lines
    let lineIdx = 0;
    const processedShikiHtml = shikiHtml.replace(/<span class="line">/g, () => {
      lineIdx++;
      const isHighlighted = highlightedLines.has(lineIdx);
      const classes = [
        "line",
        isHighlighted ? "highlighted-line" : "",
      ].filter(Boolean).join(" ");
      return `<span class="${classes}" data-line="${lineIdx}">`;
    });

    return `
      <div class="code-block-container group relative my-6 rounded-xl border border-[var(--color-border)] bg-[#24292e] overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[#1f2428] text-xs text-foreground-secondary font-mono">
          <div class="flex items-center gap-2">
            <span class="font-semibold uppercase text-primary-400">${langWord}</span>
            <button class="toggle-line-numbers-btn px-2 py-0.5 rounded bg-[#2f363d] hover:bg-[#444d56] transition-colors text-[10px] text-foreground-secondary" title="Toggle Line Numbers">123</button>
          </div>
          <button class="copy-code-btn px-2 py-1 rounded bg-[#2f363d] hover:bg-[#444d56] transition-colors text-[10px] text-foreground-secondary font-semibold" data-code="${escapedCode}">Copy</button>
        </div>
        <div class="overflow-x-auto py-4 code-block-content show-line-numbers">
          ${processedShikiHtml}
        </div>
      </div>
    `;
  };

  let html = await marked.parse(preprocessedText, { renderer: customRenderer, gfm: true, breaks: false });

  for (let i = 0; i < admonitions.length; i++) {
    const { type, body } = admonitions[i];
    const bodyContent = processBodyContent(body);
    const bodyHtml = await marked.parse(bodyContent, { renderer: customRenderer, gfm: true, breaks: false });
    const admonitionHtml = renderAdmonitionHtml(type, bodyHtml);
    html = html.replace(`${PLACEHOLDER_PREFIX}${i}${PLACEHOLDER_SUFFIX}`, admonitionHtml);
  }

  return html;
}
