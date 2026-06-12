---
title: Caching Eviction Policies (LRU, LFU, FIFO)
slug: caching-eviction-policies
summary: "Learn how caches manage finite memory by evicting items using FIFO, LRU, and LFU policies, and explore hybrid eviction strategies."
difficulty: intermediate
chapterId: caching
domain: Caching
estimatedMinutes: 12
prerequisites: [caching-strategies]
related: [cache-invalidation-distributed]
seo_title: "Cache Eviction Policies: LRU, LFU, FIFO, and Hybrid Algorithms"
seo_description: "Deep dive into cache eviction policies. Master LRU, LFU, FIFO, hybrid algorithms, and TTL structures to optimize cache hit ratios under write workloads."
canonical_url: "/concepts/caching-eviction-policies"
citations:
  - title: "The Art of Computer Programming, Volume 3: Sorting and Searching"
    author: "Donald E. Knuth"
    chapter: "Chapter 6: Searching"
    page_range: "392-421"
    external_link: "https://www-cs-faculty.stanford.edu/~knuth/taocp.html"
code_examples:
  - language: go
    title: "High-Performance O(1) Least Recently Used (LRU) Cache from Scratch"
    code: |
      package main

      import (
          "fmt"
          "sync"
      )

      // Node represents a doubly linked list node storing key-value pairs.
      type Node struct {
          key   string
          value interface{}
          prev  *Node
          next  *Node
      }

      // LRUCache implements a thread-safe O(1) LRU eviction cache.
      type LRUCache struct {
          mu       sync.Mutex
          capacity int
          cache    map[string]*Node
          head     *Node // Dummy head
          tail     *Node // Dummy tail
      }

      // NewLRUCache initializes and returns an LRUCache.
      func NewLRUCache(capacity int) *LRUCache {
          c := &LRUCache{
              capacity: capacity,
              cache:    make(map[string]*Node),
              head:     &Node{},
              tail:     &Node{},
          }
          c.head.next = c.tail
          c.tail.prev = c.head
          return c
      }

      // remove unlinks a node from its current position in the list.
      func (c *LRUCache) remove(node *Node) {
          node.prev.next = node.next
          node.next.prev = node.prev
      }

      // addToHead links a node immediately after the dummy head node.
      func (c *LRUCache) addToHead(node *Node) {
          node.next = c.head.next
          node.prev = c.head
          c.head.next.prev = node
          c.head.next = node
      }

      // Get retrieves a key, promotes it to MRU (head), and returns the value.
      func (c *LRUCache) Get(key string) (interface{}, bool) {
          c.mu.Lock()
          defer c.mu.Unlock()

          node, exists := c.cache[key]
          if !exists {
              return nil, false
          }

          c.remove(node)
          c.addToHead(node)
          return node.value, true
      }

      // Put adds or updates a key-value pair, evicting the LRU tail if capacity is exceeded.
      func (c *LRUCache) Put(key string, value interface{}) {
          c.mu.Lock()
          defer c.mu.Unlock()

          node, exists := c.cache[key]
          if exists {
              node.value = value
              c.remove(node)
              c.addToHead(node)
              return
          }

          newNode := &Node{key: key, value: value}
          c.cache[key] = newNode
          c.addToHead(newNode)

          if len(c.cache) > c.capacity {
              // Evict the least recently used node (immediately preceding dummy tail)
              victim := c.tail.prev
              c.remove(victim)
              delete(c.cache, victim.key)
          }
      }

      func main() {
          cache := NewLRUCache(3)

          cache.Put("a", 1)
          cache.Put("b", 2)
          cache.Put("c", 3)

          fmt.Println("Initial Cache State:")
          printCache(cache)

          // Access "a" to promote it to the most recently used (MRU) position
          val, found := cache.Get("a")
          fmt.Printf("\nAccessed key 'a' (value: %v, found: %t)\n", val, found)
          printCache(cache)

          // Insert "d" to trigger eviction of the tail node (which is now 'b')
          fmt.Println("\nInserting key 'd' (exceeding capacity of 3):")
          cache.Put("d", 4)
          printCache(cache)
      }

      func printCache(c *LRUCache) {
          c.mu.Lock()
          defer c.mu.Unlock()
          curr := c.head.next
          fmt.Print("Head (MRU) -> ")
          for curr != c.tail {
              fmt.Printf("[%s: %v] -> ", curr.key, curr.value)
              curr = curr.next
          }
          fmt.Println("Tail (LRU)")
      }
