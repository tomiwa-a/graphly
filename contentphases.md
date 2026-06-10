# Roadmap: Advanced Content & SEO Systems (5 Phases)

This roadmap outlines the multi-phase transition from static hardcoded concept listings to a scalable, media-rich, and search-engine-optimized Markdown catalog organized by chapters.

---

## Phase 1: Chapter-Grouped Directory & Custom Page SEO
- [x] **Directory Organization**: Group markdown files under their respective chapter subdirectories to maintain logical organization:
  ```
  src/content/concepts/
  ├── foundations/
  │   ├── http.md
  │   └── bits.md
  ├── api-design/
  │   └── idempotency.md
  └── databases/
      └── indexes.md
  ```
- [x] **Frontmatter SEO Overrides**: Introduce custom SEO parameters inside each markdown's metadata frontmatter:
  ```yaml
  seo_title: "Idempotency in REST APIs: Building Reliable Distributed Endpoints"
  seo_description: "Learn how idempotency keys mathematically prevent double-billing and duplicate resource creation in HTTP POST networks."
  canonical_url: "/concepts/idempotency"
  og_image: "/images/og/idempotency.png"
  ```
- [x] **Dynamic Sitemap & Robots.txt**: [sitemap.ts](file:///Users/pitersonsmartpro/Documents/projects/graphy/src/app/sitemap.ts) and [robots.ts](file:///Users/pitersonsmartpro/Documents/projects/graphy/src/app/robots.ts) at the App router root, dynamically fetching metadata from all chapter directories to index every topic cleanly.
- [x] **JSON-LD Schema Markup**: JSON-LD structured schema tags (`TechArticle`) injected into the HTML head of [concepts/[slug]/page.tsx](file:///Users/pitersonsmartpro/Documents/projects/graphy/src/app/concepts/%5Bslug%5D/page.tsx) to facilitate rich search results in Google/Bing.

---

## Phase 2: Rich Formatting (Tables, Admonitions & Literature Citations)
- [x] **Markdown Table Support**: GFM tables rendered as responsive, styled comparison grids via `remark-gfm` + custom table components in the markdown renderer.
- [x] **Admonitions & Alerts**: GitHub-style callouts (`> [!NOTE]`, `> [!WARNING]`, `> [!TIP]`, `> [!CAUTION]`) parsed and rendered as styled callout cards.
- [x] **Textbook & Book Citations**: Frontmatter `citations` block parsed by build script; rendered as "Core Literature References" card at the bottom of concept pages.

  **Rendering**: Section body content now rendered as full Markdown via `react-markdown` + `remark-gfm`, enabling inline **bold**, `code`, ```fenced code blocks``` with Shiki syntax highlighting, lists, tables, admonitions, and links anywhere in the body.

---

## Phase 3: Media Embeds & Interactive Graphics
- [ ] **Video Embed System**: Support video embedding for learning supplements (e.g., YouTube, Loom, or Vimeo) using frontmatter configuration or custom regex shortcodes:
  ```yaml
  video_embed:
    platform: "youtube"
    id: "h0g2d4F"
    title: "Visualizing B-Trees"
  ```
- [ ] **Inline Graphic Captions**: Standardize inline image parsing with clean block-captions, responsive layouts, Fetch Priority, and LCP layout-shift optimizations.
- [ ] **Mermaid/SVG Diagram Support**: Compile inline raw SVG strings or custom flowchart diagrams inside markdown bodies to render high-contrast system design schematics directly.

---

## Phase 4: Syntax-Highlighted Code & Playgrounds
- [ ] **Shiki Highlight Compilation**: Utilize the build-time Shiki syntax highlighter (`shiki` dependency in `package.json`) to render syntax-colored code examples for Go, Python, and TypeScript, complete with:
  * Line-numbering toggles.
  * Highlighted target lines.
  * An inline "Copy Code" button.
- [ ] **Playground Shortcuts**: Embed direct links to interactive sandboxes (e.g., StackBlitz, Replit, or Go Playground) so users can immediately test and run the algorithms.

---

## Phase 5: Full-Text Search Indexing & RSS Feeds
- [ ] **Full-Text Compilation**: Modify the compiler script to build a static search index (`search-index.json`) that contains not just the title/summary but the *entire body text* of all markdown files, allowing client-side full-text search queries.
- [ ] **Syllabus RSS Feed**: Expose an `/rss.xml` learning feed, allowing users to subscribe to new chapter additions or curriculum updates.
