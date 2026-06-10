# Graphy

**A structured backend engineering learning platform organized as a graph of concepts, prerequisites, implementations, and exercises.**

Graphy teaches backend concepts through a connected knowledge graph rather than a linear course. It helps learners understand what each concept means, why it exists, what depends on it, how it appears in production systems, how to implement it in multiple languages, and how related concepts connect.

Think of it as a map of backend knowledge: start anywhere, follow prerequisite paths, explore related topics, and build a complete mental model of backend systems.

---

## Why Graphy?

Backend learning resources are fragmented:
- Blog posts explain isolated topics
- Courses are mostly linear
- Roadmap sites list topics but don't teach them deeply
- Language-specific tutorials rarely explain system-level tradeoffs
- System design resources often skip implementation details

Graphy solves this by combining structured explanations, prerequisite mapping, multi-language examples, and practical exercises into one connected platform.

---

## Features

- **Concept graph** — Every backend topic is a node with edges to prerequisites, related concepts, and dependent topics
- **Learning paths** — Curated sequences through the graph (Backend Fundamentals, Databases Deep Dive, Distributed Systems, etc.)
- **Multi-language examples** — Go, TypeScript/Node.js, Python, C#, and Java (more planned)
- **Progress tracking** — Mark concepts read, exercises complete, track path progress
- **Exercises** — Conceptual questions, implementation tasks, system design prompts, and more
- **Search** — Full-text search across concepts, paths, and exercises
- **Bookmarks** — Save topics for later
- **Recommendations** — Suggested next topics based on your progress and preferences

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Content | MDX files stored in Git |
| Database | PostgreSQL |
| Auth | Auth.js / Clerk (MVP) |
| Search | PostgreSQL full-text search (MVP) |
| Graph viz | React Flow or Cytoscape.js |

---

## Getting started

```bash
# Clone the repo
git clone https://github.com/your-org/graphy.git
cd graphy

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

---

## Project structure

```
graphy/
├── content/           # MDX concept, path, and exercise files
│   ├── concepts/
│   ├── paths/
│   └── exercises/
├── src/
│   ├── app/           # Next.js App Router pages
│   ├── components/    # React components
│   ├── lib/           # Utilities and shared logic
│   ├── db/            # Database schema and queries
│   └── types/         # TypeScript types
├── public/            # Static assets
└── tools/             # Content validation and build scripts
```

---

## Content model

Concepts are written in MDX with frontmatter metadata:

```yaml
title: Idempotency
slug: idempotency
summary: Making repeated operations safe by ensuring the same request has the same effect.
difficulty: intermediate
domains:
  - api-design
  - distributed-systems
  - reliability
prerequisites:
  - http-methods
  - retries
  - database-constraints
related:
  - message-queues
  - distributed-locks
  - payment-systems
  - exactly-once-processing
languages:
  - go
  - typescript
  - python
  - csharp
```

---

## Roadmap

See [TRD.md](./TRD.md) for the full technical requirements document.

### Phase 1 — Foundation
- Next.js app scaffold, content schema, MDX template, initial 20 concepts

### Phase 2 — Graph model
- Concept metadata parser, graph edge validation, prerequisite linking, basic graph explorer

### Phase 3 — Learning paths
- Path content type, ordered steps, user progress, dashboard

### Phase 4 — Multi-language examples
- Language tabs, preferred languages, examples in Go, TypeScript, Python, C#, Java

### Phase 5 — Exercises and recommendations
- Exercise content type, recommendations engine, bookmarks, search filters

---

## Contributing

Graphy is open source and welcomes contributions.

- **Content** — Add or improve concept pages, exercises, and learning paths
- **Code** — Improve the platform, add features, fix bugs
- **Examples** — Add multi-language code examples for existing concepts
- **Translations** — Help make Graphy accessible to more learners

Please read our contributing guide (coming soon) before submitting a PR.

---

## License

[MIT](./LICENSE)

---

## Acknowledgments

Graphy is inspired by the many learners and engineers who wished backend education was more connected, practical, and language-agnostic.
