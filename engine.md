# Graphy Engine: Hierarchical Architecture & Scaling Blueprint

This document details the architecture, math, and UX paradigms behind Graphy's local knowledge graph. It outlines the plan to scale the platform to 500+ content items without introducing visual clutter.

---

## 1. Product Distinction: Paths vs. Graph Journey Mode

To build an outstanding learning experience, the UI separates structured progression from custom exploration:

| Metric | Learning Paths (Curated) | Graph Journey Mode (Dynamic) |
|--------|--------------------------|------------------------------|
| **Source** | Curated by domain experts. | Generated in real-time by the Graph Engine. |
| **Use Case** | A pre-packaged, opinionated syllabus designed for a broad domain (e.g. *Database Deep Dive*). | Custom routing to bridge any two arbitrary topics (e.g. *"Show me how Bits relate to Caching"*). |
| **Structure** | Static vertical timelines representing linear modules. | Subway lines divided into transit zones (Chapters) calculated on-the-fly. |
| **Visual representation** | A progressive list checkoff. | Subway Timeline + neighboring Advisory Detours on the graph page. |

---

## 2. Hierarchical DAG Model (Scaling to 500+ Nodes)

A flat knowledge graph with hundreds of nodes creates visual chaos. Graphy uses a **Hierarchical Directed Acyclic Graph (HDAG)** to organize content into nested layers:

```
+---------------------------------------------------------+
| CHAPTER 01: Foundations (chapterId: "foundations")      |
|                                                         |
|   +----------------------------+                        |
|   | CONCEPT GROUP: Binary      |                        |
|   |                            |                        |
|   |  [bits] ➔ [bytes]          |                        |
|   +----------------------------+                        |
+---------------------------------------------------------+
                          │
                          ▼ (Cross-Domain Bridge Edge)
+---------------------------------------------------------+
| CHAPTER 02: Databases (chapterId: "databases")          |
|                                                         |
|   +----------------------------+                        |
|   | CONCEPT GROUP: Relational  |                        |
|   |                            |                        |
|   |  [indexes] ➔ [b-trees]     |                        |
|   +----------------------------+                        |
+---------------------------------------------------------+
```

### The Three Structural Layers:
1. **Chapters (Macro-Level)**: Major computer science domains (e.g. *Foundations*, *APIs*, *Databases*, *Reliability*, *Caching*).
2. **Concept Groups (Meso-Level)**: Sub-categories within a domain (e.g. *Relational Databases* vs. *NoSQL*).
3. **Topics (Micro-Level)**: The specific concept pages containing explanations and code (e.g. *Database Indexes*, *Bloom Filters*).

### Nested Relationships:
* **Topic-to-Topic**: Prerequisites within the same concept group (e.g., `Bits` ➔ `Hash Functions`).
* **Topic-to-Concept**: Dependencies linking a specific lesson to a sub-category.
* **Topic-to-Chapter**: Dependencies linking a topic to a whole domain (e.g. `Circuit Breakers` requires the entire `HTTP & API Design` chapter).
* **Chapter-to-Chapter**: Defining core curriculum tracks (e.g., must master `Foundations` before unlocking `Distributed Systems`).

---

## 3. The 3-Step Implementation Plan

### Step 1: Data Model Expansion
We add parent grouping attributes (`chapterId`) and structural layer tags (`level`) to our schemas:

```typescript
export interface Chapter {
  id: string; // e.g. "databases"
  title: string;
  summary: string;
  prerequisites: string[]; // Parent Chapter dependencies
}

export interface Concept {
  slug: string;
  chapterId: string; // Parent chapter link
  level: "chapter" | "concept" | "topic";
  title: string;
  summary: string;
  prerequisites: string[]; // Can link to topics, groups, or chapters
  // ... rest of fields
}
```
*We will update `concepts.ts` to populate this metadata across all 9 concepts.*

### Step 2: Visual Chapter Clusters
We update the SVG canvas in `src/app/graph/page.tsx`:
* **Bounding Boxes**: Render nodes inside soft rounded shapes representing their Chapter boundaries.
* **Zooming Levels**: Clicking a chapter bounding box zooms the canvas to fit that region, expanding details and dimming outer domains.
* **Mobile Timeline**: Automatically collapses the SVG canvas into collapsible accordion groups sorted by Chapter, optimizing touch interfaces.

### Step 3: Hierarchical Path Compilation (Subway Zones)
We update our pathfinding algorithms:
* **Zone Sorting**: `GraphEngine.compileSyllabus` clusters computed step nodes by their `chapterId`.
* **Subway Dividers**: `SubwayTimeline` renders distinct "Transit Zone" headers between blocks of steps, showing the user exactly when they cross from *Foundations* into *Databases*.
