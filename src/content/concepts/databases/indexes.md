---
title: Database Indexes
slug: indexes
summary: "How indexes speed up database queries and the storage and write-performance tradeoffs they introduce."
difficulty: intermediate
chapterId: databases
domain: Databases
estimatedMinutes: 12
prerequisites: [http]
related: [caching-strategies, lsm-trees]
seo_title: "Database Indexes: B-Trees, Query Performance, and Tradeoffs"
seo_description: "Learn how database indexes work under the hood: B-trees, composite indexes, query planning, and the read/write performance tradeoffs every backend engineer must understand."
canonical_url: "/concepts/indexes"
code_examples:
  - language: SQL
    title: Creating indexes
    code: |
      -- Single-column index on a frequently queried field
      CREATE INDEX idx_users_email ON users (email);

      -- Composite index: supports filtering by user_id alone,
      -- or user_id + created_at together (left-prefix rule)
      CREATE INDEX idx_orders_user_date
        ON orders (user_id, created_at DESC);

      -- Partial index: only indexes pending orders (much smaller)
      CREATE INDEX idx_orders_pending
        ON orders (created_at)
        WHERE status = 'pending';

      -- Check whether your query actually uses the index
      EXPLAIN ANALYZE
        SELECT * FROM users WHERE email = 'alice@example.com';
---

## The Problem: Full Table Scans

Imagine a `users` table with 50 million rows. You run `SELECT * FROM users WHERE email = 'alice@example.com'`. Without an index, the database has no choice: it reads **every single row**, top to bottom, comparing the email column until it finds a match. This is called a **full table scan**.

On small tables this is fine. On anything production-scale, it is catastrophic. A query that should take 2ms ends up taking 8 seconds and locks up your entire API.

An index gives the database a shortcut: a pre-sorted lookup structure it can use to jump directly to the right rows, the same way you use the index at the back of a textbook.

---

## How an Index Works

When you create an index on a column, the database builds a **separate data structure** that stores the indexed column values in sorted order, with each entry pointing back to the physical row location on disk.

