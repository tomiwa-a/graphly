---
title: Database Sharding
slug: database-sharding
summary: "Learn horizontal database scaling using database sharding, routing mechanisms like hash and range keys, scatter-gather queries, and dynamic re-sharding patterns."
difficulty: advanced
chapterId: databases
domain: Databases
estimatedMinutes: 15
prerequisites: [indexes, hash-functions]
related: [database-replication]
seo_title: "Database Sharding: Scaling Out Database Engines"
seo_description: "Understand database sharding, including hash-based and range-based key routing, scatter-gather query processing, and live data migration strategies."
canonical_url: "/concepts/database-sharding"
code_examples:
  - language: go
    title: Multi-Threaded Scatter-Gather Database Router
    code: |
      package main

      import (
          "context"
          "fmt"
          "sync"
      )

      type Row struct {
          ID    int
          Value string
          Age   int
      }

      type ShardConnection interface {
          Query(ctx context.Context, sql string, args ...interface{}) ([]Row, error)
          Exec(ctx context.Context, sql string, args ...interface{}) error
      }

      type MockShard struct {
          ID   int
          Data []Row
      }

      func (m *MockShard) Query(ctx context.Context, sql string, args ...interface{}) ([]Row, error) {
          var minAge, maxAge int
          fmt.Sscanf(sql, "SELECT * FROM users WHERE age BETWEEN %d AND %d", &minAge, &maxAge)
          
          var res []Row
          for _, row := range m.Data {
              if row.Age >= minAge && row.Age <= maxAge {
                  res = append(res, row)
              }
          }
          return res, nil
      }

      func (m *MockShard) Exec(ctx context.Context, sql string, args ...interface{}) error {
          row := args[0].(Row)
          m.Data = append(m.Data, row)
          return nil
      }

      type Router struct {
          mu          sync.RWMutex
          Shards      map[int]ShardConnection
          IsMigrating bool
          NewShards   map[int]ShardConnection
      }

      func (r *Router) ResolveShardsForRange(minAge, maxAge int) []int {
          var shardIDs []int
          if minAge <= 30 {
              shardIDs = append(shardIDs, 0)
          }
          if minAge <= 60 && maxAge >= 31 {
              shardIDs = append(shardIDs, 1)
          }
          if maxAge >= 61 {
              shardIDs = append(shardIDs, 2)
          }
          return shardIDs
      }

      func (r *Router) ScatterGatherQuery(ctx context.Context, minAge, maxAge int) ([]Row, error) {
          shardIDs := r.ResolveShardsForRange(minAge, maxAge)
          
          r.mu.RLock()
          defer r.mu.RUnlock()

          var wg sync.WaitGroup
          resultChan := make(chan []Row, len(shardIDs))
          errChan := make(chan error, len(shardIDs))

          sql := fmt.Sprintf("SELECT * FROM users WHERE age BETWEEN %d AND %d", minAge, maxAge)

          for _, shardID := range shardIDs {
              wg.Add(1)
              go func(id int) {
                  defer wg.Done()
                  shard, exists := r.Shards[id]
                  if !exists {
                      errChan <- fmt.Errorf("shard %d not configured", id)
                      return
                  }
                  rows, err := shard.Query(ctx, sql)
                  if err != nil {
                      errChan <- err
                      return
                  }
                  resultChan <- rows
              }(shardID)
          }

          wg.Wait()
          close(resultChan)
          close(errChan)

          if len(errChan) > 0 {
              return nil, <-errChan
          }

          var allRows []Row
          for rows := range resultChan {
              allRows = append(allRows, rows...)
          }
          
          return allRows, nil
      }

      func (r *Router) Write(ctx context.Context, shardKey int, row Row) error {
          r.mu.RLock()
          defer r.mu.RUnlock()

          shardID := shardKey % len(r.Shards)
          shard, exists := r.Shards[shardID]
          if !exists {
              return fmt.Errorf("target shard %d not found", shardID)
          }

          err := shard.Exec(ctx, "INSERT INTO users (id, value, age) VALUES ($1, $2, $3)", row)
          if err != nil {
              return err
          }

          if r.IsMigrating {
              newShardID := shardKey % len(r.NewShards)
              if newShard, exists := r.NewShards[newShardID]; exists {
                  go func() {
                      _ = newShard.Exec(ctx, "INSERT INTO users (id, value, age) VALUES ($1, $2, $3)", row)
                  }()
              }
          }

          return nil
      }
