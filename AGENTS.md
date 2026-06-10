<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Goal

Implement Phase 1 (chapter-grouped markdown content + SEO) and Phase 2 (rich markdown rendering with tables, admonitions, citations, and inline code blocks) of the contentphases.md roadmap.

## Constraints & Preferences

- Commits use `feat:` / `fix:` / `chore:` prefixes, no step/phase mentions.
- Base URL is `https://graphy.ellomas.com` — stored in `src/lib/constants.ts` as `SITE_URL`.
- Markdown `canonical_url` values are relative paths (e.g. `/concepts/http`); build script prepends `SITE_URL`.
- Theory-first philosophy: body content should support illustrative inline code blocks, not just a code tab section at the bottom.

## Progress

### Done

- Created `src/content/concepts/{foundations,api-design,databases,reliability,caching}/*.md` for all 9 concepts, each with YAML frontmatter (SEO fields, code_examples) and `## `-headed body sections.
- Created `scripts/build-content.js` — reads all `.md` files via gray-matter, parses frontmatter + sections, generates `src/lib/data/concepts-data.json`.
- Added `predev` / `prebuild` lifecycle hooks in `package.json`.
- Reduced `concepts.ts` from 789 lines to 52 — types + import from `concepts-data.json`.
- Added `seoTitle`, `seoDescription`, `canonicalUrl`, `ogImage`, `citations` to `Concept` type.
- Created `src/app/sitemap.ts` (dynamic sitemap.xml) and `src/app/robots.ts` (allows all, disallows /api/).
- Added JSON-LD `TechArticle` schema to `concepts/[slug]/page.tsx`.
- Created `src/lib/constants.ts` with `SITE_URL = "https://graphy.ellomas.com"`.
- Build script prepends `SITE_URL` to relative `canonical_url` values.
- Created `src/components/ui/markdown.tsx` — markdown renderer using `marked` + Shiki lazy-loading for code block highlighting.
- Created `src/components/ui/highlighted-code.tsx` (single code block with Shiki + copy button).
- Created `src/components/ui/admonition.tsx` (NOTE, TIP, WARNING, CAUTION callout cards).
- Created `src/components/ui/citation-card.tsx` (Core Literature References card).
- Updated concept detail page: body sections use `MarkdownRenderer`, added citations section + ToC entry.
- Added `> [!TIP]` demo admonition in HTTP "How it works" section.
- Added demo citation (HTTP: The Definitive Guide) in HTTP frontmatter.
- Added markdown-body CSS classes in `globals.css` for p, code, ul/ol, table, blockquote, strong.
- Fixed rendering bug: MarkdownRenderer now shows plain text fallback during SSR (null state check) and upgrades to rich HTML after client-side effect runs.

### In Progress

- _(none)_

### Blocked

- _(none)_

## Key Decisions

- Use `marked` (not `react-markdown`) for markdown rendering — avoids ESM/runtime issues in client components; Shiki highlighting applied via post-processing of HTML output.
- Admonitions preprocessed in source markdown as raw HTML divs before `marked` parsing — avoids fragile blockquote parsing.
- Admonitions use inline styles for colors (Tailwind arbitrary selectors with `&` break inside `dangerouslySetInnerHTML`).
- Section content data model unchanged (body sections remain as markdown strings split by `## ` headings).
- Generated `concepts-data.json` committed to git — prebuild hook ensures it stays in sync.
- SSR fallback: render `content` as plain `<p>` text when `html` is null — avoids hydrated mismatch and ensures content is always visible.

## Next Steps

- Create `sample.md` in content directory that exercises all markdown features (tables, lists, code blocks, admonitions, bold/italic, citations) for user testing.
- Verify admonition/code block rendering after client-side hydration (browser test).

## Relevant Files

- `src/components/ui/markdown.tsx`: main markdown renderer (marked + Shiki + admonition preprocessing, with null-state SSR fallback)
- `src/app/globals.css`: `.markdown-body` styles for all rendered elements
- `src/components/ui/highlighted-code.tsx`: single code block with Shiki
- `src/app/concepts/[slug]/page.tsx`: uses `MarkdownRenderer` for section body content; renders `CitationCard` + `LanguageTabSwitcher`
- `scripts/build-content.js`: reads `.md` → generates `concepts-data.json`; prepends `SITE_URL` to relative `canonical_url`
- `src/lib/data/concepts.ts`: types including `seoTitle`, `seoDescription`, `canonicalUrl`, `ogImage`, `citations`
