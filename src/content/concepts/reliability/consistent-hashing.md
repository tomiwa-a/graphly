---
title: Consistent Hashing
slug: consistent-hashing
summary: "Consistent hashing is a partitioning strategy that maps keys and nodes to a circular hash ring, ensuring that adding or removing servers only reassigns a small fraction of keys."
difficulty: intermediate
chapterId: reliability
domain: Reliability & Scale
estimatedMinutes: 12
prerequisites: [hash-functions]
related: [database-sharding, caching-strategies]
seo_title: "Consistent Hashing: Designing Resilient Partitioned Systems"
seo_description: "Learn how consistent hashing rings and virtual nodes prevent massive cache invalidation during node scaling in distributed systems."
canonical_url: "/concepts/consistent-hashing"
citations:
  - title: "Consistent Hashing and Random Trees: Distributed Caching Protocols for Relieving Hot Spots on the World Wide Web"
    author: "David Karger, Eric Lehman, Tom Leighton, Rina Panigrahy, Matthew Levine, and Daniel Lewin"
    chapter: "Section 3: Consistent Hashing Protocols"
    page_range: "55-66"
    external_link: "https://dl.acm.org/doi/10.1145/258533.258590"
code_examples:
  - language: go
    title: "Consistent Hash Ring with Virtual Nodes and Binary Search"
    code: |
      package main

      import (
          "fmt"
          "hash/fnv"
          "sort"
          "strconv"
      )

      type HashRing struct {
          vnodes      int
          ring        []uint32
          nodeMap     map[uint32]string
          physicalMap map[string]bool
      }

      func NewHashRing(vnodes int) *HashRing {
          return &HashRing{
              vnodes:      vnodes,
              nodeMap:     make(map[uint32]string),
              physicalMap: make(map[string]bool),
          }
      }

      func (h *HashRing) hash(key string) uint32 {
          hasher := fnv.New32a()
          hasher.Write([]byte(key))
          return hasher.Sum32()
      }

      func (h *HashRing) AddNode(node string) {
          if h.physicalMap[node] {
              return
          }
          h.physicalMap[node] = true

          for i := 0; i < h.vnodes; i++ {
              vnodeName := node + "#" + strconv.Itoa(i)
              vnodeHash := h.hash(vnodeName)
              h.ring = append(h.ring, vnodeHash)
              h.nodeMap[vnodeHash] = node
          }
          sort.Slice(h.ring, func(i, j int) bool {
              return h.ring[i] < h.ring[j]
          })
      }

      func (h *HashRing) RemoveNode(node string) {
          if !h.physicalMap[node] {
              return
          }
          delete(h.physicalMap, node)

          newRing := make([]uint32, 0, len(h.ring)-h.vnodes)
          for _, vnodeHash := range h.ring {
              if h.nodeMap[vnodeHash] == node {
                  delete(h.nodeMap, vnodeHash)
              } else {
                  newRing = append(newRing, vnodeHash)
              }
          }
          h.ring = newRing
      }

      func (h *HashRing) GetNode(key string) string {
          if len(h.ring) == 0 {
              return ""
          }

          keyHash := h.hash(key)
          
          idx := sort.Search(len(h.ring), func(i int) bool {
              return h.ring[i] >= keyHash
          })

          if idx == len(h.ring) {
              idx = 0
          }

          return h.nodeMap[h.ring[idx]]
      }

      func main() {
          hr := NewHashRing(50)
          hr.AddNode("node-a")
          hr.AddNode("node-b")
          hr.AddNode("node-c")

          keys := []string{"user_123", "session_abc", "image_999"}
          for _, key := range keys {
              fmt.Printf("Key '%s' routes to: %s\n", key, hr.GetNode(key))
          }
      }
---

## The Modulo Hashing Limitation

In a partitioned system (like a sharded database or a distributed cache cluster), we need a predictable way to map a data key to a specific server node.

A simple, intuitive way to do this is modulo hashing:

`server_index = hash(key) % N`

Where `N` is the number of active servers in the cluster. While this works well in static environments, it fails catastrophically when the cluster scales:
* If we add a server (changing the pool size to `N + 1`), the formula becomes `hash(key) % (N + 1)`.
* If a server crashes (reducing the pool size to `N - 1`), the formula becomes `hash(key) % (N - 1)`.

Because the divisor changes, almost every key in the system hashes to a completely different server index. In a caching cluster, this causes a mass cache invalidation event (near 100% cache miss rate), flooding the database origin server with traffic. In a database sharding context, it requires migrating nearly all data across the network to different physical nodes.

## The Consistent Hashing Ring Concept

**Consistent hashing** solves this scaling problem. Instead of mapping keys directly to a fixed index, consistent hashing maps both servers and data keys to a shared circular space called the **hash ring**.

Typically, this ring is modeled as a 360-degree circle corresponding to a 32-bit unsigned integer space (from `0` to `2^32 - 1`):
1. **Hash the Servers**: Each physical server's identifier (like its hostname or IP) is passed through a hash function, producing a 32-bit value. This value maps the server to a specific position on the ring.
2. **Hash the Keys**: When a request arrives, the target key is passed through the same hash function, mapping the key to a position on the same ring.
3. **Route the Keys**: To find the owner server for a key, the system starts at the key's position on the ring and moves clockwise until it encounters the first server node. That server is designated the owner of the key.

## Diagram: Consistent Hashing Ring

The following diagram demonstrates a 3-node consistent hashing ring and clockwise routing of data keys:

