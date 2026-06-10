# Contributing to Graphy

Thank you for your interest in contributing to Graphy! Graphy is an open-source platform designed to teach backend engineering through an interactive knowledge graph. Your contributions—whether writing content, fixing bugs, or suggesting new paths—help make backend education accessible and engaging.

---

## 1. How to Contribute

We follow a standard fork-and-pull-request workflow on GitHub.

### Step 1: Fork the Repository

Fork the repository on GitHub to your own account.

### Step 2: Clone the Fork

Clone your fork locally:

```bash
git clone https://github.com/tomiwa-a/graphy.git
cd graphy
```

### Step 3: Create a Branch

Create a descriptive branch for your changes:

```bash
git checkout -b feat/your-feature-name
# or for bug fixes:
git checkout -b fix/your-bug-name
```

### Step 4: Implement Changes & Test

- Run `npm install` to install local dependencies.
- Run the development server with `npm run dev` to verify changes in real-time.
- Before staging, run `npm run build` to ensure the Next.js compilation and TypeScript compiler pass successfully.

### Step 5: Commit Your Changes

We use semantic commit messages to keep our git history clean:

- `feat: ...` for new features or concepts
- `fix: ...` for bug fixes
- `docs: ...` for updates to documentation
- `style: ...` for visual CSS/Tailwind tweaks
- `refactor: ...` for code cleanup

Example:

```bash
git commit -m "feat: add B-Tree concept node"
```

### Step 6: Push and Open a Pull Request

Push your branch to your fork and open a Pull Request (PR) against the `main` branch of the parent repository.

---

## 2. Coding & Content Standards

### TypeScript & Linting

All code must comply with the TypeScript and ESLint configuration. Run the build to verify types:

```bash
npm run build
```

### Formatting

We use Prettier for code formatting. You can run Prettier using your IDE or command line before committing.

### Content Model (MDX)

Concept files must contain valid frontmatter:

- Unique, slugified filename (e.g. `caching-strategies.mdx`)
- Metadata properties including `slug`, `title`, `domain`, `difficulty`, `prerequisites`, and `related`.

---

## 3. Future Plans & Roadmap

We welcome contributions targeting our future roadmap items:

### 🌐 Multi-Language Support (Content Translations)

We plan to introduce translations for all concept content pages. Contributing translations for languages like Spanish, French, Portuguese, or Mandarin will help developers learn backend engineering in their native languages.

### 🐍 Language-Specific Paths

Currently, code blocks show examples in multiple languages (Go, TS, Python). In the future, we want to compile custom paths dedicated to specific languages (e.g. "Go Backend Engineer Journey", focusing on Go concurrency and profiling alongside standard backend systems).

### 💻 Interactive Code Playgrounds

We plan to integrate sandboxed code execution (using WebAssembly or remote execution environments) so that learners can write code, run tests, and complete coding challenges directly on the concept detail pages.

### 🧠 Dijkstra Cognitive Pathfinder

Integrating Dijkstra's algorithm inside the Graph Engine to prioritize routing based on a calculated **Cognitive Resistance Score**, allowing students to select between the "Fastest Path" (time-weighted) or "Easiest Path" (difficulty-weighted).