---

## The Necessity of Eviction

A cache stores frequently accessed data in high-speed, expensive memory (like RAM) to bypass slow, downstream storage layers (like SSDs or remote databases). Because hardware budget constraints prevent us from storing the entire database in RAM, a cache operates with a **finite memory buffer**.

As application databases receive new records, the cache is filled to maximum capacity. Once full, any new write transaction requires the cache to make room by discarding (evicting) existing keys. 

Choosing which keys to discard determines the **cache hit ratio** (the percentage of requests successfully served from cache memory), which directly impacts overall system latency and database load.

### Real-World Analogy
Imagine a physical desk surface where you keep paper files. Your desk surface has limited space (the cache capacity). 
* A **First-In, First-Out** (FIFO) policy is like placing incoming folders in a neat stack, and when the desk is full, throwing away the oldest stack folder, even if you consult it every hour.
* A **Least Recently Used** (LRU) policy is keeping the folders you currently touch close to you, while sliding the folder you haven't opened in weeks off the edge of the desk.
* A **Least Frequently Used** (LFU) policy is keeping a tally mark on every folder. You evict folders with the lowest counts. However, folders from a project you completed last month might have hundreds of legacy tallies, preventing new files from finding space on your desk.

---

## FIFO (First-In, First-Out) Eviction

The **First-In, First-Out** (FIFO) algorithm is the simplest eviction strategy. It operates on a queue structure, evicting items in the exact chronological order they were inserted.

```
       [Insert New Key] ──► [ Node E ] ──► [ Node D ] ──► [ Node C ] ──► [Evict oldest (C)]
```

### Characteristics of FIFO
* **Low Metadata Overhead**: FIFO only needs to track insertion timestamps or manage a basic linked list queue, requiring minimal memory allocation per cache entry.
* **Low Hit-Ratio Anomalies**: FIFO does not account for how frequently or recently an item is accessed. A highly popular key requested thousands of times per second will still be evicted if it was inserted early.
* **Belady's Anomaly**: For certain access patterns, increasing the cache's capacity under a FIFO policy can actually *decrease* the hit ratio, violating standard caching expectations.

---

## LRU (Least Recently Used) Eviction

The **Least Recently Used** (LRU) algorithm evicts the key that has not been accessed for the longest duration. It assumes that if a key was accessed recently, it is highly likely to be accessed again in the near future (temporal locality).

### Data Structure Mechanics
To achieve constant-time `O(1)` operations for both retrievals and updates, an LRU cache combines two data structures:

* **Hash Map**: Maps keys to nodes in a doubly linked list, enabling `O(1)` point lookups.
* **Doubly Linked List**: Maintains the recency order of the cache items. The head node represents the Most Recently Used (MRU) item, while the tail node represents the Least Recently Used (LRU) item.

