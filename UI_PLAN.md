# UI Build Plan — 10 Phases

> No content yet. Just the UI shell, components, and pages.

---

## Phase 1: Setup ✅

- [x] Initialize Next.js project with TypeScript and App Router
- [x] Configure Tailwind CSS with custom design tokens (colors, spacing, typography)
- [x] Set up base layout shell (`RootLayout`, `BodyLayout`)
- [x] Configure font loading (Inter or similar system font stack)
- [~] Set up dark/light theme infrastructure (`ThemeProvider`, `useTheme` hook) — *skipped, light mode only*
- [x] Add ESLint and Prettier config

---

## Phase 2: Core UI Components ✅

- [x] Build `Button` component (variants: primary, secondary, outline, ghost, destructive, link) and 5 sizes
- [x] Build `Badge` / `Tag` component (for difficulty levels and domain tags)
- [x] Build `Card` component (with hover, accent strips, and sub-components)
- [x] Build `CodeBlock` component with shiki syntax highlighting and language tabs
- [x] Build `ProgressBar` component (determinate, with label, size variants)
- [x] Build Very simple basic UI designed directly for concept pages with clear navigation and focused reading experience

## Phase 3: Layout & Navigation ✅

- [x] Build simple navbar with Graphy branding and basic navigation links
- [x] Build minimal footer with essential links
- [x] Build concept page layout with clear content areas and navigation

## Phase 4: Home Page

- [ ] *Skipped - Going directly to Phase 5*

---

## Phase 5: Concept Page ✅

- [x] Build `ConceptHeader` (title, summary, difficulty, domain, reading time)
- [x] Build `PrerequisitesList` (linked prerequisite concept cards)
- [x] Build `RelatedConceptsList` (linked related concept cards)
- [x] Build `LanguageTabSwitcher` (tab bar with language icons, empty state per language)
- [x] Build `TableOfContents` (sticky sidebar nav from page headings)
- [x] Build `ProgressAndBookmarkBar` (mark-read toggle, bookmark button)
- [x] Build `NextRecommendedSection` (2-3 suggested next concepts)

---

## Phase 5: Concept Page

- [ ] Build `ConceptHeader` (title, summary, difficulty badge, domain tags, reading time)
- [ ] Build `PrerequisitesList` (linked prerequisite concept cards)
- [ ] Build `RelatedConceptsList` (linked related concept cards)
- [ ] Build `LanguageTabSwitcher` (tab bar with language icons, empty state per language)
- [ ] Build `TableOfContents` (sticky sidebar nav from page headings)
- [ ] Build `ProgressAndBookmarkBar` (mark-read toggle, bookmark button)
- [ ] Build `NextRecommendedSection` (2-3 suggested next concepts)

---

## Phase 6: Learning Paths Page

- [ ] Build `PathIndexPage` (grid of all learning path cards)
- [ ] Build `PathCard` (title, summary, difficulty, step count, estimated hours)
- [ ] Build `PathDetailPage` header (title, summary, metadata, overall progress bar)
- [ ] Build `StepList` (ordered vertical timeline with checkable steps)
- [ ] Build `StepCard` (title, type badge, duration, completion checkbox)
- [ ] Build empty/completed state for finished paths

---

## Phase 7: Graph Explorer

- [ ] Build `GraphContainer` (canvas wrapper with zoom/pan controls)
- [ ] Build `ConceptNode` component (draggable node with label, difficulty color)
- [ ] Build edge/connection rendering between nodes
- [ ] Build `NodeTooltip` (popover on hover with quick summary + link)
- [ ] Build `GraphControls` (zoom in/out, reset, fit-to-screen buttons)
- [ ] Build `ListViewFallback` (accessible table/list of relationships)
- [ ] Build `FocusMode` (select a node to highlight its neighborhood)

---

## Phase 8: Search

- [ ] Build `SearchInput` (search bar with icon, keyboard shortcut hint)
- [ ] Build `SearchSuggestionsDropdown` (live suggestions as user types)
- [ ] Build `SearchResultsPage` (result list with pagination)
- [ ] Build `SearchResultCard` (title, type badge, difficulty, domain, excerpt)
- [ ] Build `SearchFilters` (domain checkboxes, difficulty radio, language selector)
- [ ] Build empty state ("No results found") with suggestions

---

## Phase 9: Dashboard

- [ ] Build `DashboardLayout` (sidebar nav: progress, bookmarks, settings)
- [ ] Build `ProgressSummaryCards` (completed concepts, paths in progress, streak)
- [ ] Build `BookmarksList` (sortable list of saved concepts with remove action)
- [ ] Build `RecentlyViewedList` (history of last 10 concepts)
- [ ] Build `RecommendationsSection` (5 recommended concepts with reason labels)
- [ ] Build `LanguagePreferencesSelector` (checkboxes for preferred languages)

---

## Phase 10: Auth Pages & Polish

- [ ] Build `SignInPage` (email input, provider buttons: Google, GitHub)
- [ ] Build `SignUpPage` (name, email, preferred language selection)
- [ ] Build `AuthGuard` wrapper component (redirect to sign-in if unauthenticated)
- [ ] Build `NotFoundPage` (404 with link to home/explore)
- [ ] Build `ErrorBoundary` fallback UI (500 with retry button)
- [ ] Build responsive pass (test every page at mobile, tablet, desktop breakpoints)
- [ ] Build page transition animations (optional, subtle fade/slide)
