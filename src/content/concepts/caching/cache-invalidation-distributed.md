---
title: Cache Invalidation
slug: cache-invalidation-distributed
summary: "Decoupling data updates from stale cache reads using change data capture, lease models, and single-flight reads in distributed environments."
difficulty: advanced
chapterId: caching
domain: Caching
estimatedMinutes: 15
prerequisites: [caching-strategies, consistent-hashing]
related: [change-data-capture]
seo_title: "Cache Invalidation: Strategies and Patterns in Distributed Systems"
seo_description: "Master cache invalidation patterns. Learn the dual-write problem, cache-aside race conditions, CDC-based invalidation, leases, and single-flight reads."
canonical_url: "/concepts/cache-invalidation-distributed"
citations:
  - title: "Scaling Memcached at Facebook"
    author: "Rajesh Nishtala, Hans Fugal, Steven Grimm, Marc Kwiatkowski, Herman Lee, Harry C. Li, Ryan McElroy, Mike Paleczny, Daniel Lescarbeau, Stephen Frachtenberg, Albert Wong, and Kenji Kaneko"
    chapter: "Sections 3 and 4"
    page_range: "3-8"
    external_link: "https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala"
code_examples:
  - language: go
    title: Singleflight Reader and Lease-Based Cache Updater
    code: |
      package main

      import (
          "context"
          "sync"
          "sync/atomic"
          "time"
      )

      // SingleFlight collapses concurrent requests for the same key.
      type SingleFlight struct {
          mu sync.Mutex
          m  map[string]*call
      }

      type call struct {
          wg  sync.WaitGroup
          val interface{}
          err error
      }

      func (sf *SingleFlight) Do(key string, fn func() (interface{}, error)) (interface{}, error) {
          sf.mu.Lock()
          if sf.m == nil {
              sf.m = make(map[string]*call)
          }
          if c, ok := sf.m[key]; ok {
              sf.mu.Unlock()
              c.wg.Wait()
              return c.val, c.err
          }
          c := new(call)
          c.wg.Add(1)
          sf.m[key] = c
          sf.mu.Unlock()

          c.val, c.err = fn()
          c.wg.Done()

          sf.mu.Lock()
          delete(sf.m, key)
          sf.mu.Unlock()

          return c.val, c.err
      }

      // LeaseCache handles lease-based cache writes to prevent race conditions.
      type LeaseCache struct {
          mu      sync.Mutex
          data    map[string]cacheItem
          leases  map[string]uint64
          tokenID uint64
      }

      type cacheItem struct {
          value      string
          expiration time.Time
      }

      func NewLeaseCache() *LeaseCache {
          return &LeaseCache{
              data:   make(map[string]cacheItem),
              leases: make(map[string]uint64),
          }
      }

      func (lc *LeaseCache) Get(key string) (string, uint64, bool) {
          lc.mu.Lock()
          defer lc.mu.Unlock()

          item, ok := lc.data[key]
          if ok && time.Now().Before(item.expiration) {
              return item.value, 0, true
          }

          // Generate a lease token for the caller on a cache miss
          token := atomic.AddUint64(&lc.tokenID, 1)
          lc.leases[key] = token
          return "", token, false
      }

      func (lc *LeaseCache) Set(key string, value string, token uint64, ttl time.Duration) bool {
          lc.mu.Lock()
          defer lc.mu.Unlock()

          activeToken, hasLease := lc.leases[key]
          if !hasLease || activeToken != token {
              // The lease token is stale or invalid; reject the cache update
              return false
          }

          lc.data[key] = cacheItem{
              value:      value,
              expiration: time.Now().Add(ttl),
          }
          delete(lc.leases, key)
          return true
      }

      func (lc *LeaseCache) Invalidate(key string) {
          lc.mu.Lock()
          defer lc.mu.Unlock()
          delete(lc.data, key)
          delete(lc.leases, key)
      }
---

## The Dual-Write Problem

Caching is a highly effective tool for speeding up reads, but it introduces a major architectural challenge: keeping the cache in sync with the primary database. The most intuitive approach to updating data is the **dual-write** pattern, where the application updates the database and the cache in sequence.

For example, when a user edits their profile, the application writes to the database first, and then updates the corresponding cache key. Alternatively, the application might update the database and delete the cache key, forcing the next read to fetch the fresh data (cache-aside).

While simple, dual-writes are highly fragile. In a distributed system, network glitches, application crashes, or concurrent requests can disrupt this sequence. If the database write succeeds but the cache update fails due to a brief network blip, the cache remains out of sync until the key's TTL expires. This creates a state of **inconsistent data**, where clients receive stale information despite a successful write operation.

---

## Cache-Aside Concurrency Bugs

