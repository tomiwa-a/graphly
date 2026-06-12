---
title: SQL Query Optimizers
slug: sql-query-optimizers
summary: "Understand how SQL query optimizers parse declarations, apply algebraic transformations, estimate executing costs, and build physical query plans."
difficulty: advanced
chapterId: databases
domain: Databases
estimatedMinutes: 15
prerequisites: [indexes, b-plus-trees]
related: [acid-transactions-isolation]
seo_title: "SQL Query Optimizers: Relational Algebra and Cost Optimization | Graphly"
seo_description: "Explore the internal mechanics of SQL query optimizers. Learn about logical plans, rule-based transforms, cost estimation, and physical join algorithms."
canonical_url: "/concepts/sql-query-optimizers"
citations:
  - title: "Access Path Selection in a Relational Database Management System"
    author: "Patricia G. Selinger, Morton M. Astrahan, Donald D. Chamberlin, Raymond A. Lorie, and Thomas G. Price"
    chapter: "Proceedings of the 1979 ACM SIGMOD International Conference on Management of Data"
    page_range: "23-34"
    external_link: "https://dl.acm.org/doi/10.1145/582095.582099"
  - title: "The Volcano Optimizer Generator: Extensibility and Efficient Search"
    author: "Goetz Graefe"
    chapter: "IEEE International Conference on Data Engineering"
    page_range: "341-350"
    external_link: "https://ieeexplore.ieee.org/document/246904"
code_examples:
  - language: python
    title: Cost-Based Hash Join vs Nested Loop Selector and Predicate Pushdown Transformer
    code: |
      class TableScan:
          def __init__(self, name: str, rows: int):
              self.name = name
              self.rows = rows
              self.predicate = None  # Pushed down filter condition

          def __repr__(self):
              pred_str = f" WHERE {self.predicate}" if self.predicate else ""
              return f"Scan({self.name}{pred_str}, estimated_rows={self.rows})"

      class JoinNode:
          def __init__(self, left, right, on_col: str):
              self.left = left
              self.right = right
              self.on_col = on_col
              self.physical_strategy = None  # "HashJoin" or "NestedLoop"

          def __repr__(self):
              strategy = f" [{self.physical_strategy}]" if self.physical_strategy else ""
              return f"Join{strategy}({self.left} ⋈ {self.right} ON {self.on_col})"

      class FilterNode:
          def __init__(self, child, col: str, val: str):
              self.child = child
              self.col = col
              self.val = val

          def __repr__(self):
              return f"Filter({self.col}='{self.val}', child={self.child})"

      class QueryOptimizer:
          """Simulates Rule-Based (RBO) and Cost-Based (CBO) query optimization steps."""

          @staticmethod
          def apply_predicate_pushdown(node):
              """Rule-Based Optimization: Pushes filter nodes down to the table scans."""
              if isinstance(node, FilterNode):
                  child = node.child
                  if isinstance(child, TableScan):
                      # Push the filter directly into the TableScan
                      child.predicate = f"{node.col}='{node.val}'"
                      # Reduce estimated rows because of selectivity
                      child.rows = int(child.rows * 0.1)  # Assume 10% selectivity
                      return child
                  
                  elif isinstance(child, JoinNode):
                      # Check if the filter applies to the left or right side of the join
                      # For simplicity, we assume we map columns to tables by prefixing: e.g., 'users.id'
                      table_prefix = node.col.split('.')[0]
                      
                      # Recursively push to corresponding side of join
                      if isinstance(child.left, TableScan) and child.left.name == table_prefix:
                          child.left = FilterNode(child.left, node.col, node.val)
                          child.left = QueryOptimizer.apply_predicate_pushdown(child.left)
                      elif isinstance(child.right, TableScan) and child.right.name == table_prefix:
                          child.right = FilterNode(child.right, node.col, node.val)
                          child.right = QueryOptimizer.apply_predicate_pushdown(child.right)
                      
                      return child
              return node

          @staticmethod
          def choose_physical_plan(node) -> int:
              """Cost-Based Optimization: Evaluates the cheapest physical join algorithm."""
              if isinstance(node, JoinNode):
                  # Calculate children's rows first
                  left_rows = node.left.rows if hasattr(node.left, 'rows') else 1000
                  right_rows = node.right.rows if hasattr(node.right, 'rows') else 1000

                  # Estimate Join Strategy Costs
                  # Nested Loop Cost: O(N * M)
                  nested_loop_cost = left_rows * right_rows
                  
                  # Hash Join Cost: Build Hash Table + Probe: O(N + M)
                  hash_join_cost = left_rows + right_rows + 500  # 500 is hash table setup constant

                  if hash_join_cost < nested_loop_cost:
                      node.physical_strategy = "HashJoin"
                      cost = hash_join_cost
                  else:
                      node.physical_strategy = "NestedLoop"
                      cost = nested_loop_cost

                  return cost
              return 0

      # Demonstration
      if __name__ == "__main__":
          # 1. Setup Logical query plan matching:
          # SELECT * FROM users JOIN orders ON users.id = orders.user_id WHERE users.country = 'US'
          # Represented as FilterNode(JoinNode(TableScan(users), TableScan(orders)))
          users_table = TableScan("users", rows=100000)
          orders_table = TableScan("orders", rows=50000)
          join_op = JoinNode(users_table, orders_table, on_col="users.id=orders.user_id")
          logical_plan = FilterNode(join_op, col="users.country", val="US")

          print("--- Unoptimized Logical Plan ---")
          print(logical_plan)

          # 2. Apply Rule-Based Optimization (RBO): Predicate Pushdown
          print("\n--- Applying Predicate Pushdown (RBO) ---")
          optimized_plan = QueryOptimizer.apply_predicate_pushdown(logical_plan)
          print(optimized_plan)

          # 3. Apply Cost-Based Optimization (CBO): Select Physical Join Algorithm
          print("\n--- Evaluating Physical Join Cost (CBO) ---")
          cost = QueryOptimizer.choose_physical_plan(optimized_plan)
          print(optimized_plan)
          print(f"Chosen plan cost estimate score: {cost}")
