# Technical Requirements Document — Graphy

| Field | Value |
|---|---|
| Product name | Graphy |
| Document type | Technical Requirements Document |
| Version | 0.1 |
| Status | Draft |
| Owner | Tomiwa Amole |
| Primary goal | Build a structured backend engineering learning platform organized as a graph of concepts, prerequisites, implementations, and exercises. |

---

## 1. Product summary

Graphy is a web-based backend engineering learning platform that teaches backend concepts through a connected knowledge graph rather than a linear course.

The platform should help learners understand:

- what each backend concept means,
- why it exists,
- what depends on it,
- what it depends on,
- how it appears in production systems,
- how to implement it in multiple programming languages,
- and how related concepts connect across backend engineering.

Graphy should feel like a map of backend knowledge: users can start anywhere, follow prerequisite paths, explore related topics, and gradually build a complete mental model of backend systems.

---

## 2. Problem statement

Backend learning resources are usually fragmented:

- blog posts explain isolated topics,
- courses are mostly linear,
- roadmap sites list topics but do not teach them deeply,
- language-specific tutorials rarely explain system-level tradeoffs,
- system design resources often skip implementation details,
- and learners struggle to understand how topics relate.

Graphy solves this by combining structured explanations, prerequisite mapping, multi-language examples, and practical exercises into one connected platform.

---

## 3. Target users

### 3.1 Primary users

**Beginner backend developers**

- Know basic programming.
- Want to understand backend fundamentals.
- Need guidance on what to learn next.

**Intermediate developers**

- Can build APIs.
- Want to understand databases, queues, caching, auth, scaling, and deployment more deeply.
- Need production-oriented mental models.

**Frontend developers moving backend**

- Understand web apps.
- Need a structured backend pathway.
- Prefer examples in familiar languages such as TypeScript.

**Computer science students**

- Need practical explanations that connect theory with implementation.
- Want project and interview preparation.

### 3.2 Secondary users

**Engineering mentors**

- Need structured learning paths for juniors.

**Technical writers**

- May contribute concept pages, exercises, diagrams, and examples.

**Interview candidates**

- Want to understand system design concepts and their relationships.

---

## 4. Product goals

### 4.1 Core goals

- Provide a structured graph of backend engineering knowledge.
- Teach concepts with clear explanations and production context.
- Support multiple programming languages for examples.
- Show prerequisites and related topics for every concept.
- Allow learners to follow guided paths or explore freely.
- Make backend learning practical through exercises and mini-projects.

### 4.2 Non-goals for MVP

- Full browser-based code execution.
- Paid certification system.
- AI tutoring.
- Mobile app.
- Real-time collaboration.
- User-generated public content without review.
- Full university-style course management.

---

## 5. Core product concept

Graphy is built around concept nodes.

A concept node represents one backend topic, such as:

- HTTP
- REST APIs
- SQL indexes
- transactions
- Redis caching
- idempotency
- message queues
- retries
- distributed locks
- rate limiting
- observability
- deployment pipelines
- load balancing
- consensus
- CAP theorem

Each concept node has relationships to other nodes.

Example:

```
Idempotency
├── prerequisites
│   ├── HTTP methods
│   ├── request IDs
│   ├── database constraints
│   └── retries
├── related concepts
│   ├── message queues
│   ├── payments
│   ├── distributed locks
│   └── exactly-once processing
└── exercises
    ├── implement idempotent API endpoint
    └── test retry-safe payment creation
```

---

## 6. MVP scope

### 6.1 MVP must include

- Public web app.
- Concept graph data model.
- Topic pages.
- Prerequisite and related-topic links.
- Guided learning paths.
- Multi-language code examples.
- Search.
- Tags and difficulty levels.
- Basic user accounts.
- Progress tracking.
- Admin content editor or markdown-based content pipeline.

### 6.2 MVP should include

- Visual graph view for topic relationships.
- Bookmarking.
- Exercise pages.
- Concept quizzes.
- Content versioning.
- SEO-friendly public pages.

### 6.3 MVP may include

- AI-generated concept summaries.
- GitHub login.
- Discussion comments.
- Code sandbox embeds.
- Exportable learning roadmap.

---

## 7. Functional requirements

### 7.1 Concept pages

Each concept page must support the following sections:

- Overview
- Why it matters
- Mental model
- Prerequisites
- Related concepts
- How it works
- Production concerns
- Common mistakes
- Code examples
- Exercises
- Interview relevance
- Further reading

**Requirements**

