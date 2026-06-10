# Graphy Engine: High-Level Architecture & Journey Modeling

This document outlines the philosophy, data structures, and algorithms behind the Graphy Knowledge Engine. It serves as a blueprint for transforming complex, multi-dimensional computer science concepts into simplified, highly visual, and guided learning journeys.

---

## The Story: Moving Beyond the "Spiderweb of Doom"

Most visual learning graphs fail because they try to show everything at once. They present the user with a chaotic "spiderweb of doom"—dozens of circular nodes floating in space, connected by intersecting lines that cross over each other. This causes instant cognitive overload. 

Instead of showing users a dry, intimidating network diagram, **Graphy represents knowledge as a Subway System (or Metro Map)**. 

Under the hood, we run a sophisticated mathematical engine that understands every dependency, abstraction layer, and conceptual relation. On the surface, the user only sees a clean, linear track—an **Express Line** to their goal, with optional **Local Stops** branching off for deep dives.

```
 [Express Line]  Bits ═══════════> Hash Functions ═══════════> Bloom Filters ═══════════> Caching
                   │                                             ▲
                   └─> Pointers ──> Memory Layout ───────────────┘
                     [Local Stops / Detours]
```

---

## 1. The Under-the-Hood Model: Directed Acyclic Graph (DAG)

We model backend knowledge as a **Directed Acyclic Graph (DAG)**. 

### Why a DAG?
* **Directed**: Learning has direction. You must understand how binary representation works (`Bits`) before you can understand how a bit array indexes keys (`Bloom Filters`). The edges must have arrows.
* **Acyclic (No Cycles)**: A cycle in a learning graph is a logical deadlock. If Concept A requires Concept B, and Concept B requires Concept A, a student can never start either. The engine uses cycle detection validation to guarantee that prerequisites always flow in a single direction.

### Node Structure (Vertices)
Nodes represent learning modules. Each node is categorized by two key dimensions:
1. **Layer of Abstraction**: Defines how close the topic is to the metal.
   * *Layer 0 (Hardware & Binary)*: Bits, Bytes, CPU cycles.
   * *Layer 1 (Operating Systems & Memory)*: Memory management, Pointers, Disk I/O.
   * *Layer 2 (Data Structures & Algorithms)*: Hashing, Trees, Bloom Filters.
   * *Layer 3 (Distributed Systems)*: Caching, Database Indexes, Message Queues.
2. **Cognitive Weight**: An estimated measure of difficulty and read time.

### Edge Structure (Connections)
Edges are not just lines; they are **semantic relations** that carry context:
* `requires` (Prerequisite): Strict dependency. A cannot be understood without B.
* `builds-on` (Evolution): B is a modern optimization or evolution of A (e.g., *Log-Structured Merge Trees* build on *Append-Only Logs*).
* `used-in` (Application): B uses A inside its implementation. *This is the key to bridging distant domains.* E.g., Bloom Filters are `used-in` Caching Strategies.

Every edge contains a `reason` string explaining the relationship. This reason is shown to the user during path transitions, answering the question: *"Why am I learning this next?"*

---

## 2. The Graph Engine Architecture

The Graph Engine (`graph-engine.ts`) is a fully local, client-side utility written in TypeScript. It is fast, deterministic, and requires no network requests or AI calls. It performs three primary functions:

### Algorithm A: The Course Compiler (Topological Sorting)
When a user selects a destination concept (e.g., *Caching Strategies*), they want a complete, ordered learning path. The compiler runs the following pipeline:

1. **Subgraph Extraction**: It recursively traverses backwards along the `requires` edges from the destination node, collecting all necessary ancestor nodes.
2. **Knowledge Pruning**: It queries `localStorage` for the user's completed concepts and subtracts them from the sub-graph.
3. **Topological Sort (Kahn's Algorithm / DFS)**: It orders the remaining nodes so that all prerequisites appear before the concepts that depend on them.
4. **Layer-Based Modularization**: It groups the sorted sequence into cohesive "Syllabus Modules" based on their Abstraction Layers (e.g., "Module 1: Low-Level Memory" ➔ "Module 2: Key Distribution" ➔ "Module 3: Caching Systems").

### Algorithm B: Bridge Finder (Pathfinding)
If a user asks: *"How does learning about Bits relate to Caching?"*, the engine uses a **Breadth-First Search (BFS)** or **Dijkstra's Algorithm** to find the shortest path of semantic edges connecting the two. It returns a sequence of concepts and their corresponding transition reasons, creating a cohesive story.

---

## 3. The UX Paradigm: The Metro Map

The engine compiles a complex, dynamic graph under the hood, but the frontend simplifies it for the user:

### The Express Line
The core learning path is rendered as a clean, single-track timeline. Nodes are styled based on completion state:
* **Completed**: Highlighted in our signature blood red (`#C0392B`) with a checkmark.
* **Active (Up Next)**: Pulsing rings, floating animations, drawing focus to the next logical step.
* **Upcoming**: Open, clean, fully accessible circles showing difficulty tags.

### Local Detours (Optional Side-Tracks)
Topics that add deep context but aren't strict blockers (e.g., learning about *CPU Cache Lines* while studying *Caching*) branch off the main line. Users can click to expand and explore these branches, or stay on the Express line to reach their system-design goal faster.

### The "Bridge Warning" Alert
If a user navigates directly to an advanced topic (like *Bloom Filters*) without completing its prerequisites, the UI does not block them. Instead, it displays a friendly header alert:

> 💡 **Prerequisite Recommendation**:
> Bloom Filters build on **Bits** and **Hash Functions**. If these are unfamiliar, we recommend a brief detour to get the most out of this chapter:
> `Bits` ➔ `Hash Functions` ➔ **Bloom Filters**

This structure empowers users to bounce between hardware, databases, and APIs based on their interest, while always providing a visible, logical map showing them how to bridge back to their main goals.