---

## The Concept

SQL is a declarative language: you write **what** data you want to retrieve (`SELECT * FROM users WHERE active = true`), not **how** to access it. Under the hood, the database must convert this declaration into a procedural sequence of execution steps.

The database component responsible for determining the execution pathway is the **SQL Query Optimizer**. 

If a query contains joins, filters, and projections, there are thousands of valid execution paths. The difference in execution speed between a naive, unoptimized plan and an optimized one can be the difference between a query taking 10 milliseconds or running for 10 hours. The query optimizer evaluates these alternatives to construct the most efficient physical execution plan.

---

## The Query Compilation Workflow

Before executing a query, the SQL engine passes it through several distinct compiler and optimizer stages:

<svg viewBox="0 0 580 340" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="22" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">SQL Query Compilation and Optimization Flow</text>
  <rect x="190" y="40" width="200" height="25" rx="3" fill="#3b4252" stroke="#88c0d0" stroke-width="1.5"/>
  <text x="290" y="56" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">Raw SQL Query</text>
  <path d="M 290 65 L 290 90" stroke="#88c0d0" stroke-width="1.5" fill="none" marker-end="url(#ar5)"/>
  <rect x="190" y="90" width="200" height="25" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="290" y="106" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">1. Parser &amp; Abstract Syntax Tree (AST)</text>
  <path d="M 290 115 L 290 140" stroke="#88c0d0" stroke-width="1.5" fill="none" marker-end="url(#ar5)"/>
  <rect x="190" y="140" width="200" height="30" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="290" y="153" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">2. Logical Query Plan</text>
  <text x="290" y="165" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">(Relational Algebra representation)</text>
  <path d="M 290 170 L 290 195" stroke="#88c0d0" stroke-width="1.5" fill="none" marker-end="url(#ar5)"/>
  <rect x="190" y="195" width="200" height="30" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="290" y="208" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">3. Rule-Based Optimization (RBO)</text>
  <text x="290" y="220" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">(Algebraic rewrites / Predicate pushdown)</text>
  <path d="M 290 225 L 290 250" stroke="#88c0d0" stroke-width="1.5" fill="none" marker-end="url(#ar5)"/>
  <rect x="190" y="250" width="200" height="30" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="290" y="263" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">4. Cost-Based Optimization (CBO)</text>
  <text x="290" y="275" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">(Selectivity estimation via statistics)</text>
  <rect x="405" y="247" width="130" height="35" rx="3" fill="#2e3440" stroke="#ebcb8b" stroke-width="1.5"/>
  <text x="470" y="260" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">Database Catalog</text>
  <text x="470" y="272" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">(Table sizes &amp; Histograms)</text>
  <path d="M 405 265 L 390 265" stroke="#ebcb8b" stroke-width="1.5" fill="none" marker-end="url(#ar5)"/>
  <path d="M 290 280 L 290 305" stroke="#a3be8c" stroke-width="2" fill="none" marker-end="url(#ar5)"/>
  <rect x="190" y="305" width="200" height="25" rx="3" fill="#2e3440" stroke="#a3be8c" stroke-width="2"/>
  <text x="290" y="321" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">5. Executable Physical Plan</text>
  <defs>
    <marker id="ar5" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#88c0d0"/>
    </marker>
  </defs>
</svg>

### 1. Parsing and Semantic Checking
The database parses the raw SQL text, checking syntax rules and compiling it into an **Abstract Syntax Tree (AST)**. The engine then performs semantic validation checks: verifying that the target tables and columns exist, and confirming the user has read permissions.

