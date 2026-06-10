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
- [x] Build `NextRecommendedSection` (2-3 suggested next concepts)
- [x] Build `ConceptCard` + `ConceptCardMini` reusable components
- [x] Build `ConceptFilters` (domain + difficulty filter pills)
- [x] Build `/concepts` index page with filtering
- [x] Build `/concepts/[slug]` detail page with two-column layout

---

## Phase 6: Learning Paths ✅

- [x] Build `PathCard` (title, summary, difficulty, step count, estimated hours)
- [x] Build `PathIndexPage` (`/paths`) with grid of path cards
- [x] Build `StepList` (vertical timeline with checkable steps)
- [x] Build `StepCard` (timeline node, title, summary, completion checkbox)
- [x] Build `/paths/[slug]` detail page with progress tracking (localStorage)
- [x] Build completion celebration state

---

## Phase 7: Graph Explorer ✅

- [x] Build `GraphContainer` (custom SVG canvas with zoom/pan controls)
- [x] Build `ConceptNode` component (circle node with difficulty color, label)
- [x] Build edge/connection rendering (solid = prerequisite, dashed = related)
- [x] Build node detail side panel (summary, metadata, links)
- [x] Build `GraphControls` (zoom in/out, reset buttons)
- [x] Build `ListViewFallback` (accessible table of all concepts)
- [x] Build `FocusMode` (click node to dim unrelated nodes)

---

## Phase 8: Search ✅

- [x] Build `SearchInput` (search bar with icon, ⌘K keyboard shortcut)
- [x] Build `SearchResultsPage` (real-time filtering with result count)
- [x] Build `SearchFilters` (domain checkboxes, difficulty radio — sidebar)
- [x] Build empty state with suggested searches
- [x] Build responsive filter sidebar (collapses on mobile)

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
- [x] Build `NotFoundPage` (404 with disconnected graph illustration + links)
- [ ] Build `ErrorBoundary` fallback UI (500 with retry button)
- [ ] Build responsive pass (test every page at mobile, tablet, desktop breakpoints)
- [ ] Build page transition animations (optional, subtle fade/slide)