- Users must be able to view a concept page without signing in.
- Concept pages must be SEO-indexable.
- Each concept must have a unique slug.
- Each concept must have a difficulty level: beginner, intermediate, advanced.
- Each concept must belong to one or more domains.
- Each concept must list prerequisites and related topics.
- Each concept must support multiple code examples.
- Each concept must support diagrams or images.

---

### 7.2 Knowledge graph

Graphy must represent backend knowledge as a directed graph.

**Node types**

- Concept
- Learning path
- Exercise
- Project
- Code example
- Glossary term
- External resource

**Edge types**

- Requires
- Related to
- Builds on
- Used in
- Implements
- Part of
- Alternative to
- Commonly confused with

**Requirements**

- A concept can have zero or more prerequisite concepts.
- A concept can have zero or more related concepts.
- Graph relationships must be queryable from the backend.
- The system must support rendering nearby nodes for a selected concept.
- The graph must support future visual exploration.

---

### 7.3 Learning paths

Learning paths are curated sequences of concept nodes.

Example paths:

- Backend Fundamentals
- Databases Deep Dive
- API Design
- Distributed Systems
- Production Backend Engineering
- System Design Interview Prep
- Backend with Go
- Backend with TypeScript
- Backend with Python
- Backend with C#

**Requirements**

- A learning path must contain ordered steps.
- A step may reference a concept, exercise, or project.
- Users must be able to mark steps as complete.
- Users must see progress percentage.
- Learning paths must show estimated completion time.

---

### 7.4 Multi-language examples

Graphy must teach concepts using multiple implementation languages.

**Initial supported languages**

- Go
- TypeScript / Node.js
- Python
- C#
- Java

**Later supported languages**

- Rust
- PHP
- Kotlin
- Ruby

**Requirements**

- Code examples must be attached to concept pages.
- Each code example must specify language, title, description, and code.
- Users must be able to switch between language tabs.
- If a concept has no example for a selected language, the UI must show a friendly empty state.
- Code examples must support syntax highlighting.

---

### 7.5 Search

Users must be able to search concepts, exercises, learning paths, and glossary terms.

**Requirements**

- Search must support keyword search.
- Search results must show title, type, difficulty, and short summary.
- Search must tolerate partial matches.
- Search should prioritize exact title matches.
- Search should support filters by domain, difficulty, and language.

---

### 7.6 User accounts

**Requirements**

- Users must be able to sign up and sign in.
- Users must be able to track learning progress.
- Users must be able to bookmark concepts.
- Users must be able to set preferred programming languages.
- Public content must remain accessible without login.

**Authentication options**

Recommended MVP options:

- Email magic link
- GitHub OAuth
- Google OAuth

---

### 7.7 Progress tracking

**Requirements**

- Users must be able to mark concepts as read.
- Users must be able to mark exercises as complete.
- Users must be able to track progress within learning paths.
- Users must see recently viewed concepts.
- Users must see recommended next topics based on prerequisites.

---

### 7.8 Exercises

Exercise types:

- Conceptual questions
- Implementation tasks
- Debugging tasks
- System design prompts
- Database query tasks
- API design tasks
- Tradeoff analysis

**Requirements**

- Each exercise must be linked to at least one concept.
- Exercises must have difficulty levels.
- Exercises must have expected learning outcomes.
- MVP exercises may be text-only.
- Later versions may include automated validation.

---

### 7.9 Admin / Content management

**Recommended MVP approach**

Use markdown or MDX files stored in Git.

Example structure:

```
content/
├── concepts/
│   ├── http.md
│   ├── idempotency.md
│   ├── transactions.md
│   └── redis-caching.md
├── paths/
│   ├── backend-fundamentals.md
│   └── distributed-systems.md
└── exercises/
    ├── idempotent-api.md
    └── rate-limiter.md
```

**Requirements**

- Content must be version-controlled.
- Content must support frontmatter metadata.
- Content must support code blocks.
- Content must support concept relationship metadata.
- Build process must validate broken links and missing prerequisites.
- Later versions may include a web admin editor.

---

## 8. Content model

### 8.1 Concept frontmatter

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
estimatedMinutes: 25
```

### 8.2 Concept body template

```markdown
## What it is

## Why it matters

## Mental model

## How it works

## Production concerns

## Common mistakes

## Code examples

## Exercise

## Interview relevance

## Related concepts
```

### 8.3 Learning path frontmatter

```yaml
title: Backend Fundamentals
slug: backend-fundamentals
summary: Learn the core concepts behind modern backend systems.
difficulty: beginner
estimatedHours: 12
steps:
  - internet-basics
  - dns
  - http
  - rest-apis
  - databases
  - authentication
  - caching
  - deployment
