# Future Graph Engine Logic Upgrades

Here is the archive of future architectural improvements for the Graphy routing and validation engine:

## 1. Robust Routing Algorithms
* **Goal**: Upgrade the current BFS shortest-path solver to **Dijkstra's Algorithm** or **A* Search**.
* **Use Case**: Enable advanced path filters, such as:
  * *"Find the easiest path to Caching Strategies"* (preferring beginner/intermediate nodes).
  * *"Find a path that minimizes time read"* (using `estimatedMinutes` as edge weights).
  * *"Find a path that only stays within selected domains"*.

## 2. Cycle Validation CLI
* **Goal**: Build an automated validation script (`npm run validate-graph`) to audit graph relationships.
* **Use Case**: As the catalog scales to 500+ topics with complex multi-prerequisite relationships, it is very easy to introduce a circular dependency (e.g., A requires B, B requires C, C requires A), which causes infinite loops or crashes the topological sorter.
* **Requirements**:
  * Execute validation during prebuild (`npm run build`).
  * Run depth-first search (DFS) with backtracking to detect cycles and print clear error routes indicating the offending cycle nodes.

## 3. Sub-Graph Tree Compiler
* **Goal**: Instead of routing a simple linear subway line path, compile a full tree of prerequisites for a topic.
* **Use Case**: Allow a student to view their total structural learning surface area, grouping dependencies into parallel branches rather than flattening them into a single track.
