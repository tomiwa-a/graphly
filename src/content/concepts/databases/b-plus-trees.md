---
title: B+ Trees
slug: b-plus-trees
summary: "Understand the structural design, traversal efficiency, write mutation mechanics, and concurrency structures of B+ Tree database indexes."
difficulty: advanced
chapterId: databases
domain: Databases
estimatedMinutes: 18
prerequisites: [indexes]
related: [lsm-trees, mmap-page-cache, wal-aries-recovery]
seo_title: "B+ Tree Indexes: Architecture, Splits, and Concurrency | Graphly"
seo_description: "Explore the internal architecture of B+ Tree index structures. Learn how search, insertions, splits, and latch crabbing concurrency manage relational database storage."
canonical_url: "/concepts/b-plus-trees"
citations:
  - title: "Database Management Systems"
    author: "Raghu Ramakrishnan and Johannes Gehrke"
    chapter: "Chapter 10: Tree-Structured Indexing"
    page_range: "338-372"
    external_link: "https://pages.cs.wisc.edu/~dbbook/"
  - title: "Database System Concepts"
    author: "Abraham Silberschatz, Henry F. Korth, and S. Sudarshan"
    chapter: "Chapter 14: Indexing"
    page_range: "625-650"
    external_link: "https://db-book.com/"
code_examples:
  - language: go
    title: In-Memory B+ Tree Search, Insertion, and Page Split Logic
    code: |
      package main

      import (
      	"fmt"
      	"sort"
      )

      // MaxKeys defines the order (M) of our B+ Tree node capacity.
      // A node splits when it exceeds this threshold.
      const MaxKeys = 3

      // Node represents a generic B+ Tree node.
      type Node interface {
      	isLeaf() bool
      }

      // InternalNode routes queries down the tree but stores no raw data.
      type InternalNode struct {
      	keys     []int
      	children []Node
      }

      func (n *InternalNode) isLeaf() bool { return false }

      // LeafNode stores key-value pairs and links horizontally to its siblings.
      type LeafNode struct {
      	keys []int
      	vals []string
      	next *LeafNode
      	prev *LeafNode
      }

      func (n *LeafNode) isLeaf() bool { return true }

      // BPlusTree coordinates operations and tracks the root node.
      type BPlusTree struct {
      	root Node
      }

      // NewBPlusTree creates an empty tree initialized with a leaf root.
      func NewBPlusTree() *BPlusTree {
      	return &BPlusTree{
      		root: &LeafNode{
      			keys: make([]int, 0),
      			vals: make([]string, 0),
      		},
      	}
      }

      // Search traverses the tree to retrieve a key's associated value.
      func (t *BPlusTree) Search(key int) (string, bool) {
      	curr := t.root
      	for !curr.isLeaf() {
      		internal := curr.(*InternalNode)
      		idx := sort.Search(len(internal.keys), func(i int) bool {
      			return internal.keys[i] > key
      		})
      		curr = internal.children[idx]
      	}
      	leaf := curr.(*LeafNode)
      	idx := sort.SearchInts(leaf.keys, key)
      	if idx < len(leaf.keys) && leaf.keys[idx] == key {
      		return leaf.vals[idx], true
      	}
      	return "", false
      }

      // Insert adds a key-value record to the tree, triggering node splits as needed.
      func (t *BPlusTree) Insert(key int, val string) {
      	newKey, newChild, split := t.insert(t.root, key, val)
      	if split {
      		// Root split requires establishing a new parent internal node.
      		t.root = &InternalNode{
      			keys:     []int{newKey},
      			children: []Node{t.root, newChild},
      		}
      	}
      }

      func (t *BPlusTree) insert(node Node, key int, val string) (int, Node, bool) {
      	if node.isLeaf() {
      		leaf := node.(*LeafNode)
      		idx := sort.SearchInts(leaf.keys, key)
      		
      		// If key exists, overwrite the value
      		if idx < len(leaf.keys) && leaf.keys[idx] == key {
      			leaf.vals[idx] = val
      			return 0, nil, false
      		}

      		// Insert key-value pair in sorted position
      		leaf.keys = append(leaf.keys, 0)
      		leaf.vals = append(leaf.vals, "")
      		copy(leaf.keys[idx+1:], leaf.keys[idx:])
      		copy(leaf.vals[idx+1:], leaf.vals[idx:])
      		leaf.keys[idx] = key
      		leaf.vals[idx] = val

      		if len(leaf.keys) > MaxKeys {
      			return t.splitLeaf(leaf)
      		}
      		return 0, nil, false
      	}

      	internal := node.(*InternalNode)
      	idx := sort.Search(len(internal.keys), func(i int) bool {
      		return internal.keys[i] > key
      	})

      	splitKey, childNode, split := t.insert(internal.children[idx], key, val)
      	if split {
      		// Insert split key and reference child in internal node
      		internal.keys = append(internal.keys, 0)
      		internal.children = append(internal.children, nil)
      		copy(internal.keys[idx+1:], internal.keys[idx:])
      		copy(internal.children[idx+2:], internal.children[idx+1:])
      		internal.keys[idx] = splitKey
      		internal.children[idx+1] = childNode

      		if len(internal.keys) > MaxKeys {
      			return t.splitInternal(internal)
      		}
      	}
      	return 0, nil, false
      }

      // splitLeaf divides a LeafNode when capacity limit is breached.
      func (t *BPlusTree) splitLeaf(leaf *LeafNode) (int, Node, bool) {
      	mid := len(leaf.keys) / 2
      	sibling := &LeafNode{
      		keys: append([]int(nil), leaf.keys[mid:]...),
      		vals: append([]string(nil), leaf.vals[mid:]...),
      		next: leaf.next,
      		prev: leaf,
      	}
      	if leaf.next != nil {
      		leaf.next.prev = sibling
      	}
      	leaf.next = sibling
      	leaf.keys = leaf.keys[:mid]
      	leaf.vals = leaf.vals[:mid]

      	// Bubble up the smallest key in the right sibling leaf node
      	return sibling.keys[0], sibling, true
      }

      // splitInternal divides an InternalNode when keys exceed thresholds.
      func (t *BPlusTree) splitInternal(internal *InternalNode) (int, Node, bool) {
      	mid := len(internal.keys) / 2
      	promoteKey := internal.keys[mid]

      	sibling := &InternalNode{
      		keys:     append([]int(nil), internal.keys[mid+1:]...),
      		children: append([]Node(nil), internal.children[mid+1:]...),
      	}

      	internal.keys = internal.keys[:mid]
      	internal.children = internal.children[:mid+1]

      	return promoteKey, sibling, true
      }

      func main() {
      	tree := NewBPlusTree()
      	keys := []int{10, 20, 5, 15, 30, 25}
      	for _, k := range keys {
      		tree.Insert(k, fmt.Sprintf("val-%d", k))
      	}

      	for _, k := range keys {
      		val, found := tree.Search(k)
      		fmt.Printf("Key: %d, Val: %s, Found: %t\n", k, val, found)
      	}
      }