<svg viewBox="0 0 580 320" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="24" font-family="sans-serif" font-size="14" fill="#88c0d0" text-anchor="middle" font-weight="bold">The Consistent Hashing Ring</text>
  <circle cx="290" cy="170" r="90" fill="none" stroke="#4c566a" stroke-width="3"/>
  <circle cx="290" cy="80" r="10" fill="#a3be8c" stroke="#2e3440" stroke-width="2"/>
  <text x="290" y="65" font-family="sans-serif" font-size="10" fill="#a3be8c" text-anchor="middle" font-weight="bold">Node A</text>
  <circle cx="368" cy="215" r="10" fill="#88c0d0" stroke="#2e3440" stroke-width="2"/>
  <text x="390" y="230" font-family="sans-serif" font-size="10" fill="#88c0d0" text-anchor="middle" font-weight="bold">Node B</text>
  <circle cx="212" cy="215" r="10" fill="#ebcb8b" stroke="#2e3440" stroke-width="2"/>
  <text x="190" y="230" font-family="sans-serif" font-size="10" fill="#ebcb8b" text-anchor="middle" font-weight="bold">Node C</text>
  <circle cx="340" cy="110" r="5" fill="#eceff4"/>
  <text x="360" y="105" font-family="sans-serif" font-size="9" fill="#eceff4">Key 1</text>
  <path d="M 342 115 A 85 85 0 0 1 368 205" fill="none" stroke="#eceff4" stroke-dasharray="2,2" stroke-width="1.5" marker-end="url(#arrow)"/>
  <circle cx="240" cy="110" r="5" fill="#eceff4"/>
  <text x="220" y="105" font-family="sans-serif" font-size="9" fill="#eceff4">Key 2</text>
  <path d="M 240 110 A 85 85 0 0 1 280 82" fill="none" stroke="#eceff4" stroke-dasharray="2,2" stroke-width="1.5" marker-end="url(#arrow)"/>
  <circle cx="270" cy="250" r="5" fill="#eceff4"/>
  <text x="270" y="265" font-family="sans-serif" font-size="9" fill="#eceff4">Key 3</text>
  <path d="M 270 250 A 85 85 0 0 1 220 223" fill="none" stroke="#eceff4" stroke-dasharray="2,2" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="460" y="150" font-family="sans-serif" font-size="9" fill="#81a1c1" width="100">
    <tspan x="460" dy="0">Keys map to ring</tspan>
    <tspan x="460" dy="12">and route clockwise</tspan>
    <tspan x="460" dy="12">to the nearest node.</tspan>
  </text>
  <defs>
    <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#eceff4"/>
    </marker>
  </defs>
</svg>

## Scaling Mechanics: Server Adds and Removes

Consistent hashing dramatically improves scaling efficiency:
* **Adding a Node**: If we add Node D, it is mapped to a position on the ring. The only keys affected are those located immediately counter-clockwise of Node D's position (which previously routed to Node D's clockwise neighbor). All other keys remain assigned to their existing nodes.
* **Removing a Node**: If Node B fails, only the keys that previously routed to Node B must be reassigned to the next clockwise node (Node C). The rest of the key distribution is unaffected.

When scaling a cluster of size `N`, adding or removing a server only triggers re-mapping for roughly `1 / N` of the total keys, preventing massive system invalidations.

## Mitigating Hotspots with Virtual Nodes

A basic consistent hashing ring has a major limitation, data skew. Because physical servers are hashed randomly, they are rarely spaced uniformly on the ring. One node might end up owning a massive segment of the ring while another node owns a tiny sliver, resulting in hotspotting where one node receives the bulk of traffic.

To solve this, systems introduce **virtual nodes** (vnodes):
* Instead of hashing a physical node once, the system hashes the node multiple times with different suffixes (e.g. `node-a#1`, `node-a#2`, `node-a#3`).
* This maps hundreds of virtual positions per physical server across the ring.
* The ring is populated by these interleaved vnodes. When a key routes to a vnode, the request is forwarded to the corresponding physical node.

Using vnodes blends the ownership boundaries, guaranteeing a uniform distribution of keys and load balancing across all physical servers.

## Real-World Distributed Implementations

Consistent hashing is the foundation of many distributed architectures:
* **Apache Cassandra**: Uses consistent hashing (via the Murmur3Partitioner) to distribute rows across database nodes in its cluster ring.
* **Amazon DynamoDB**: Coordinates partition keys across storage nodes using a consistent hashing ring.
* **Memcached**: Many client libraries use consistent hashing (specifically the Ketama algorithm) to ensure client-side key routing remains stable when adding cache servers.

## Implementation details: Binary Search Lookup

In software, the hash ring is not represented as a circular data structure. Instead, it is implemented using a **sorted array** of virtual node hash tokens and a hash map:
1. When nodes are added, their token hashes are computed and appended to an array.
2. The array is sorted in ascending order.
3. A hash map links each token hash back to its parent physical node name.
4. To route a key, the system computes `keyHash` and runs a **binary search** (bisect) on the sorted array to find the first token hash index that is greater than or equal to `keyHash`.
5. If the binary search index reaches the end of the array, the search wraps around to index `0` (circular boundary).
6. The key maps to the physical node corresponding to that token.

## Further Reading

* [Consistent Hashing and Random Trees (Original STOC 1997 Paper)](https://dl.acm.org/doi/10.1145/258533.258590)
* [Dynamo: Amazon's Highly Available Key-value Store](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)
* [Cassandra Architecture: Data Partitioning](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html#partitioning)
