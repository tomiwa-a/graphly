---
title: Relational Database Indexes (B-Tree vs Hash)
slug: database-index-types
summary: "Understand the structural differences between B-Tree and Hash indexes, their access mechanics (clustered vs non-clustered), scan types, and search performance trade-offs."
difficulty: intermediate
chapterId: databases
domain: Databases
estimatedMinutes: 12
prerequisites: [indexes, hash-functions]
related: [b-plus-trees, sql-joins]
seo_title: "Database Index Types: B-Trees vs Hash Indexes Explained"
seo_description: "Explore database indexes. Learn about clustered and non-clustered indexes, B-Tree and Hash index internals, index seeks vs scans, covering indexes, and composite rules."
canonical_url: "/concepts/database-index-types"
citations:
  - title: "The Ubiquitous B-Tree"
    author: "Douglas Comer"
    chapter: "ACM Computing Surveys, Vol. 11, No. 2"
    page_range: "121-137"
    external_link: "https://dl.acm.org/doi/10.1145/356770.356776"
code_examples:
  - language: go
    title: "B-Tree Range Search vs Hash-Map Point Lookup Index Engine Simulator"
    code: |
      package main

      import (
      	"fmt"
      	"math/rand"
      	"sort"
      	"time"
      )

      // Row represents a physical database record
      type Row struct {
      	ID   int
      	Data string
      }

      // BTreeIndex represents an ordered index (simulated via sorted slice for simplicity)
      type BTreeIndex struct {
      	keys []int
      	rows []Row
      }

      // HashIndex represents an unordered index
      type HashIndex struct {
      	buckets map[int]Row
      }

      // Find performs an O(log N) point lookup in the B-Tree index using binary search
      func (bt *BTreeIndex) Find(key int) (Row, bool, int) {
      	steps := 0
      	idx := sort.Search(len(bt.keys), func(i int) bool {
      		steps++
      		return bt.keys[i] >= key
      	})
      	if idx < len(bt.keys) && bt.keys[idx] == key {
      		return bt.rows[idx], true, steps
      	}
      	return Row{}, false, steps
      }

      // FindRange performs a range scan in the B-Tree index
      // It uses binary search to find the lower bound, then scans contiguous elements sequentially
      func (bt *BTreeIndex) FindRange(minKey, maxKey int) ([]Row, int) {
      	steps := 0
      	idx := sort.Search(len(bt.keys), func(i int) bool {
      		steps++
      		return bt.keys[i] >= minKey
      	})

      	var results []Row
      	for i := idx; i < len(bt.keys); i++ {
      		steps++
      		if bt.keys[i] > maxKey {
      			break
      		}
      		results = append(results, bt.rows[i])
      	}
      	return results, steps
      }

      // Find performs an O(1) point lookup in the Hash index
      func (h *HashIndex) Find(key int) (Row, bool, int) {
      	row, exists := h.buckets[key]
      	// Hash lookup is a constant time operation (1 step under ideal conditions)
      	return row, exists, 1
      }

      // FindRange must perform a full scan of the Hash index because buckets are unsorted
      func (h *HashIndex) FindRange(minKey, maxKey int) ([]Row, int) {
      	var results []Row
      	steps := 0
      	// We must evaluate every bucket in the hash table
      	for key, row := range h.buckets {
      		steps++
      		if key >= minKey && key <= maxKey {
      			results = append(results, row)
      		}
      	}
      	return results, steps
      }

      func main() {
      	numRecords := 10000
      	rand.Seed(time.Now().UnixNano())

      	// Generate unique random keys
      	keysMap := make(map[int]bool)
      	var keys []int
      	for len(keys) < numRecords {
      		k := rand.Intn(100000)
      		if !keysMap[k] {
      			keysMap[k] = true
      			keys = append(keys, k)
      		}
      	}

      	// Initialize BTreeIndex (keys must be sorted)
      	sort.Ints(keys)
      	btree := &BTreeIndex{keys: keys, rows: make([]Row, numRecords)}
      	hashIdx := &HashIndex{buckets: make(map[int]Row)}

      	for i, k := range keys {
      		row := Row{ID: k, Data: fmt.Sprintf("Data_%d", k)}
      		btree.rows[i] = row
      		hashIdx.buckets[k] = row
      	}

      	// Test Point Lookup
      	targetKey := keys[numRecords/2]
      	_, _, btSteps := btree.Find(targetKey)
      	_, _, hashSteps := hashIdx.Find(targetKey)

      	fmt.Printf("--- Point Lookup (Target Key: %d) ---\n", targetKey)
      	fmt.Printf("B-Tree steps: %d (O(log N))\n", btSteps)
      	fmt.Printf("Hash steps:   %d (O(1))\n\n", hashSteps)

      	// Test Range Lookup
      	minKey, maxKey := keys[numRecords/4], keys[numRecords/4+5] // Small range
      	_, btRangeSteps := btree.FindRange(minKey, maxKey)
      	_, hashRangeSteps := hashIdx.FindRange(minKey, maxKey)

      	fmt.Printf("--- Range Query (Min: %d, Max: %d) ---\n", minKey, maxKey)
      	fmt.Printf("B-Tree steps evaluated: %d (Seeks start, then scans sequentially)\n", btRangeSteps)
      	fmt.Printf("Hash steps evaluated:   %d (Requires full table/bucket scan)\n", hashRangeSteps)
      }