### 2. Logical Query Plan Formulation
The parser converts the AST into a **Logical Query Plan**. A logical plan represents the query as a tree of mathematical operations using **Relational Algebra**:
* **Selection (&sigma;)**: Filters rows matching specific conditions (similar to SQL `WHERE`).
* **Projection (&pi;)**: Retains only specified columns, discarding the rest (similar to SQL `SELECT name, email`).
* **Join (&bowtie;)**: Merges records from two relation sources on a matching attribute.

### 3. Rule-Based Optimization (RBO)
The engine applies a series of heuristics (rules) to rewrite the logical plan into a more efficient form:
* **Predicate Pushdown**: Moves filters down the plan tree to execute them before joins. This reduces the number of rows that must be processed during the expensive join stage.
* **Projection Pruning**: Discards unused columns early in the plan tree, saving memory and processing time.

### 4. Cost-Based Optimization (CBO)
After applying rules, the optimizer converts the logical plan into a **Physical Query Plan**. A physical plan replaces relational algebra operations with concrete database algorithms (e.g. replacing a generic logical join with a physical Hash Join or Nested Loop Join).

Because there are many physical plan alternatives, the optimizer estimates the resource cost (CPU cycles and disk access seeks) of each plan. The optimizer uses database statistics to determine this cost, choosing the plan with the lowest score.

---

## Cost-Based Estimations and Statistics

To calculate costs, the optimizer retrieves statistics from the **database catalog**:
* **Row Cardinality**: The total row count in each table.
* **Selectivity Ratio**: The fraction of rows expected to pass a filter condition. For example, filtering by a unique primary key has a selectivity of `1/N`, whereas filtering by a boolean state might have a selectivity of `0.5`.
* **Histograms**: Databases divide column value ranges into buckets to track value distribution details. This enables accurate selectivity estimates on non-uniform data (e.g. calculating how many users are aged between 20 and 30).

If the catalog statistics are stale, the optimizer might construct an inefficient physical plan (e.g., choosing a full table scan because it incorrectly estimates a table contains only 10 rows). To prevent this, databases run periodic background analyzer routines (like PostgreSQL's `ANALYZE` command) to refresh statistics.

---

## Physical Join Algorithms

The optimizer chooses specific algorithms to execute joins, matching the selected strategy to the dataset size and indexing details:

### Nested Loop Join
For every row in the outer table, the engine scans the inner table to find matches.
* **Complexity**: `O(N * M)`
* **Use Case**: Efficient when the outer table is small, or when the join column in the inner table has a B+ Tree index, permitting fast index seeks instead of full table scans.

### Hash Join
The engine reads the smaller table, builds a temporary hash map in RAM, and scans the larger table to find matches in the hash table.
* **Complexity**: `O(N + M)`
* **Use Case**: The standard strategy for joining large, unindexed tables. It requires enough RAM to hold the temporary hash table. If the tables are too large to fit in memory, the engine uses a **Grace Hash Join**, partitioning the tables to disk.

### Sort-Merge Join
The engine sorts both tables by the join column, then traverses them in parallel to merge matches.
* **Complexity**: `O(N log N + M log M)`
* **Use Case**: Efficient when the tables are already sorted on the join column (e.g. by a index). If sorting must be done on the fly, it is slower than a Hash Join.

---

## Search Frameworks: System R vs Volcano

To evaluate candidate plans, optimizers use specific search frameworks:
* **System R (Dynamic Programming)**: Evaluates plans bottom-up, pruning inefficient sub-trees early to reduce search space. It excels at finding efficient join orderings for small numbers of tables but scales poorly when queries contain dozens of joins.
* **Volcano/Cascades**: A top-down search framework using object-oriented rule matching and memoization. It models optimization rules as pluggable transformations, allowing developers to extend the optimizer with custom rules.

---

## Verifying Plans with EXPLAIN

To understand the optimization decisions made by a database, prefix your query with `EXPLAIN` (or `EXPLAIN ANALYZE` to execute the query and measure runtime performance):

```sql
EXPLAIN ANALYZE 
SELECT users.name, orders.id 
FROM users 
JOIN orders ON users.id = orders.user_id 
WHERE users.active = true;
```

Reading the output reveals the selected physical strategies, estimated row counts, index lookups, and the actual execution times.

---

## Further Reading

* [Access Path Selection in a Relational Database Management System](https://dl.acm.org/doi/10.1145/582095.582099) — The seminal System R optimizer paper by Patricia Selinger.
* [The Volcano Optimizer Generator Paper](https://ieeexplore.ieee.org/document/246904) — Goetz Graefe's framework design for extensible query optimization.
* [PostgreSQL Query Plan Visualization](https://www.postgresql.org/docs/current/using-explain.html) — Official documentation explaining how to read and interpret PostgreSQL EXPLAIN plans.
