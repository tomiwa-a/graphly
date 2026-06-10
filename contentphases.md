# Roadmap: Advanced Content & SEO Systems (5 Phases)

This roadmap outlines the multi-phase transition from static hardcoded concept listings to a scalable, media-rich, and search-engine-optimized Markdown catalog organized by chapters.

---

## Phase 1: Chapter-Grouped Directory & Custom Page SEO
- [ ] **Directory Organization**: Group markdown files under their respective chapter subdirectories to maintain logical organization:
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
- [ ] **Frontmatter SEO Overrides**: Introduce custom SEO parameters inside each markdown's metadata frontmatter:
  ```yaml
  seo_title: "Idempotency in REST APIs: Building Reliable Distributed Endpoints"
  seo_description: "Learn how idempotency keys mathematically prevent double-billing and duplicate resource creation in HTTP POST networks."
  canonical_url: "https://graphy.dev/concepts/idempotency"
  og_image: "/images/og/idempotency.png"
  ```
- [ ] **Dynamic Sitemap & Robots.txt**: Establish [sitemap.ts](file:///Users/pitersonsmartpro/Documents/projects/graphy/src/app/sitemap.ts) and [robots.ts](file:///Users/pitersonsmartpro/Documents/projects/graphy/src/app/robots.ts) at the App router root, dynamically fetching metadata from all chapter directories to index every topic cleanly.
- [ ] **JSON-LD Schema Markup**: Inject JSON-LD structured schema tags (specifically `TechArticle` and `CourseInfo`) into the HTML head of [concepts/[slug]/page.tsx](file:///Users/pitersonsmartpro/Documents/projects/graphy/src/app/concepts/%5Bslug%5D/page.tsx) to facilitate rich search results in Google/Bing.

---

## Phase 2: Rich Formatting (Tables, Admonitions & Literature Citations)
- [ ] **Markdown Table Support**: Build parser capability to compile standard markdown tables into responsive, stylized HTML comparison grids (ideal for comparing database index types, HTTP methods, or cache eviction strategies).
- [ ] **Admonitions & Alerts**: Support GitHub-style callouts (`> [!NOTE]`, `> [!WARNING]`, `> [!TIP]`) using vanilla CSS styles for highlights.
- [ ] **Textbook & Book Citations**: Include a frontmatter block for literature citations to ground the content in standard computer science literature:
  ```yaml
  citations:
    - title: "Designing Data-Intensive Applications"
      author: "Martin Kleppmann"
      chapter: "Chapter 3: Storage and Retrieval"
      page_range: "75-92"
      external_link: "https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/"
  ```
  Render these citations in a premium "Core Literature References" card at the bottom of the concept detail layout.

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