---

## The Problem: Data Retrieval Bottlenecks

A database table containing millions of rows is stored on disk across hundreds of thousands of physical pages. When you execute a query filtering records by a specific column, the database engine has no choice but to read every page from disk into memory to check if the filter matches. This causes high CPU and disk I/O load. 

To bypass this cost, databases use **indexes**. An index is an auxiliary data structure that acts as a map, allowing the database to locate rows quickly without scanning the entire table. 

However, not all indexes are built the same way. An index optimized for finding a single record by email might be completely useless for finding customers who registered within a specific date range. Backend engineers must understand the underlying data structures of indexes to choose the right types for their query patterns.

---

## Index Access Mechanics: Clustered vs Non-Clustered

How an index maps back to physical data files dictates its storage layout and search performance:

### Clustered Index (Primary Key Index)
A clustered index determines the physical, sorted order of rows on disk. 
* **Mechanics**: The leaf nodes of a clustered index contain the **actual table data rows**. Because physical disk blocks can only be sorted in a single order, a database table can have **only one** clustered index, which is almost always the table's Primary Key.
* **Benefit**: Range scans on a clustered index are fast because the physical rows reside sequentially next to each other on disk, matching the index order.

### Non-Clustered Index (Secondary Index)
A non-clustered index is a separate structure from the physical table files.
* **Mechanics**: The leaf nodes of a non-clustered index do not contain the actual table data. Instead, they store the indexed column values alongside a **row identifier** (RID) or the clustered index key (Primary Key), which acts as a pointer to the physical row.
* **Benefit**: A table can have dozens of non-clustered indexes. However, querying a column via a non-clustered index requires a two-step lookup: first finding the pointer in the index, then fetching the actual row from the main table file. This second step is known as a **bookmark lookup** or key lookup, which can introduce random disk I/O overhead.

---

## Index Storage Architectures: B-Tree vs Hash

The physical layout of the index structure dictates what query operations it can optimize.