```

---

## 9. Information architecture

```
Home
├── Explore Graph
├── Learning Paths
│   ├── Backend Fundamentals
│   ├── Databases
│   ├── APIs
│   ├── Distributed Systems
│   ├── Production Engineering
│   └── System Design
├── Concepts
│   ├── APIs
│   ├── Databases
│   ├── Caching
│   ├── Queues
│   ├── Auth
│   ├── Observability
│   ├── Deployment
│   └── Distributed Systems
├── Exercises
├── Languages
│   ├── Go
│   ├── TypeScript
│   ├── Python
│   ├── C#
│   └── Java
└── Dashboard
    ├── Progress
    ├── Bookmarks
    └── Recommended next
```

---

## 10. Concept domains

### 10.1 Foundations

- Internet basics
- DNS
- TCP
- HTTP
- TLS
- JSON
- CLI basics
- Linux basics

### 10.2 API design

- REST
- GraphQL
- gRPC
- WebSockets
- pagination
- filtering
- versioning
- idempotency
- rate limiting
- API gateways

### 10.3 Databases

- relational databases
- SQL
- indexes
- transactions
- isolation levels
- locks
- migrations
- replication
- sharding
- connection pooling
- ORMs

### 10.4 Caching

- cache-aside
- write-through
- write-behind
- TTL
- invalidation
- Redis
- CDN caching
- stale-while-revalidate

### 10.5 Queues and events

- message queues
- pub/sub
- Kafka
- RabbitMQ
- dead letter queues
- retries
- backoff
- ordering
- consumer groups
- event sourcing

### 10.6 Auth and security

- authentication
- authorization
- sessions
- JWT
- OAuth
- API keys
- RBAC
- CSRF
- CORS
- rate limiting
- secrets management

### 10.7 Reliability

- retries
- timeouts
- circuit breakers
- bulkheads
- fallbacks
- health checks
- graceful shutdown
- idempotency
- exactly-once semantics

### 10.8 Observability

- logging
- metrics
- tracing
- OpenTelemetry
- alerting
- dashboards
- SLOs
- incident response

### 10.9 Deployment

- Docker
- containers
- CI/CD
- blue-green deployment
- canary deployment
- Kubernetes basics
- environment variables
- config management

### 10.10 Distributed systems

- CAP theorem
- consistency
- consensus
- leader election
- distributed locks
- replication
- partition tolerance
- eventual consistency
- clocks and ordering

---

## 11. Technical architecture

### 11.1 Recommended MVP architecture

```
Browser
  ↓
Next.js Web App
  ↓
API Layer
  ↓
Postgres
  ↓
Content files / CMS pipeline
```

**Frontend**

- Next.js
- React
- TypeScript
- Tailwind CSS
- MDX rendering
- Shiki or Prism for syntax highlighting
- React Flow or Cytoscape.js for graph visualization

**Backend**

- Next.js API routes for MVP, or separate Go backend if preferred.
- Postgres for users, progress, bookmarks, and graph metadata.
- File-based MDX content for concept pages.
- Background build step to parse content metadata into graph tables.

**Search (MVP)**

- Postgres full-text search.

**Search (later)**

- Meilisearch, Typesense, or Elasticsearch.

**Authentication**

- Auth.js
- Clerk
- Supabase Auth
- or custom auth with magic links.

### 11.2 Alternative Go-backed architecture

```
Browser
  ↓
Next.js Frontend
  ↓
Go API Server
  ↓
Postgres
  ↓
Content Parser
  ↓
