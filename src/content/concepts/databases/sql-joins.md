---
title: SQL Joins & Performance
slug: sql-joins
summary: "Explore the mathematical and physical execution layers of SQL joins, including nested loop, hash, and sort-merge strategies, and how to optimize join performance."
difficulty: beginner
chapterId: databases
domain: Databases
estimatedMinutes: 10
prerequisites: [indexes]
related: [database-normalization, database-index-types]
seo_title: "SQL Joins and Performance: Nested Loop, Hash, and Sort-Merge Joins"
seo_description: "Learn how databases execute joins. Understand logical relational algebra, physical join algorithms (nested loop, hash, sort-merge), index lookup optimizations, and query planner joins."
canonical_url: "/concepts/sql-joins"
citations:
  - title: "Join Processing in Relational Databases"
    author: "Dmitry Mishkin, et al."
    chapter: "ACM Computing Surveys"
    page_range: "1-36"
    external_link: "https://dl.acm.org/journals/surveys"
  - title: "Query Evaluation Techniques for Large Databases"
    author: "Goetz Graefe"
    chapter: "ACM Computing Surveys, Vol. 25, No. 2"
    page_range: "73-169"
    external_link: "https://dl.acm.org/doi/10.1145/152610.152611"
code_examples:
  - language: python
    title: "Naive Nested Loop Join vs Hash Join Execution Simulation"
    code: |
      import time

      # Tables represented as lists of dictionaries
      users = [{"id": i, "name": f"User_{i}", "city_id": i % 100} for i in range(10000)]
      cities = [{"id": i, "name": f"City_{i}"} for i in range(1000)]

      def naive_nested_loop_join(outer_table, inner_table, outer_key, inner_key):
          """
          Simulates a Nested Loop Join.
          Compares every row in outer_table with every row in inner_table.
          Complexity: O(N * M)
          """
          result = []
          comparison_count = 0
          for row_a in outer_table:
              for row_b in inner_table:
                  comparison_count += 1
                  if row_a[outer_key] == row_b[inner_key]:
                      joined_row = {**row_a, **row_b, "id": row_a["id"]}
                      result.append(joined_row)
          return result, comparison_count

      def hash_join(build_table, probe_table, build_key, probe_key):
          """
          Simulates a Hash Join.
          1. Builds an in-memory hash table of the smaller relation (build phase).
          2. Iterates through the larger relation, probing the hash table (probe phase).
          Complexity: O(N + M)
          """
          result = []
          comparison_count = 0
          
          # 1. BUILD PHASE (Build hash map on the smaller table)
          hash_table = {}
          for row in build_table:
              key_val = row[build_key]
              if key_val not in hash_table:
                  hash_table[key_val] = []
              hash_table[key_val].append(row)
          
          # 2. PROBE PHASE (Probe hash map using the larger table)
          for row_b in probe_table:
              key_val = row_b[probe_key]
              comparison_count += 1 # Single hash bucket lookup
              if key_val in hash_table:
                  for row_a in hash_table[key_val]:
                      joined_row = {**row_a, **row_b, "id": row_a["id"]}
                      result.append(joined_row)
                      
          return result, comparison_count

      if __name__ == "__main__":
          print(f"Joining {len(users)} users with {len(cities)} cities...\n")

          # Benchmark Nested Loop Join
          start = time.time()
          n_result, n_compares = naive_nested_loop_join(users, cities, "city_id", "id")
          n_duration = time.time() - start
          print("--- Nested Loop Join ---")
          print(f"Results matched: {len(n_result)}")
          print(f"Total comparisons: {n_compares:,} (Matches N * M)")
          print(f"Duration: {n_duration:.4f} seconds\n")

          # Benchmark Hash Join
          start = time.time()
          # We use cities as the build table because it is smaller
          h_result, h_compares = hash_join(cities, users, "id", "city_id")
          h_duration = time.time() - start
          print("--- Hash Join ---")
          print(f"Results matched: {len(h_result)}")
          print(f"Total comparisons: {h_compares:,} (Matches N + M)")
          print(f"Duration: {h_duration:.4f} seconds")
---

## The Problem: Connecting Isolated Relations

In a normalized relational database, related entities are isolated into separate tables to prevent redundancy and maintain consistency. For example, a customer's personal details are stored in a `users` table, while their transactions are stored in an `orders` table. 