<svg viewBox="0 0 580 300" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="20" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">B-Tree vs Hash Index Storage Structures</text>
  <text x="20" y="45" fill="#a3be8c" font-family="sans-serif" font-size="11" font-weight="bold">1. B-Tree Index (Supports Range Scans via Linked Leaves)</text>
  <rect x="250" y="55" width="40" height="20" rx="3" fill="#3b4252" stroke="#88c0d0" stroke-width="1"/>
  <text x="270" y="68" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">50</text>
  <path d="M 250 75 L 175 95" stroke="#4c566a" stroke-width="1" fill="none"/>
  <path d="M 290 75 L 365 95" stroke="#4c566a" stroke-width="1" fill="none"/>
  <rect x="145" y="95" width="40" height="20" rx="3" fill="#3b4252" stroke="#88c0d0" stroke-width="1"/>
  <text x="165" y="108" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">25</text>
  <rect x="355" y="95" width="40" height="20" rx="3" fill="#3b4252" stroke="#88c0d0" stroke-width="1"/>
  <text x="375" y="108" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">75</text>
  <path d="M 145 115 L 90 135" stroke="#4c566a" stroke-width="1" fill="none"/>
  <path d="M 185 115 L 220 135" stroke="#4c566a" stroke-width="1" fill="none"/>
  <path d="M 355 115 L 310 135" stroke="#4c566a" stroke-width="1" fill="none"/>
  <path d="M 395 115 L 450 135" stroke="#4c566a" stroke-width="1" fill="none"/>
  <rect x="50" y="135" width="70" height="20" rx="3" fill="#2e3440" stroke="#88c0d0" stroke-width="1"/>
  <text x="85" y="148" fill="#d8dee9" font-family="sans-serif" font-size="9" text-anchor="middle">[10, 20]</text>
  <rect x="190" y="135" width="70" height="20" rx="3" fill="#2e3440" stroke="#88c0d0" stroke-width="1"/>
  <text x="225" y="148" fill="#d8dee9" font-family="sans-serif" font-size="9" text-anchor="middle">[30, 45]</text>
  <rect x="280" y="135" width="70" height="20" rx="3" fill="#2e3440" stroke="#88c0d0" stroke-width="1"/>
  <text x="315" y="148" fill="#d8dee9" font-family="sans-serif" font-size="9" text-anchor="middle">[60, 70]</text>
  <rect x="420" y="135" width="70" height="20" rx="3" fill="#2e3440" stroke="#88c0d0" stroke-width="1"/>
  <text x="455" y="148" fill="#d8dee9" font-family="sans-serif" font-size="9" text-anchor="middle">[80, 95]</text>
  <path d="M 120 145 L 190 145" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#arbt)"/>
  <path d="M 260 145 L 280 145" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#arbt)"/>
  <path d="M 350 145 L 420 145" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#arbt)"/>
  <text x="20" y="185" fill="#bf616a" font-family="sans-serif" font-size="11" font-weight="bold">2. Hash Index (Supports O(1) Point Lookups, No Range Scans)</text>
  <text x="50" y="220" fill="#81a1c1" font-family="sans-serif" font-size="9" font-weight="bold">Keys: 10, 20, 75</text>
  <path d="M 130 216 L 180 216" stroke="#81a1c1" stroke-width="1.5" fill="none" marker-end="url(#arbt)"/>
  <text x="155" y="208" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">hash(key)</text>
  <g transform="translate(200, 200)">
    <rect x="0" y="0" width="70" height="18" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
    <text x="35" y="12" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Bucket 0</text>
    <rect x="75" y="0" width="80" height="18" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
    <text x="115" y="12" fill="#4c566a" font-family="sans-serif" font-size="8" text-anchor="middle">empty</text>
    <rect x="0" y="22" width="70" height="18" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
    <text x="35" y="34" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Bucket 1</text>
    <rect x="75" y="22" width="80" height="18" fill="#2e3440" stroke="#88c0d0" stroke-width="1"/>
    <text x="115" y="34" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">20 → Row #2</text>
    <rect x="0" y="44" width="70" height="18" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
    <text x="35" y="56" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Bucket 2</text>
    <rect x="75" y="44" width="80" height="18" fill="#2e3440" stroke="#88c0d0" stroke-width="1"/>
    <text x="115" y="56" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">10 → Row #1</text>
    <rect x="0" y="66" width="70" height="18" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
    <text x="35" y="78" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Bucket 3</text>
    <rect x="75" y="66" width="80" height="18" fill="#2e3440" stroke="#88c0d0" stroke-width="1"/>
    <text x="115" y="78" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">75 → Row #3</text>
  </g>
  <text x="430" y="240" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">No sequential leaf pointers!</text>
  <text x="430" y="255" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">Must scan all buckets for range</text>
  <defs>
    <marker id="arbt" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#a3be8c"/>
    </marker>
  </defs>