---

## The Concept

As application write volume grows, a database running on a single server will eventually hit physical limits. While read volume can be scaled horizontally by deploying read-only replicas, write operations must still target the primary node, creating a CPU and disk write bottleneck.

To scale writes horizontally, systems use **sharding** (horizontal partitioning). Sharding distributes database rows across multiple physically independent database instances (shards). Each shard runs on its own server with its own memory, CPU, and disk storage.

```xml
<svg viewBox="0 0 580 340" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="24" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Database Sharding Query Routing</text>
  <rect x="230" y="50" width="120" height="30" rx="4" fill="#2e3440" stroke="#88c0d0"/>
  <text x="290" y="69" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Sharding Router</text>
  <rect x="30" y="120" width="220" height="25" rx="3" fill="#3b4252" stroke="#ebcb8b"/>
  <text x="140" y="136" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">Single-Key Lookup (ID: 104) -> Hash 1</text>
  <rect x="330" y="120" width="220" height="25" rx="3" fill="#3b4252" stroke="#a3be8c"/>
  <text x="440" y="136" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">Range Query (Age 20-80) -> Scatter-Gather</text>
  <rect x="50" y="260" width="100" height="40" rx="4" fill="#2e3440" stroke="#4c566a"/>
  <text x="100" y="280" fill="#d8dee9" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Shard 0</text>
  <text x="100" y="294" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Ages: 0 - 30</text>
  <rect x="240" y="260" width="100" height="40" rx="4" fill="#2e3440" stroke="#4c566a"/>
  <text x="290" y="280" fill="#d8dee9" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Shard 1</text>
  <text x="290" y="294" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Ages: 31 - 60</text>
  <rect x="430" y="260" width="100" height="40" rx="4" fill="#2e3440" stroke="#4c566a"/>
  <text x="480" y="280" fill="#d8dee9" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Shard 2</text>
  <text x="480" y="294" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Ages: 61 - 100</text>
  <path d="M 290 80 L 140 120" stroke="#d8dee9" stroke-width="1" marker-end="url(#arr)"/>
  <path d="M 290 80 L 440 120" stroke="#d8dee9" stroke-width="1" marker-end="url(#arr)"/>
  <path d="M 140 145 L 290 260" stroke="#ebcb8b" stroke-width="1.2" marker-end="url(#arr-yellow)"/>
  <path d="M 440 145 L 100 260" stroke="#a3be8c" stroke-width="1" marker-end="url(#arr-green)"/>
  <path d="M 440 145 L 290 260" stroke="#a3be8c" stroke-width="1" marker-end="url(#arr-green)"/>
  <path d="M 440 145 L 480 260" stroke="#a3be8c" stroke-width="1" marker-end="url(#arr-green)"/>
  <defs>
    <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#d8dee9"/>
    </marker>
    <marker id="arr-yellow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#ebcb8b"/>
    </marker>
    <marker id="arr-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#a3be8c"/>
    </marker>
  </defs>
</svg>
```

---

## Practical Analogy

Think of database sharding as managing a customer filing system in a massive archive room:

* **Single-Server Database** is like keeping all files in a single, large cabinet. When the folder count grows too large, the drawers jam.
* **Vertical Partitioning** is like separating the documents in the cabinet by category (e.g. bills in drawer 1, customer contact files in drawer 2).
* **Horizontal Partitioning (Sharding)** is like purchasing three separate cabinets and splitting the customer files alphabetically: customers A to I go in cabinet 1, J to R in cabinet 2, and S to Z in cabinet 3. If you want to look up "John Smith", you go straight to cabinet 2. This allows three clerks to search for files simultaneously without bumping into each other.

---

## Partitioning vs Sharding