---

## The Concept

In database storage design, reading data from disk is the primary performance bottleneck. While in-memory operations take nanoseconds, retrieving a block from a spinning hard disk or solid-state drive (SSD) takes milliseconds or microseconds. To minimize these expensive disk I/O operations, databases structure their indexes using **B+ Trees**.

A B+ Tree is a self-balancing search tree adapted to block storage environments. Unlike binary search trees, which have a fan-out of two, a B+ Tree has a very large fan-out, often holding hundreds or thousands of child references per node. This minimizes the height of the tree, ensuring that even in a database with billions of rows, a target record can be located in three or four disk page lookups.

Unlike standard B-Trees, which store keys and data records across all levels, a B+ Tree strictly separates routing metadata from raw data records. This structural optimization makes range queries highly efficient and maximizes cache utility.

---

## B+ Tree Architecture

A B+ Tree consists of three distinct types of nodes: the root node, internal routing nodes, and leaf nodes. All nodes are sized to fit exactly within one or more operating system page boundaries, typically 4KB to 16KB, to prevent partial page write alignment penalties.

<svg viewBox="0 0 580 250" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="20" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">B+ Tree Structural Architecture</text>
  <rect x="240" y="35" width="100" height="25" rx="3" fill="#3b4252" stroke="#88c0d0" stroke-width="1.5"/>
  <text x="290" y="51" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Root: [ 20 | 50 ]</text>
  <path d="M 250 60 L 140 100" stroke="#81a1c1" stroke-width="1.5" fill="none"/>
  <path d="M 290 60 L 290 100" stroke="#81a1c1" stroke-width="1.5" fill="none"/>
  <path d="M 330 60 L 440 100" stroke="#81a1c1" stroke-width="1.5" fill="none"/>
  <rect x="100" y="100" width="80" height="25" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="140" y="116" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Internal: [ 10 ]</text>
  <rect x="250" y="100" width="80" height="25" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="290" y="116" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Internal: [ 35 ]</text>
  <rect x="400" y="100" width="80" height="25" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="440" y="116" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Internal: [ 65 ]</text>
  <path d="M 115 125 L 65 165" stroke="#4c566a" stroke-width="1" fill="none"/>
  <path d="M 165 125 L 145 165" stroke="#4c566a" stroke-width="1" fill="none"/>
  <path d="M 265 125 L 225 165" stroke="#4c566a" stroke-width="1" fill="none"/>
  <path d="M 315 125 L 305 165" stroke="#4c566a" stroke-width="1" fill="none"/>
  <path d="M 415 125 L 385 165" stroke="#4c566a" stroke-width="1" fill="none"/>
  <path d="M 465 125 L 465 165" stroke="#4c566a" stroke-width="1" fill="none"/>
  <rect x="30" y="165" width="70" height="25" rx="3" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="65" y="181" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Leaf: [ 5, 8 ]</text>
  <rect x="110" y="165" width="70" height="25" rx="3" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="145" y="181" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Leaf: [ 10, 15 ]</text>
  <rect x="190" y="165" width="70" height="25" rx="3" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="225" y="181" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Leaf: [ 20, 30 ]</text>
  <rect x="270" y="165" width="70" height="25" rx="3" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="305" y="181" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Leaf: [ 35, 45 ]</text>
  <rect x="350" y="165" width="70" height="25" rx="3" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="385" y="181" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Leaf: [ 50, 60 ]</text>
  <rect x="430" y="165" width="70" height="25" rx="3" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="465" y="181" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Leaf: [ 65, 70 ]</text>
  <path d="M 100 177 L 110 177" stroke="#ebcb8b" stroke-width="1" fill="none" marker-end="url(#ar)"/>
  <path d="M 110 177 L 100 177" stroke="#ebcb8b" stroke-width="1" fill="none" marker-end="url(#ar)"/>
  <path d="M 180 177 L 190 177" stroke="#ebcb8b" stroke-width="1" fill="none" marker-end="url(#ar)"/>
  <path d="M 190 177 L 180 177" stroke="#ebcb8b" stroke-width="1" fill="none" marker-end="url(#ar)"/>
  <path d="M 260 177 L 270 177" stroke="#ebcb8b" stroke-width="1" fill="none" marker-end="url(#ar)"/>
  <path d="M 270 177 L 260 177" stroke="#ebcb8b" stroke-width="1" fill="none" marker-end="url(#ar)"/>
  <path d="M 340 177 L 350 177" stroke="#ebcb8b" stroke-width="1" fill="none" marker-end="url(#ar)"/>
  <path d="M 350 177 L 340 177" stroke="#ebcb8b" stroke-width="1" fill="none" marker-end="url(#ar)"/>
  <path d="M 420 177 L 430 177" stroke="#ebcb8b" stroke-width="1" fill="none" marker-end="url(#ar)"/>
  <path d="M 430 177 L 420 177" stroke="#ebcb8b" stroke-width="1" fill="none" marker-end="url(#ar)"/>
  <defs>
    <marker id="ar" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
      <path d="M0,0 L0,4 L4,2 z" fill="#ebcb8b"/>
    </marker>
  </defs>
  <text x="290" y="215" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Horizontal links connect leaf nodes (yellow lines) for high-speed sequential scans.</text>
