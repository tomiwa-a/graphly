# Graphy Knowledge Engine: Technical Specification & Graph Architecture

This document describes the technical specifications, mathematical models, and routing algorithms behind the Graphy Knowledge Engine. It outlines the architectural design required to scale the system to 500+ topics while maintaining a clean, responsive, and structured user experience.

---

## 1. Graph Topology: Directed Acyclic Graph (DAG)

Graphy represents backend engineering knowledge as a Directed Acyclic Graph (DAG), defined mathematically as $G = (V, E)$, where $V$ represents the set of vertices (Concept Nodes) and $E$ represents the set of directed edges (Prerequisite Connections).

### Mathematical Properties
* **Asymmetry**: If there is a directed path from node $A$ to node $B$, there cannot be a directed path from node $B$ to node $A$. Learning is sequential; circular dependencies (e.g., $A$ requires $B$, and $B$ requires $A$) create logical deadlocks and are mathematically prohibited.
* **Transitive Reduction**: To keep the visual graph readable, the engine can compute a transitive reduction of the graph, removing redundant prerequisite lines. For instance, if $A \to B \to C$ and a redundant edge $A \to C$ exists, the visual layer hides the direct $A \to C$ connection while the logical layer preserves the dependency.

### Vertex Classifications (V)
Each concept node (vertex) contains structural attributes used by the engine to prioritize and route learning paths:
* **Cognitive Weight (Estimated Reading Time)**: A duration rating in minutes reflecting the density of the content.
* **Complexity Level**: Categorized as Beginner, Intermediate, or Advanced. Used as a coefficient multiplier in cognitive pathfinding.
* **Domain Tag**: Categorizes the node into a specific technical domain (e.g., Databases, Caching, Reliability, Networks).

### Edge Classifications (E)
Edges are typed connections defining how concepts relate to one another:
* **Direct Prerequisites (Requires)**: A strict structural dependency. A user must understand the source node to comprehend the target node.
* **Associated Connections (Related)**: A soft connection indicating semantic affinity or cross-domain application, but not a strict learning blocker.

---

## 2. Hierarchical DAG Model (HDAG) for Scaling

To support 500+ topics without overloading the interface, Graphy organizes the flat graph into a Hierarchical Directed Acyclic Graph (HDAG). This organizes data into three distinct zoomable layers:

### The Three Structural Layers:
1. **Chapters (Macro-Level)**: Large buckets representing core computer science domains (e.g., Foundations, Network Protocols, Caching, Reliability, Queues). Chapters are linked by macro-level prerequisite edges (e.g., the *Foundations* chapter must be completed to unlock the *Databases* chapter).
2. **Concept Groups (Meso-Level)**: Sub-categories grouping related paradigms within a chapter (e.g., *Relational Databases* vs. *NoSQL Databases* inside the Databases chapter).
3. **Topics (Micro-Level)**: The individual concept pages containing code examples and guides (e.g., *B-Trees*, *Database Indexes*, *Bloom Filters*).

### Cross-Layer Traversal
The engine supports prerequisite connections that span across different levels:
* **Topic-to-Topic**: Prerequisites within the same concept group (e.g., `Bits` ➔ `Hash Functions`).
* **Topic-to-Concept**: A topic that requires understanding an entire sub-category (e.g., `Bloom Filters` requires the general concept of `Hash Functions`).
* **Topic-to-Chapter**: A topic that requires understanding an entire macro domain (e.g., learning `Circuit Breakers` requires understanding the entire `HTTP & API Design` chapter).

---

## 3. Path Routing & Sorting Algorithms

The Graph Engine compiles learning paths dynamically using local algorithms:

### BFS Pathfinder (Shortest Hops)
To find the transition path between a starting concept and a target concept, the engine uses a Breadth-First Search (BFS) algorithm. BFS traverses the graph level by level, guaranteeing that the path returned contains the minimum number of edge hops. This is used when the user wants a direct connection between two concepts.

### Dijkstra Pathfinder (Least Cognitive Resistance)
For advanced learning recommendations, the engine uses Dijkstra's Algorithm. Instead of counting hops, it minimizes the sum of **Cognitive Resistance Scores** along the path. 

Cognitive Resistance is calculated by adding the connection cost of the edge type to the cognitive cost of the node (its estimated reading time multiplied by its difficulty coefficient). This ensures the path compiled steers the user away from steep difficulty spikes, routing them through a smoother sequence of topics.

### Topological Sorting (Syllabus Compilation)
When compiling a dynamic learning syllabus, the engine gathers all transitive prerequisites of the target concept, filters out the user's completed items, and runs a topological sort (using Kahn's Algorithm or DFS post-order traversal). 

This sorts the topics in a linear sequence such that for every directed edge $u \to v$ in the syllabus, $u$ (prerequisite) always comes before $v$ (dependent) in the timeline.

---

## 4. Visual Layout & UX Paradigms

The Graphy UI translates the complex underlying graph structures into clean, interactive designs:

### The Subway Map Model
Dynamic paths are linearized and rendered as a subway timeline. Completed stops are colored in the signature blood-red accent and marked with checkmarks. The next available step glows and pulses, drawing focus, while upcoming stops remain locked or muted. Transition boxes are rendered between stops, explaining the connection reason.

### Zoomable Chapter Bounding Boxes
On desktop screens, the SVG graph view groups concept nodes visually inside rounded bounding shapes representing their parent Chapters. Double-clicking a Chapter zooms the viewport to fit that bounding box, expanding its internal concept groups and topics while dimming adjacent chapters.

### Mobile Metro-Line Stack
On mobile screens, the large SVG canvas is replaced by a vertical "Subway Directory" stack. The engine groups topics into collapsible accordions sorted by Chapter, optimizing touch targets and preventing visual pan/zoom issues on small screens.
