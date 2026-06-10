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

## Phase 9: Dynamic Journey Builder & Dashboard (UI Only)

- [ ] Build `JourneyBuilder` component: Visual selection of starting concept and goal concept (e.g., Bits ➔ Caching)
- [ ] Build `SubwayTimeline` component: Dynamically renders the compiled topological path as a sequential horizontal/vertical metro line
- [ ] Build `AdvisoryDetours` card: Displays recommended "local stops" and prerequisite detours based on current selection
- [ ] Build `ProgressMasteryCard`: Local-storage driven completion tracker (e.g., 3/6 concepts completed)
- [ ] Build `ResetProgressButton`: Clean trigger to flush localStorage progress keys and reset the graph visuals

---

## Phase 10: Flow Highlights, Warnings & Mobile Metro-Lines (UI Only)

- [ ] Build `PrerequisiteWarningBanner`: Interactive alert banner shown in concept headers and sidebars when prerequisites are incomplete
- [ ] Build `DependencyFlowHighlighter`: Interactive hover state on the graph canvas that highlights upstream prerequisites (in red) and downstream applications, dimming other nodes
- [ ] Build `EdgeFlowAnimation`: CSS-based SVG dash-flow animations on connection lines of completed/active learning paths
- [ ] Build `MobileMetroLine`: Responsive fallback that automatically stacks the SVG graph canvas as a clean, vertical, touch-friendly metro line timeline on mobile screens
- [ ] Build page transition animations for smooth switching between routes
- [ ] Conduct detailed cross-device responsive layout check for all concept, path, and graph pages