<svg viewBox="0 0 580 280" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="22" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">LRU Cache: O(1) Hash Map &amp; Doubly Linked List</text>
  <rect x="20" y="55" width="120" height="200" rx="6" fill="#2e3440" stroke="#81a1c1" stroke-width="2"/>
  <text x="80" y="75" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Hash Map</text>
  <rect x="30" y="90" width="100" height="25" rx="3" fill="#3b4252"/>
  <text x="40" y="106" fill="#88c0d0" font-family="monospace" font-size="10">"a" : ptr</text>
  <rect x="30" y="125" width="100" height="25" rx="3" fill="#3b4252"/>
  <text x="40" y="141" fill="#88c0d0" font-family="monospace" font-size="10">"b" : ptr</text>
  <rect x="30" y="160" width="100" height="25" rx="3" fill="#3b4252"/>
  <text x="40" y="176" fill="#88c0d0" font-family="monospace" font-size="10">"c" : ptr</text>
  <rect x="30" y="195" width="100" height="25" rx="3" fill="#3b4252"/>
  <text x="40" y="211" fill="#88c0d0" font-family="monospace" font-size="10">"d" : ptr</text>
  <text x="360" y="50" fill="#a3be8c" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Doubly Linked List (Recency Ordering)</text>
  <rect x="180" y="70" width="50" height="35" rx="4" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="205" y="91" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">HEAD</text>
  <rect x="260" y="70" width="70" height="35" rx="4" fill="#3b4252" stroke="#a3be8c" stroke-width="2"/>
  <text x="295" y="88" fill="#eceff4" font-family="monospace" font-size="10" text-anchor="middle">Node "a"</text>
  <text x="295" y="99" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">(Val: 1)</text>
  <rect x="360" y="70" width="70" height="35" rx="4" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="395" y="88" fill="#d8dee9" font-family="monospace" font-size="10" text-anchor="middle">Node "d"</text>
  <text x="395" y="99" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">(Val: 4)</text>
  <rect x="460" y="70" width="70" height="35" rx="4" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="495" y="88" fill="#d8dee9" font-family="monospace" font-size="10" text-anchor="middle">Node "c"</text>
  <text x="495" y="99" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">(Val: 3)</text>
  <rect x="460" y="170" width="70" height="35" rx="4" fill="#3b4252" stroke="#bf616a" stroke-width="2"/>
  <text x="495" y="188" fill="#eceff4" font-family="monospace" font-size="10" text-anchor="middle">Node "b"</text>
  <text x="495" y="199" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">(Val: 2)</text>
  <rect x="460" y="230" width="70" height="30" rx="4" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="495" y="249" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">TAIL</text>
  <path d="M 230 87 L 260 87" stroke="#eceff4" stroke-width="1" fill="none" marker-end="url(#arr)"/>
  <path d="M 260 92 L 230 92" stroke="#eceff4" stroke-width="1" fill="none" marker-end="url(#arr)"/>
  <path d="M 330 87 L 360 87" stroke="#eceff4" stroke-width="1" fill="none" marker-end="url(#arr)"/>
  <path d="M 360 92 L 330 92" stroke="#eceff4" stroke-width="1" fill="none" marker-end="url(#arr)"/>
  <path d="M 430 87 L 460 87" stroke="#eceff4" stroke-width="1" fill="none" marker-end="url(#arr)"/>
  <path d="M 460 92 L 430 92" stroke="#eceff4" stroke-width="1" fill="none" marker-end="url(#arr)"/>
  <path d="M 495 105 L 495 170" stroke="#eceff4" stroke-width="1" fill="none" marker-end="url(#arr)"/>
  <path d="M 495 205 L 495 230" stroke="#eceff4" stroke-width="1" fill="none" marker-end="url(#arr)"/>
  <path d="M 130 102 C 180 102, 200 90, 258 88" stroke="#ebcb8b" stroke-width="1.2" fill="none" marker-end="url(#arr)"/>
  <path d="M 130 137 C 220 137, 300 170, 458 185" stroke="#ebcb8b" stroke-width="1.2" fill="none" marker-end="url(#arr)"/>
  <text x="295" y="140" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Get("a") promotes "a" to Head (MRU)</text>
  <text x="325" y="210" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle">Next insert evicts "b" from Tail (LRU)</text>
  <defs>
    <marker id="arr" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
      <path d="M0,0 L0,4 L4,2 z" fill="#eceff4"/>
    </marker>
  </defs>
</svg>

When a key is read or updated via `Get()` or `Put()`, the cache looks up the node pointer using the hash map, detaches the node from its current linked list position, and moves it to the head of the list. 

If a `Put()` call causes the list length to exceed the cache capacity, the node directly preceding the dummy tail (the LRU node) is unlinked from the list and its key is deleted from the hash map, completing eviction in `O(1)` time.

### The Cache Pollution Issue
A primary limitation of LRU is its vulnerability to **cache pollution** under scanning queries (such as a database backup script reading every record sequentially). 