<svg viewBox="0 0 640 280" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <!-- Users Table -->
  <text x="30" y="26" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold">users table (unsorted)</text>
  <rect x="20" y="36" width="200" height="30" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="30" y="55" fill="#81a1c1" font-family="sans-serif" font-size="10" font-weight="bold">id</text>
  <text x="80" y="55" fill="#81a1c1" font-family="sans-serif" font-size="10" font-weight="bold">email</text>
  <text x="170" y="55" fill="#81a1c1" font-family="sans-serif" font-size="10" font-weight="bold">row</text>
  <rect x="20" y="66" width="200" height="26" rx="0" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="30" y="83" fill="#d8dee9" font-family="sans-serif" font-size="10">1</text>
  <text x="80" y="83" fill="#d8dee9" font-family="sans-serif" font-size="10">charlie@…</text>
  <text x="170" y="83" fill="#a3be8c" font-family="sans-serif" font-size="10">#1</text>
  <rect x="20" y="92" width="200" height="26" rx="0" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="30" y="109" fill="#d8dee9" font-family="sans-serif" font-size="10">2</text>
  <text x="80" y="109" fill="#d8dee9" font-family="sans-serif" font-size="10">alice@…</text>
  <text x="170" y="109" fill="#a3be8c" font-family="sans-serif" font-size="10">#2</text>
  <rect x="20" y="118" width="200" height="26" rx="0" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="30" y="135" fill="#d8dee9" font-family="sans-serif" font-size="10">3</text>
  <text x="80" y="135" fill="#d8dee9" font-family="sans-serif" font-size="10">bob@…</text>
  <text x="170" y="135" fill="#a3be8c" font-family="sans-serif" font-size="10">#3</text>
  <rect x="20" y="144" width="200" height="26" rx="0" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="30" y="161" fill="#d8dee9" font-family="sans-serif" font-size="10">4</text>
  <text x="80" y="161" fill="#d8dee9" font-family="sans-serif" font-size="10">diana@…</text>
  <text x="170" y="161" fill="#a3be8c" font-family="sans-serif" font-size="10">#4</text>
  <!-- Scan label -->
  <text x="20" y="200" fill="#bf616a" font-family="sans-serif" font-size="10">Without index: scan all 4 rows</text>
  <!-- Arrow -->
  <path d="M 240 130 L 310 130" stroke="#88c0d0" stroke-width="2" fill="none" marker-end="url(#arrow)"/>
  <text x="248" y="122" fill="#88c0d0" font-family="sans-serif" font-size="10">index on</text>
  <text x="248" y="134" fill="#88c0d0" font-family="sans-serif" font-size="10">email →</text>
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#88c0d0"/>
    </marker>
  </defs>
  <!-- Index structure -->
  <text x="320" y="26" fill="#a3be8c" font-family="sans-serif" font-size="12" font-weight="bold">email index (sorted)</text>
  <rect x="310" y="36" width="200" height="30" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="320" y="55" fill="#81a1c1" font-family="sans-serif" font-size="10" font-weight="bold">email (sorted)</text>
  <text x="460" y="55" fill="#81a1c1" font-family="sans-serif" font-size="10" font-weight="bold">→ row</text>
  <rect x="310" y="66" width="200" height="26" rx="0" fill="#2e3440" stroke="#a3be8c" stroke-width="1"/>
  <text x="320" y="83" fill="#d8dee9" font-family="sans-serif" font-size="10">alice@…</text>
  <text x="460" y="83" fill="#a3be8c" font-family="sans-serif" font-size="10">#2</text>
  <rect x="310" y="92" width="200" height="26" rx="0" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="320" y="109" fill="#d8dee9" font-family="sans-serif" font-size="10">bob@…</text>
  <text x="460" y="109" fill="#a3be8c" font-family="sans-serif" font-size="10">#3</text>
  <rect x="310" y="118" width="200" height="26" rx="0" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="320" y="135" fill="#d8dee9" font-family="sans-serif" font-size="10">charlie@…</text>
  <text x="460" y="135" fill="#a3be8c" font-family="sans-serif" font-size="10">#1</text>
  <rect x="310" y="144" width="200" height="26" rx="0" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="320" y="161" fill="#d8dee9" font-family="sans-serif" font-size="10">diana@…</text>
  <text x="460" y="161" fill="#a3be8c" font-family="sans-serif" font-size="10">#4</text>
  <text x="310" y="200" fill="#a3be8c" font-family="sans-serif" font-size="10">With index: binary search → 1 lookup</text>
</svg>

Because the index is sorted, the database can use **binary search**, halving the search space on every step. On 50 million rows that's roughly 26 comparisons instead of 50 million.

---

## Types of Indexes

Most databases support several index structures. Each solves a different problem.

### B-Tree Index (the default)