MDX / Markdown Files
```

**Go backend responsibilities**

- Auth session validation.
- User progress API.
- Graph relationship queries.
- Search API.
- Content metadata ingestion.
- Recommendations.
- Admin validation tools.

**Frontend responsibilities**

- Page rendering.
- Graph visualization.
- User dashboard.
- Code tabs.
- Search UI.

---

## 12. Data model

### 12.1 Core tables

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  preferred_languages TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE concepts (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  estimated_minutes INT,
  body_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE concept_domains (
  concept_id UUID NOT NULL REFERENCES concepts(id),
  domain TEXT NOT NULL,
  PRIMARY KEY (concept_id, domain)
);

CREATE TABLE concept_edges (
  id UUID PRIMARY KEY,
  from_concept_id UUID NOT NULL REFERENCES concepts(id),
  to_concept_id UUID NOT NULL REFERENCES concepts(id),
  edge_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE code_examples (
  id UUID PRIMARY KEY,
  concept_id UUID NOT NULL REFERENCES concepts(id),
  language TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE learning_paths (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  estimated_hours INT
);

CREATE TABLE learning_path_steps (
  id UUID PRIMARY KEY,
  path_id UUID NOT NULL REFERENCES learning_paths(id),
  step_order INT NOT NULL,
  content_type TEXT NOT NULL,
  content_slug TEXT NOT NULL
);

CREATE TABLE user_progress (
  user_id UUID NOT NULL REFERENCES users(id),
  content_type TEXT NOT NULL,
  content_slug TEXT NOT NULL,
  status TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, content_type, content_slug)
);

CREATE TABLE bookmarks (
  user_id UUID NOT NULL REFERENCES users(id),
  content_type TEXT NOT NULL,
  content_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, content_type, content_slug)
);
```

---

## 13. API requirements

### 13.1 Public APIs

```
GET /api/concepts
GET /api/concepts/:slug
GET /api/concepts/:slug/related
GET /api/concepts/:slug/prerequisites
GET /api/paths
GET /api/paths/:slug
GET /api/search?q=
GET /api/graph?focus=:slug&depth=2
```

### 13.2 Authenticated APIs

```
GET /api/me
PATCH /api/me/preferences
POST /api/progress
GET /api/progress
POST /api/bookmarks
DELETE /api/bookmarks/:contentType/:slug
GET /api/recommendations
```

### 13.3 Admin / Build APIs

```
POST /api/admin/reindex-content
POST /api/admin/validate-graph
GET /api/admin/broken-links
```

---

## 14. Recommendation logic

Graphy should recommend next topics based on:

- user learning path,
- completed concepts,
- prerequisites already completed,
- selected preferred language,
- difficulty progression,
- related concepts from recently viewed pages.

### MVP recommendation algorithm

1. Find concepts not completed by the user.
2. Exclude concepts where prerequisites are not completed.
3. Rank by:
   - current learning path order,
   - relatedness to recently viewed concepts,
   - beginner before intermediate before advanced,
   - availability in user's preferred language.
4. Return top 5.

---

## 15. Non-functional requirements

### 15.1 Performance

- Public pages should load in under 2 seconds on average broadband.
- Concept pages should be statically generated where possible.
- Search response should return in under 500ms for MVP-sized content.
- Graph query should support at least 1,000 concept nodes and 10,000 edges.

### 15.2 Scalability

- MVP should support 10,000 monthly active users.
- Architecture should allow migration from Postgres search to dedicated search engine.
- Content pipeline should support hundreds of concepts.

### 15.3 Reliability

- Content builds must fail if required metadata is missing.
- Content builds must fail on broken prerequisite links.
- Database migrations must be version-controlled.
- User progress writes must be idempotent.

### 15.4 Security

- Use HTTPS in production.
- Sanitize rendered markdown and MDX.
- Prevent XSS in code examples and content.
- Use secure session cookies.
- Rate-limit auth endpoints.
- Validate all API inputs.
- Do not allow arbitrary script execution in user-submitted examples.

### 15.5 Accessibility

- Pages must be keyboard navigable.
- Graph view must have a list-based fallback.
- Color should not be the only indicator of concept status.
- Code blocks must be readable in light and dark themes.
- Follow WCAG 2.1 AA where practical.

### 15.6 SEO

- Public concept pages must include metadata title and description.
- Learning paths must be indexable.
- Sitemap must be generated.
- Open Graph previews should be supported.

---

## 16. UI requirements

### 16.1 Home page

The home page should explain:

- what Graphy is,
- who it is for,
- how backend topics are connected,
- popular learning paths,
- featured concepts,
- and a call to start learning.

### 16.2 Concept page

A concept page should include:

- title,
- summary,
- difficulty,
- estimated reading time,
- prerequisites,
- related concepts,
- content body,
- language tabs,
- exercises,
- progress action,
- bookmark action,
- next recommended topics.

### 16.3 Graph explorer

The graph explorer should include:

- focused concept node,
- prerequisite nodes,
- related nodes,
- dependent nodes,
- edge labels,
- zoom and pan,
- fallback list view,
- click to open concept.

### 16.4 Dashboard

Authenticated dashboard should include:

- current learning path,
- completed concepts,
- bookmarks,
- recommended next topics,
- recently viewed concepts,
- preferred languages.

---

## 17. Content quality requirements

Every concept page should answer:

- What is this?
- Why does it exist?
- What problem does it solve?
- What are the tradeoffs?
- Where does it appear in real systems?
- What are common mistakes?
- How do I implement it?
- What should I learn before and after this?

**Writing style**

- Clear.
- Practical.
- Not overly academic.
- Short sections.
- Real-world examples.
- Code where useful.
- Tradeoffs included.
- Avoid unexplained jargon.

---

## 18. Example concept page: Idempotency

### Metadata

```yaml
title: Idempotency
difficulty: intermediate
domains:
  - api-design
  - reliability
prerequisites:
  - http-methods
  - retries
  - database-constraints
related:
  - message-queues
  - distributed-locks
  - payment-systems
```

### Summary

Idempotency means an operation can be safely repeated without changing the final result beyond the first successful execution.

### Mental model

If a client sends the same request five times because of network retries, the system should behave as if the request succeeded once.

### Production example

Payment APIs use idempotency keys to prevent duplicate charges when users retry checkout requests.

---

## 19. MVP roadmap

### Phase 1: Foundation

- Create Next.js app.
- Define content schema.
- Create initial MDX concept template.
- Build concept page renderer.
- Add syntax highlighting.
- Add initial 20 concept pages.

### Phase 2: Graph model

- Add concept metadata parser.
- Build graph edge validation.
- Store concept metadata in Postgres or generated JSON.
- Add prerequisite and related concept sections.
- Build basic graph explorer.

### Phase 3: Learning paths

- Add learning path content type.
- Build path pages.
- Add ordered steps.
- Add user progress tracking.
- Add dashboard.

### Phase 4: Multi-language examples

- Add language tabs.
- Add user preferred language.
- Add examples for Go, TypeScript, Python, C#, and Java.
- Add code example validation.

### Phase 5: Exercises and recommendations

- Add exercise content type.
- Link exercises to concepts.
- Add recommendations.
- Add bookmarks.
- Add search filters.

---

## 20. Initial MVP content list

### Backend fundamentals

- Internet basics
- DNS
- HTTP
- TLS
- JSON
- REST APIs
- request lifecycle
- status codes
- authentication vs authorization

### Databases

- relational databases
- SQL basics
- indexes
- transactions
- isolation levels
- migrations
- connection pooling

### Reliability

- timeouts
- retries
- idempotency
- circuit breakers
- health checks
- graceful shutdown

### Caching and queues

- Redis
- cache-aside
- cache invalidation
- message queues
- dead letter queues
- backoff

### Deployment and observability

- Docker
- environment variables
- CI/CD
- logging
- metrics
- tracing

---

## 21. Success metrics

### Product metrics

- Number of published concepts.
- Number of completed learning path steps.
- Search usage.
- Bookmark usage.
- Returning users.
- Average session length.
- Concept completion rate.

### Content metrics

- Concepts with complete prerequisite metadata.
- Concepts with at least 3 language examples.
- Broken graph links.
- Exercise completion rate.

### Technical metrics

- Page load time.
- Search response time.
- Build validation failures.
- API error rate.

---

## 22. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Content scope becomes too large | High | Start with 50 focused concepts, not everything. |
| Graph becomes confusing | Medium | Provide guided paths alongside free exploration. |
| Multi-language examples take too long | High | Start with Go and TypeScript, then add Python, C#, Java. |
| Visual graph is hard to use | Medium | Always provide list-based prerequisites and related sections. |
| Content becomes shallow | High | Enforce page template and production concerns section. |
| User progress adds complexity | Medium | Keep progress simple in MVP: read, completed, bookmarked. |

---

## 23. Open questions

- Should Graphy be content-first with MDX, or database-first with a CMS?
- Should the MVP include visual graph exploration, or only relationship lists?
- Which languages should be first-class at launch?
- Should users be able to contribute content through GitHub pull requests?
- Should examples be runnable in-browser in a later phase?
- Should Graphy integrate with Replay exercises later?
- Should Graphy support free and paid content tiers?

---

## 24. Recommended MVP decision

Build Graphy as a content-first web app:

- Next.js frontend.
- MDX content files.
- Postgres for users, progress, and bookmarks.
- Generated graph metadata from content frontmatter.
- Public SEO-friendly concept pages.
- Optional Go backend later if graph queries, recommendation logic, or content validation become complex.

The first version should focus on content structure and learning experience, not advanced interactivity.

The core MVP promise:

> Graphy helps backend developers understand what to learn, why it matters, how concepts connect, and how to implement them across languages.