</svg>

### Internal Routing Nodes vs Leaf Nodes
The structural layout differs significantly between internal levels and leaf levels:
* **Internal Nodes**: Store routing keys and child page address pointers. They do not hold raw row data. Because they hold only index metadata, their capacity is high. A single 8KB internal page can contain thousands of child pointers, facilitating rapid branching.
* **Leaf Nodes**: Store key-value pairs (the actual row data or pointers to data files) along with pointers to both the left and right sibling leaves. These sibling links form a doubly linked list, enabling the database to perform high-speed sequential range scans (`WHERE age >= 21 AND age <= 35`) entirely within the leaf layer, bypassing any need to traverse up or down the parent nodes.

---

## B+ Tree Operations

### Search Operations
To search for a key, the database executes a binary search within the current node starting at the root. The search returns the location of the highest key that is less than or equal to the target. The search follows the corresponding child pointer down to the next level. This process repeats recursively until reaching a leaf node, where another binary search determines if the target key is present.

### Insertion and Page Splits
When inserting a key, the database traverses down to the target leaf node. If the leaf has available capacity, the key is inserted in sorted order. If the leaf is full, the node must be split to maintain balance:
1. A new leaf node is allocated.
2. The elements of the full leaf node are divided. The lower half remains in the original leaf, while the upper half is moved to the new leaf.
3. The smallest key of the new leaf is copied (promoted) up to the parent internal node to serve as a routing boundary.
4. Sibling pointers are updated to link the new leaf into the leaf sequence.