A full table scan will load thousands of infrequently used records into the cache, moving them to the MRU head and evicting hot, frequently requested items. This causes the cache hit ratio to plummet.

---

## LFU (Least Frequently Used) Eviction

The **Least Frequently Used** (LFU) algorithm evicts the key with the lowest access frequency. It assumes that items with high access counts are extremely likely to be needed in the future.

### Mechanics and Data Structures
To implement LFU in `O(1)` time, systems use a double linked list of frequency buckets, where each bucket contains a doubly linked list of nodes with that exact access count. 

When an item is accessed, its frequency counter increments, and its node is moved to the next higher frequency bucket.

### The Frequency Starvation Issue
The primary downside of LFU is **frequency starvation**. 

If a key accumulates a high frequency count during a brief, intense traffic spike (e.g. a viral marketing campaign), it will remain in the cache indefinitely even after the campaign ends and request volume drops to zero. 

Because its historical count is high, it is protected from eviction, preventing newly active keys from entering the cache.

---

## Hybrid Policies and Modern Optimizations

To resolve the limitations of plain LRU and LFU, modern caching engines employ hybrid algorithms:

* **LRU-2 / LRU-K**: Tracks the time of the last `K` accesses (usually `K=2`). A key is not promoted to the high-priority cache partition on its first access, but only on its second access. This prevents scanning queries (single accesses) from polluting the cache.
* **2Q (Two Queue)**: Uses two distinct queues. Newly read items enter a FIFO queue (`A1in`). If they are evicted from `A1in` without being accessed again, their keys are stored in a ghost queue (`A1out`). If a key in `A1out` is accessed again, it is promoted to a main, long-term LRU queue (`Am`), successfully separating one-time reads from frequent reads.
* **W-TinyLFU**: Used in modern libraries like Caffeine (Java) and Ristretto (Go). It maintains a tiny window cache (LRU) and a main cache. It uses a Bloom Filter-like structure (Count-Min Sketch) to estimate access frequency for incoming items, admitting them to the main cache only if their access frequency is higher than the eviction victim's frequency.

---

## Time-To-Live (TTL) Eviction

Independent of access history, caches often enforce a **Time-To-Live** (TTL) value, which guarantees that data is evicted after a specific duration to prevent serving stale information. Caches clear expired TTL keys using two concurrent mechanisms:

* **Passive Expiration**: When a client requests a key, the cache checks the key's expiration timestamp. If the current time is past the timestamp, the cache deletes the key and returns a cache miss.
* **Active Expiration**: Because passive expiration can leave unused, expired keys occupying memory, a background thread runs periodic sweeps. This thread samples a random subset of keys with TTLs and evicts any that have expired, maintaining a balanced memory profile.

---

## Workload Patterns and Hit Ratio Optimization

The effectiveness of an eviction policy depends heavily on the application's access workload:

* **Read-Heavy Zipfian Workloads**: Most web applications follow a Zipfian distribution (the Pareto 80/20 rule, where a small subset of keys receive the vast majority of requests). LRU and LFU perform exceptionally well here, keeping the small set of hot keys in memory.
* **Write-Heavy / Streaming Workloads**: When applications continuously write new data and read it only once, caching offers low utility. Here, strict TTLs or FIFO queues prevent the cache from wasting memory buffers.
* **Scanning Workloads**: If the application frequently scans large ranges of key-value pairs, hybrid policies like 2Q or W-TinyLFU are critical to prevent total cache pollution.

---

## Further Reading

- [The Art of Computer Programming: Volume 3](https://www-cs-faculty.stanford.edu/~knuth/taocp.html) — Donald Knuth's fundamental text covering sorted arrays, lists, and search optimizations.
- [Caffeine Caching Library Design](https://github.com/ben-manes/caffeine/wiki/Design) — Detailed walkthrough of the W-TinyLFU window admission policy.
- [Redis Cache Eviction Documentation](https://redis.io/docs/reference/eviction/) — Real-world application of approximated LRU and LFU algorithms under memory limits.