</svg>

### 1. B-Tree Index (Balanced Tree)
The default index in most relational databases (such as PostgreSQL, MySQL, and SQLite) is a balanced search tree (specifically a **B+ Tree** variant).
* **Internals**: Keys are sorted in node pages. Non-leaf nodes act as routers directing searches down to the leaf layer. The leaf nodes contain all keys and their row pointers. Crucially, B+ Trees connect all leaf nodes horizontally using a doubly linked list.
* **Complexity**: Lookups, insertions, and deletions cost $O(\log N)$ time.
* **Strengths**: Highly efficient for point lookups, sorting operations (`ORDER BY`), and range queries (e.g. `WHERE age >= 21 AND age <= 35`). Once the leaf pointer for `21` is found using binary search, the database can traverse the linked leaves sequentially to read the remaining records, avoiding further tree traversals.

### 2. Hash Index
A Hash index uses a hash function to map column values directly to array buckets containing pointers to database rows.
* **Complexity**: Point lookups cost $O(1)$ time in the average case.
* **Weaknesses**: Completely unsuitable for range queries or sorting. Because hash functions distribute keys randomly across buckets, there is no spatial or sequential ordering. Querying `WHERE age > 21` on a Hash index forces the engine to bypass the index and scan the entire table.

---

## Index Scan Types

When executing a query, the planner chooses one of several scan pathways:

* **Table Scan / Sequential Scan**: The engine reads every disk page in the physical table heap file from top to bottom.
* **Index Seek**: The engine traverses the index tree structure (from root to leaf) using a search key, reading only the target node pages. This is the fastest way to locate specific rows.
* **Index Scan**: The engine scans the entire index from left to right (traversing the linked leaves of a B+ Tree). While it reads the entire index, this is often faster than a table scan because index files are much smaller than table files.
* **Index-Only Scan (Covering Index)**: A highly optimized index scan. If a query requests only the columns that are already stored within the index structure itself (e.g., `SELECT age FROM users WHERE age > 21` when `age` is indexed), the database reads only the index file. It does not perform key lookups to fetch the physical data row from disk, saving physical disk seeks.

---

## Composite Indexes and the Left-Prefix Rule

A composite index is an index built on multiple columns, such as `CREATE INDEX ON orders (user_id, created_at)`. 

* **The Left-to-Right Rule**: The database sorts the index first by the left-most column (`user_id`), and then sorts rows with identical left values by the next column (`created_at`).
* **Query Match Rules**: A composite index on `(A, B)` can satisfy queries filtering on `A` alone, or `A AND B` together. However, it cannot satisfy a query filtering on `B` alone. This is because values in column `B` are not globally sorted; they are only sorted within the scope of matching values in column `A`.

---

## The Write Penalty

While indexes speed up reads, they introduce a write cost. Every time a row is inserted, updated, or deleted, the database must modify the main table file and update every index defined on that table. 

For B-Trees, this update may force node splits and merges to keep the tree balanced, triggering random disk I/O. Backend systems must avoid over-indexing tables and instead only create indexes that match their application's query profile.

---

## Further Reading

* [The Ubiquitous B-Tree](https://dl.acm.org/doi/10.1145/356770.356776) — Douglas Comer's classic survey explaining the evolution, structure, and variants of B-Trees in database systems.
* [Use The Index, Luke](https://use-the-index-luke.com/) — Markus Winand's guide to database indexing for application developers.
* [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html) — Technical reference detailing standard indexes, including B-Tree, Hash, GiST, GIN, and BRIN.