The [B-tree](https://en.wikipedia.org/wiki/B-tree) is the workhorse. PostgreSQL, MySQL, and SQLite all default to it. It stores values in a balanced tree so that lookups, range queries (`BETWEEN`, `>`, `<`), and sorted results all cost `O(log n)`.

The easiest way to picture it: you are looking up the name "sarah" in a sorted list of 8 names. Instead of reading from the top, you go to the middle first, ask "is sarah before or after morgan?", then halve again. Three steps gets you there.

<svg viewBox="0 0 560 230" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="280" y="22" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Looking up "sarah" in a B-Tree</text>
  <!-- Step labels -->
  <text x="280" y="44" fill="#81a1c1" font-family="sans-serif" font-size="10" text-anchor="middle">Each node asks: go left (smaller) or right (larger)?</text>
  <!-- Root node -->
  <rect x="195" y="54" width="170" height="38" rx="6" fill="#3b4252" stroke="#88c0d0" stroke-width="2"/>
  <text x="280" y="70" fill="#eceff4" font-family="sans-serif" font-size="12" text-anchor="middle" font-weight="bold">Start: "morgan"</text>
  <text x="280" y="84" fill="#88c0d0" font-family="sans-serif" font-size="10" text-anchor="middle">sarah > morgan → go right</text>
  <!-- Level 2 left (not taken) -->
  <rect x="60" y="128" width="150" height="34" rx="5" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="135" y="145" fill="#4c566a" font-family="sans-serif" font-size="11" text-anchor="middle">alice … morgan</text>
  <text x="135" y="157" fill="#4c566a" font-family="sans-serif" font-size="9" text-anchor="middle">(not searched)</text>
  <!-- Level 2 right (taken) -->
  <rect x="340" y="128" width="160" height="34" rx="5" fill="#3b4252" stroke="#88c0d0" stroke-width="2"/>
  <text x="420" y="145" fill="#eceff4" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">"quinn"</text>
  <text x="420" y="157" fill="#88c0d0" font-family="sans-serif" font-size="9" text-anchor="middle">sarah > quinn → go right</text>
  <!-- Connectors root → L2 -->
  <path d="M 240 92 L 160 128" stroke="#4c566a" stroke-width="1.5" fill="none"/>
  <path d="M 320 92 L 390 128" stroke="#88c0d0" stroke-width="2" fill="none"/>
  <!-- Leaf nodes -->
  <rect x="295" y="196" width="100" height="28" rx="4" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="345" y="214" fill="#4c566a" font-family="sans-serif" font-size="10" text-anchor="middle">quinn … ryan</text>
  <rect x="410" y="196" width="110" height="28" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="2"/>
  <text x="465" y="210" fill="#a3be8c" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">sarah → #row</text>
  <text x="465" y="221" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">found in 3 steps</text>
  <!-- Connectors L2 right → leaves -->
  <path d="M 400 162 L 345 196" stroke="#4c566a" stroke-width="1" fill="none"/>
  <path d="M 440 162 L 465 196" stroke="#a3be8c" stroke-width="2" fill="none"/>
</svg>

### Hash Index

A [hash index](https://en.wikipedia.org/wiki/Hash_table) uses a hash function to map a key directly to a bucket, giving `O(1)` exact lookups. It is very fast for `WHERE email = 'alice@example.com'` but completely useless for range queries, since hashing destroys sort order. PostgreSQL supports hash indexes explicitly; in MySQL they are only available on Memory tables.

### Composite Index

A composite (multi-column) index covers more than one column. The order matters: a composite index on `(user_id, created_at)` can answer queries filtering on `user_id` alone, or `user_id AND created_at` together, but it cannot efficiently serve queries filtering on `created_at` alone. This is the **left-prefix rule**.

### Partial Index

A partial index covers only rows matching a `WHERE` clause. For example, `CREATE INDEX ON orders (created_at) WHERE status = 'pending'` builds a small index covering only pending orders. Useful when you almost always query a specific filtered subset of the table.

### Full-Text Index

Designed for searching inside text fields, a full-text index builds an [inverted index](https://en.wikipedia.org/wiki/Inverted_index): a map from every word to the rows containing it. This is how Postgres `tsvector`, Elasticsearch, and Meilisearch work under the hood.

---

## The Write Penalty

Here is the cost that surprises many engineers: **every index you add makes writes slower**.

When you `INSERT` a row, the database does not just append data to a table file. It must also insert a new entry into every index on that table, potentially rebalancing B-tree nodes in the process. The same applies to `UPDATE` and `DELETE`.

<svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="300" y="22" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Cost of INSERT with indexes</text>
  <!-- Step 1 -->
  <rect x="20" y="38" width="130" height="44" rx="6" fill="#2e3440" stroke="#88c0d0" stroke-width="2"/>
  <text x="85" y="57" fill="#eceff4" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">INSERT row</text>
  <text x="85" y="73" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">write to table file</text>
  <!-- Arrow -->
  <path d="M 150 60 L 180 60" stroke="#4c566a" stroke-width="1.5" fill="none" marker-end="url(#a2)"/>
  <defs>
    <marker id="a2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#4c566a"/>
    </marker>
  </defs>
  <!-- Index updates stacked -->
  <rect x="183" y="38" width="130" height="28" rx="5" fill="#3b4252" stroke="#bf616a" stroke-width="1"/>
  <text x="248" y="57" fill="#bf616a" font-family="sans-serif" font-size="10" text-anchor="middle">Update index #1 (email)</text>
  <rect x="183" y="72" width="130" height="28" rx="5" fill="#3b4252" stroke="#bf616a" stroke-width="1"/>
  <text x="248" y="91" fill="#bf616a" font-family="sans-serif" font-size="10" text-anchor="middle">Update index #2 (name)</text>
  <rect x="183" y="106" width="130" height="28" rx="5" fill="#3b4252" stroke="#bf616a" stroke-width="1"/>
  <text x="248" y="125" fill="#bf616a" font-family="sans-serif" font-size="10" text-anchor="middle">Update index #3 (created_at)</text>
  <!-- Connectors to index boxes -->
  <path d="M 150 52 L 183 52" stroke="#bf616a" stroke-width="1" fill="none"/>
  <path d="M 150 52 L 165 52 L 165 86 L 183 86" stroke="#bf616a" stroke-width="1" fill="none"/>
  <path d="M 150 52 L 165 52 L 165 120 L 183 120" stroke="#bf616a" stroke-width="1" fill="none"/>
  <!-- Arrow to result -->
  <path d="M 313 85 L 360 85" stroke="#4c566a" stroke-width="1.5" fill="none" marker-end="url(#a3)"/>
  <defs>
    <marker id="a3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#4c566a"/>
    </marker>
  </defs>
  <!-- Result -->
  <rect x="362" y="60" width="200" height="50" rx="6" fill="#3b4252" stroke="#ebcb8b" stroke-width="1.5"/>
  <text x="462" y="80" fill="#ebcb8b" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">3× write amplification</text>
  <text x="462" y="97" fill="#d8dee9" font-family="sans-serif" font-size="9" text-anchor="middle">more indexes = slower INSERTs</text>
</svg>

This is called **write amplification**: one logical write fans out into multiple physical writes. On write-heavy workloads (event pipelines, logging, high-frequency trading), too many indexes can make your database the bottleneck.

**The rule:** only create an index when you have a measured slow query that needs it. Don't index speculatively.

---

## Cons at a Glance

- **Slower writes**: every `INSERT`, `UPDATE`, and `DELETE` must update all indexes on the table
- **Extra disk space**: each index is its own data structure stored on disk; large tables with many indexes can double or triple storage requirements
- **Index maintenance**: over time indexes can become bloated from deleted rows leaving dead entries. PostgreSQL `VACUUM`, for example, reclaims this space
- **Wrong index, no benefit**: a composite index used in the wrong column order, or an index on a low-cardinality column (like a boolean `is_active`), does nothing. Always use `EXPLAIN ANALYZE` to confirm your queries actually hit the index

---

## Further Reading

- [Use the index, Luke](https://use-the-index-luke.com/) — the best free book on SQL indexes, written for developers not DBAs
- [B-Trees and database indexes explained](https://planetscale.com/blog/btrees-and-database-indexes) — PlanetScale's deep-dive on how B-trees back real indexes
- [Composite indexes and the left-prefix rule](https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html) — how multi-column index ordering works
- [Partial indexes in PostgreSQL](https://www.postgresql.org/docs/current/indexes-partial.html) — when and why to index only a subset of rows
- [How PostgreSQL uses indexes](https://www.postgresql.org/docs/current/indexes.html) — a readable explanation of all index types in Postgres