If the parent internal node is also full, it splits in turn. In this case, the middle key is moved (rather than copied) up to the grandparent node. If the root node splits, a new root node is created, increasing the height of the tree by one. Because all splits propagate upward, a B+ Tree remains balanced: every leaf node is always the exact same distance from the root.

---

## Engineering Trade-offs

### Fan-Out and OS Page Alignment
The performance of a database index is determined by the number of disk accesses required to read nodes. The number of accesses is bounded by the height of the tree. The tree height depends on the node capacity:

Height = `O(log`<sub>`B`</sub> `N)`

Here, `B` represents the branch factor (fan-out), and `N` is the total number of records. By maximizing the fan-out, we minimize the tree height. 

To maximize the branching factor `B`, index nodes are designed to match OS memory page boundaries, typically 4KB or 8KB. Since database systems perform disk reads and writes in blocks, keeping node structures aligned with these boundaries prevents write amplification. Write amplification occurs when writing a single byte requires reading, modifying, and rewriting multiple physical disk blocks.

### Latch Crabbing Concurrency
When multiple threads query and update a B+ Tree concurrently, they must coordinate access using locks (commonly called **latches** in database contexts to distinguish them from transaction locks). Without coordination, a search thread could read a page while an insertion thread is splitting it, causing pointers to point to invalid memory.

To prevent this corruption without blocking the entire tree, databases implement **latch crabbing**:
1. When traversing down the tree, a thread acquires a shared latch on the parent node.
2. The thread then acquires a latch on the child node.
3. If the child node is safe (cannot split during insertion, or cannot merge during deletion), the thread releases (unpin) the latch on the parent node. This resembles a crab crawling down the tree.

For write operations:
* The thread acquires exclusive locks down the path.
* If a child is safe, the thread releases all exclusive locks on the ancestors. 
* This localizes locks to only the sub-tree undergoing modification, allowing other reader threads to query unrelated sections of the index.

### B+ Trees vs LSM Trees
Modern databases choose index structures based on workload patterns:

* **B+ Trees**: Optimized for read-heavy workloads and range queries. Reads require a constant number of disk page accesses (typically 3 or 4). However, write mutations require random disk writes to update leaf pages, which can degrade performance on write-heavy systems.
* **LSM Trees** (Log-Structured Merge Trees): Optimized for write throughput. Writes are appended sequentially to an in-memory buffer, which is periodically flushed to sequential files on disk. Range queries and random reads are slower, as they must search across multiple disk files (SSTables) and reconcile updates.

---

## Further Reading

* [B-Trees and Database Indexes Explained](https://planetscale.com/blog/btrees-and-database-indexes) — PlanetScale's exploration of B-tree layout and mechanics.
* [latch crabbing in B+ Trees](https://15445.courses.cs.cmu.edu/fall2022/slides/09-indexconcurrency.pdf) — Carnegie Mellon University's database slides detailing latch concurrency.
* [Modern B-Tree Techniques](https://paperhub.s3.amazonaws.com/d94943f651b72e50529853a890d20d74.pdf) — Goetz Graefe's comprehensive survey of B-tree optimizations and concurrency strategies.