The most subtle errors in cache invalidation happen when multiple application instances read and write concurrently. In the classic **cache-aside** pattern, readers handle cache misses by querying the database and writing the result back to the cache. This creates a race condition between a reader processing a cache miss and a writer updating the database.

Consider the following timeline:

1. **Reader A** queries the cache for a key and gets a miss.
2. **Reader A** queries the database and retrieves the old value (let us say, `val=A`).
3. **Writer B** updates the database to `val=B`.
4. **Writer B** deletes the cache key to invalidate it.
5. **Reader A** finally writes the old value `val=A` back to the cache.

At the end of this sequence, the database has `val=B`, but the cache contains the stale `val=A`. Because the cache invalidation occurred *before* the stale write reached the cache, the stale value remains there indefinitely until evicted or expired by its TTL.

<svg viewBox="0 0 580 300" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="20" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Cache-Aside Race Condition</text>
  <text x="70" y="45" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Reader (App 1)</text>
  <text x="510" y="45" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Writer (App 2)</text>
  <line x1="70" y1="55" x2="70" y2="280" stroke="#4c566a" stroke-width="1.5" stroke-dasharray="4"/>
  <line x1="510" y1="55" x2="510" y2="280" stroke="#4c566a" stroke-width="1.5" stroke-dasharray="4"/>
  <rect x="230" y="65" width="120" height="30" rx="4" fill="#2e3440" stroke="#88c0d0" stroke-width="1"/>
  <text x="290" y="83" fill="#88c0d0" font-family="sans-serif" font-size="9" text-anchor="middle">Cache (Empty)</text>
  <rect x="230" y="165" width="120" height="30" rx="4" fill="#2e3440" stroke="#ebcb8b" stroke-width="1"/>
  <text x="290" y="183" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle">Database (val=B)</text>
  <path d="M 70 80 L 225 80" stroke="#bf616a" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="145" y="75" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle">1. Get -> Miss</text>
  <path d="M 70 120 L 225 120" stroke="#eceff4" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="145" y="115" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">2. Query DB (gets A)</text>
  <path d="M 510 145 L 355 145" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="435" y="140" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">3. Update DB to B</text>
  <path d="M 510 200 L 355 200" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="435" y="195" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">4. Delete Cache Key</text>
  <path d="M 70 250 L 225 250" stroke="#bf616a" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="145" y="245" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle">5. Set stale val=A</text>
  <rect x="230" y="240" width="120" height="30" rx="4" fill="#3b4252" stroke="#bf616a" stroke-width="1.5"/>
  <text x="290" y="258" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Cache has stale A!</text>
  <defs>
    <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#d8dee9"/>
    </marker>
  </defs>
</svg>

---

## Lease-Based Caching

To solve this race condition without adding heavy locks to the database, you can use **lease-based caching**. When an application queries the cache and encounters a miss, the cache issues a unique **lease token** along with the miss notification. 

This token acts as a ticket to write back to the cache. The application performs its database query and tries to write the result back to the cache, presenting the lease token. If a write operation occurred in the database during this window, the cache invalidates any outstanding lease tokens for that key.

When the reader tries to write back the stale data using its invalidated lease token, the cache rejects the write. This simple check ensures that stale, slow reads cannot overwrite fresher data written by subsequent transactions.

---

## CDC-Based Invalidation

To completely avoid the dual-write problem, you can remove cache updates from the synchronous application code path entirely. Instead, use **Change Data Capture (CDC)** to drive cache invalidation asynchronously.

Under this model, the application only writes to the database. The database appends the change to its transaction log (such as PostgreSQL's WAL). A dedicated CDC daemon tails this transaction log and publishes updates to a messaging system or directly calls the cache invalidation API.

This approach offers two major benefits:

* **Atomicity**: The cache is only invalidated if the database transaction successfully commits.
* **Order Preservation**: Because the transaction log represents a serialized timeline of database changes, the cache is invalidated in the exact order the updates occurred, eliminating concurrency races.

---

## Single-Flight Read Optimization

In high-traffic systems, a cache miss for a popular key can lead to a **cache stampede**, where thousands of concurrent readers query the database simultaneously. To prevent this database overload, you can use a **single-flight** read optimization.

A single-flight wrapper tracks active requests. When a request for a key comes in, the wrapper checks if a database query for that key is already in progress. If so, new callers wait for the existing query to finish instead of spawning their own database connections. When the single active database query returns, the wrapper distributes the result to all waiting callers and populates the cache.

---

## Further Reading

* [Scaling Memcached at Facebook](https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala) — The seminal paper introducing lease-based caching and large-scale invalidation strategies.
* [Designing Data-Intensive Applications](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/) — Martin Kleppmann's comprehensive text covering caching anomalies and Change Data Capture.
* [Singleflight Package in Go](https://pkg.go.dev/golang.org/x/sync/singleflight) — Official Go documentation for the singleflight synchronization primitive.