While the terms are related, they apply to different physical boundaries:
* **Partitioning (Within a single node)**: Splitting a database table into smaller sub-tables managed by the same database engine instance (e.g. PostgreSQL partition by range). This helps keep index tree depths shallow, but the tables still share the host system disk and CPU.
* **Sharding (Across multiple nodes)**: Distributing tables across completely separate servers. Each shard is a separate database engine instance, providing independent hardware scaling.

---

## Sharding Key Selection

The most critical decision in a sharded system is choosing the **sharding key** (the row attribute that determines which shard the data is routed to). An incorrect choice results in two major performance problems:
* **Data Skew**: If database rows are not evenly distributed, one shard will occupy significantly more disk space than others.
* **Hotspots**: If application traffic is uneven (e.g. routing users by status, and all users are active), one shard's CPU and memory will be overloaded while others sit idle.

Ideal sharding keys have high **cardinality** (a large pool of unique values, like user IDs) and a uniform access distribution.

---

## Routing Mechanisms

To direct queries to the correct shard, systems use three routing strategies:

### 1. Hash-Based Sharding
The system calculates a hash of the sharding key and applies a modulo operation against the number of shards:
`ShardID = Hash(Key) % NumberOfShards`
This ensures a highly uniform distribution of data. However, adding or removing shards changes the modulo divisor, requiring almost all keys to be moved to different shards. This is mitigated by using **consistent hashing**.

### 2. Range-Based Sharding
Data is grouped by ranges of the sharding key value (e.g. routing by birth year or zip code). This makes range queries highly efficient because consecutive values reside on the same shard. However, range sharding easily creates hotspots (e.g. if routing by timestamp, all writes will hit the newest shard).

### 3. Directory-Based (Lookup) Routing
A centralized coordinator service manages a mapping database detailing which key maps to which shard. This allows keys to be moved individually between shards without recalculating hashes. However, the lookup directory becomes a single point of failure and adds network latency to every query.

---

## Query Execution Over Shards

How queries are written dictates performance in sharded architectures:
* **Single-Shard Queries**: The query contains the sharding key. The router targets the exact shard directly. This is fast and scales efficiently.
* **Scatter-Gather Operations**: If a query lacks the sharding key (e.g. `SELECT * FROM users WHERE status = 'active'`), the router must fan out the query to *every* active shard in parallel. It collects the responses, merges them, filters the results, and returns the final set. Scatter-gather queries consume cluster-wide resources and degrade to the speed of the slowest responding shard.

---

## Cross-Shard Joins & Transaction Guarantees

Executing relationships across shards introduces architectural limitations:
* **Cross-Shard Joins**: SQL `JOIN` operations only work within a single database engine instance. If you join `orders` on Shard 1 with `customers` on Shard 2, the application must query both shards separately and perform the join operation manually in memory, which is highly inefficient. To prevent this, developers design schemas to avoid cross-shard relationships or denormalize data.
* **Distributed Transactions**: Enforcing ACID transactions across shards requires coordination protocols like the **Two-Phase Commit (2PC)**. This introduces significant network overhead and lock contention, which is why most sharded systems drop cross-shard transactions in favor of eventual consistency.

---

## Dynamic Re-Sharding & Migrations

As data volume continues to grow, shards will eventually fill up, requiring the cluster to split existing shards (re-sharding). To execute this without application downtime, systems use migration patterns:

1. **Dual-Writing**: The application is configured to write new data to both the old shard cluster and the new shard cluster.
2. **Backfilling**: A background migration worker copies historical data from the old shard to the new shard.
3. **Verification**: A validator compares data checksums on both shards to ensure parity.
4. **Cutover**: The router updates its map to route all read and write traffic to the new shard, and the old shard is deleted.

---

## Further Reading

* [Database System Concepts](https://www.db-book.com/) — Chapter 20: Parallel and Distributed Databases
* [Consistent Hashing and Random Trees](https://dl.acm.org/doi/10.1145/258533.258660) — Paper on scaling hashing key maps dynamically
* [Vitess: Horizontal Scaling for MySQL](https://vitess.io/docs/overview/whatisvitess/) — Architecture documentation on distributed sharding middleware
* [Designing Data-Intensive Applications](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/) — Chapter 6: Partitioning
