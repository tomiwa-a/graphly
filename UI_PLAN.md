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

## Phase 2: Core UI Components

- [ ] Build `Button` component (variants: primary, secondary, ghost, outline)
- [ ] Build `Badge` / `Tag` component (for difficulty levels and domain tags)
- [ ] Build `Card` component (with and without hover effect)
- [ ] Build `CodeBlock` component with syntax highlighting shell
- [ ] Build `ProgressBar` component
- [ ] Build `Avatar` component
- [ ] Build `Skeleton` / loading placeholder component

---

## Phase 3: Layout & Navigation

- [ ] Build global `Navbar`/`Header` (logo, nav links, auth state, mobile toggle)
- [ ] Build `Sidebar` (domain category navigation with expand/collapse)
- [ ] Build `Footer` (links, branding, social)
- [ ] Build `MobileMenu` (slide-in drawer for small screens)
- [ ] Build `Breadcrumb` component (dynamic from route segments)
- [ ] Build responsive page layout templates (full-width, with-sidebar, with-sidebar-right)

---

## Phase 4: Home Page

- [ ] Build `HeroSection` (tagline, CTA, visual)
- [ ] Build `FeaturedConceptsGrid` (4-6 highlighted concept cards)
- [ ] Build `LearningPathsOverview` (path cards with progress preview)
- [ ] Build `DomainExplorerSection` (browse by domain category grid)
- [ ] Build `StatsBar` (concepts count, languages, paths, learners)
- [ ] Build `CTASection` (sign-up prompt for returning visitors)

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