However, to answer business queries (such as "Retrieve all orders placed by customers living in New York"), the database engine must reconnect these tables at query time. This operation is called a **join**. 

Because tables can contain millions of rows, joining them requires the database engine to compare key fields across files. Naive comparisons can crash a server. Backend engineers must understand how database query planners choose physical algorithms to execute joins, and how indexes speed up these operations.

---

## Logical Joins in Relational Algebra

At the logical layer, SQL queries are mapped to relational algebra operators. The type of join determines how the database handles unmatched records:

* **Inner Join**: Returns only the rows where the join keys match in both tables. Unmatched rows are discarded.
* **Left Outer Join**: Returns all rows from the left table, plus matching rows from the right table. If there is no match, the columns from the right table are filled with `NULL`.
* **Right Outer Join**: Returns all rows from the right table, plus matching rows from the left table. If there is no match, the left table's columns are filled with `NULL`.
* **Full Outer Join**: Returns all rows from both tables, filling in `NULL` values for missing matches on either side.
* **Cross Join (Cartesian Product)**: Combines every row of the first table with every row of the second table, creating a result set of size $N \times M$ rows.
* **Self Join**: A table joined with itself, which is useful for querying hierarchical relationships (such as an `employees` table containing a `manager_id` pointing back to the same table's primary key).

---

## Physical Join Execution Algorithms

When executing a logical join, the database query optimizer translates it into a physical algorithm based on table sizes, memory limits, and indexes:

<svg viewBox="0 0 580 260" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="20" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Physical Join Execution: Nested Loop vs Hash Join</text>
  <rect x="15" y="45" width="260" height="190" rx="6" fill="#2e3440" stroke="#bf616a" stroke-width="1.5"/>
  <text x="145" y="65" fill="#eceff4" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Nested Loop Join (Naive)</text>
  <rect x="30" y="85" width="70" height="90" rx="3" fill="#3b4252" stroke="#88c0d0" stroke-width="1"/>
  <text x="65" y="100" fill="#88c0d0" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">Outer Table A</text>
  <rect x="35" y="110" width="60" height="15" rx="2" fill="#88c0d0" opacity="0.3"/>
  <text x="65" y="121" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">Row 1</text>
  <rect x="35" y="130" width="60" height="15" rx="2" fill="#2e3440"/>
  <text x="65" y="141" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Row 2</text>
  <rect x="35" y="150" width="60" height="15" rx="2" fill="#2e3440"/>
  <text x="65" y="161" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Row 3</text>
  <rect x="180" y="85" width="70" height="90" rx="3" fill="#3b4252" stroke="#ebcb8b" stroke-width="1"/>
  <text x="215" y="100" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">Inner Table B</text>
  <rect x="185" y="110" width="60" height="12" rx="1" fill="#bf616a" opacity="0.2"/>
  <text x="215" y="119" fill="#eceff4" font-family="sans-serif" font-size="7" text-anchor="middle">Scan 1</text>
  <rect x="185" y="125" width="60" height="12" rx="1" fill="#bf616a" opacity="0.2"/>
  <text x="215" y="134" fill="#eceff4" font-family="sans-serif" font-size="7" text-anchor="middle">Scan 2</text>
  <rect x="185" y="140" width="60" height="12" rx="1" fill="#bf616a" opacity="0.2"/>
  <text x="215" y="149" fill="#eceff4" font-family="sans-serif" font-size="7" text-anchor="middle">Scan 3</text>
  <rect x="185" y="155" width="60" height="12" rx="1" fill="#bf616a" opacity="0.2"/>
  <text x="215" y="164" fill="#eceff4" font-family="sans-serif" font-size="7" text-anchor="middle">Scan 4</text>
  <path d="M 100 118 L 172 118" stroke="#bf616a" stroke-width="1.5" stroke-dasharray="2,2" fill="none" marker-end="url(#arjn)"/>
  <text x="140" y="113" fill="#bf616a" font-family="sans-serif" font-size="8" text-anchor="middle">Scan entire B</text>
  <text x="140" y="215" fill="#bf616a" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Complexity: O(N * M)</text>
  <rect x="305" y="45" width="260" height="190" rx="6" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="435" y="65" fill="#eceff4" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Hash Join</text>
  <rect x="315" y="85" width="80" height="60" rx="3" fill="#3b4252" stroke="#88c0d0" stroke-width="1"/>
  <text x="355" y="97" fill="#88c0d0" font-family="sans-serif" font-size="8" text-anchor="middle" font-weight="bold">1. Build Hash Table</text>
  <text x="355" y="112" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">Table A key → hash</text>
  <rect x="325" y="122" width="60" height="15" rx="2" fill="#2e3440" stroke="#a3be8c" stroke-width="1"/>
  <text x="355" y="132" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">RAM Hash Map</text>
  <rect x="475" y="85" width="80" height="60" rx="3" fill="#3b4252" stroke="#ebcb8b" stroke-width="1"/>
  <text x="515" y="97" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle" font-weight="bold">2. Probe (Table B)</text>
  <text x="515" y="112" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">Hash Table B key</text>
  <text x="515" y="125" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">Look up in RAM</text>
  <path d="M 475 130 L 405 130" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#arjn)"/>
  <text x="440" y="122" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">O(1) seek</text>
  <text x="435" y="215" fill="#a3be8c" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Complexity: O(N + M)</text>
  <defs>
    <marker id="arjn" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#bf616a"/>
    </marker>
  </defs>
</svg>

### 1. Nested Loop Join
The database loops through each row of the outer table, and for each row, scans the entire inner table to find matches.
* **Complexity**: $O(N \times M)$
* **Trade-off**: Highly inefficient for large datasets. However, if the inner table has a B+ Tree index on the join column, the scan is replaced by an **Index Nested Loop Join**, turning the inner search into a fast $O(\log M)$ tree seek.

### 2. Hash Join
The database reads the smaller table and builds an in-memory hash table of the join keys. It then scans the larger table, hashes each join key, and probes the hash table for matches.
* **Complexity**: $O(N + M)$
* **Trade-off**: The standard strategy for large, unindexed tables. It requires enough memory to hold the build table's hash map. If the map exceeds memory limits, the engine must split partitions to disk (a process known as disk spilling or Grace Hash Join), which slows down execution due to disk I/O.

### 3. Sort-Merge Join
The database sorts both tables by their join keys, then scans both sorted inputs in a single parallel pass to merge matching values.
* **Complexity**: $O(N \log N + M \log M)$
* **Trade-off**: If sorting must be done on the fly, it is slower than a Hash Join. However, if the tables are already sorted (for example, if they are indexed on the join columns), the sort step is skipped. The merge phase runs in $O(N + M)$ time, making it highly efficient.

---

## Indexing and Join Optimization

The query optimizer uses database statistics and indexes to determine the execution plan:

* **Outer vs Inner Table Selection**: In a nested loop, the optimizer assigns the smaller table as the outer loop. This is because the outer loop determines how many times the database must scan or seek the inner table.
* **Index Seeks**: An index on the inner table's join column allows the optimizer to replace expensive table scans with fast B-Tree lookups. For instance, when joining `orders` and `users` on `user_id`, an index on `users(id)` allows the database to read an order, jump directly to the user record in the B-Tree index, and merge the data instantly.
* **Join Order Optimization**: When queries join three or more tables, the query planner uses search algorithms (such as dynamic programming or greedy search heuristics) to calculate the cheapest order of operations. Joining tables in the wrong order can generate massive intermediate tables, stalling execution.

---

## Subquery to Join Rewrites

Engineers often write queries using nested subqueries (e.g. `SELECT * FROM users WHERE id IN (SELECT user_id FROM orders)`). Modern query optimizers analyze these statements and rewrite **correlated subqueries** into joins under the hood. 

This process, called query flattening, allows the optimizer to choose efficient physical algorithms like Hash Joins or Index Nested Loops rather than running the subquery once for every single row in the outer table.

---

## Further Reading

* [Query Evaluation Techniques for Large Databases](https://dl.acm.org/doi/10.1145/152610.152611) — Goetz Graefe's classic survey of physical query execution algorithms, including join processing.
* [How Postgres Chooses Join Types](https://www.postgresql.org/docs/current/planner-optimizer.html) — Official PostgreSQL documentation on query planning and physical joins.
* [Architecture of a Database System](https://nowpublishers.com/article/Details/DBS-002) — Hellerstein, Stonebraker, and Hamilton's foundational paper on relational engine query loops and execution environments.
