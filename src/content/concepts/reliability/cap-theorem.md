---
title: CAP Theorem
slug: cap-theorem
summary: "Why distributed databases cannot simultaneously guarantee consistency, availability, and partition tolerance during a network split."
difficulty: intermediate
chapterId: reliability
domain: Reliability & Scale
estimatedMinutes: 12
prerequisites: [database-replication]
related: [sql-vs-nosql, horizontal-vs-vertical-scaling]
seo_title: "CAP Theorem in Distributed Systems: CP vs AP Explained"
seo_description: "Understand the CAP Theorem and how distributed databases trade consistency (C) for availability (A) during network partitions (P). Learn about PACELC and Raft."
canonical_url: "/concepts/cap-theorem"
citations:
  - title: "Towards Robust Distributed Systems"
    author: "Eric A. Brewer"
    chapter: "Proceedings of the Annual ACM Symposium on Principles of Distributed Computing (PODC)"
    page_range: "7-10"
    external_link: "https://dl.acm.org/doi/10.1145/343477.343502"
  - title: "Brewer's Conjecture and the Feasibility of Consistent, Available, Partition-tolerant Web Services"
    author: "Seth Gilbert & Nancy Lynch"
    chapter: "ACM SIGACT News"
    page_range: "51-59"
    external_link: "https://dl.acm.org/doi/10.1145/564585.564601"
code_examples:
  - language: go
    title: "Distributed Key-Value Node Simulating AP (Local Write) vs CP (Quorum Check) under Partition"
    code: |
      package main

      import (
          "errors"
          "fmt"
      )

      type Node struct {
          ID          int
          Data        map[string]string
          Peers       map[int]*Node
          Partitioned bool
      }

      type Cluster struct {
          Nodes map[int]*Node
      }

      func NewCluster() *Cluster {
          c := &Cluster{Nodes: make(map[int]*Node)}
          for i := 1; i <= 3; i++ {
              c.Nodes[i] = &Node{
                  ID:    i,
                  Data:  make(map[string]string),
                  Peers: make(map[int]*Node),
              }
          }
          // Connect peers
          for i, n := range c.Nodes {
              for j, peer := range c.Nodes {
                  if i != j {
                      n.Peers[j] = peer
                  }
              }
          }
          return c
      }

      // Simulates a network partition separating Node 3 from Nodes 1 and 2
      func (c *Cluster) PartitionNode3() {
          c.Nodes[3].Partitioned = true
          // Mark peers on Node 3 as partitioned
          for _, peer := range c.Nodes[3].Peers {
              peer.Partitioned = true
          }
      }

      // AP Write: Accepts write locally on node, returns success immediately
      func (n *Node) WriteAP(key, value string) error {
          n.Data[key] = value
          fmt.Printf("[AP Mode] Node %d accepted local write: %s=%s\n", n.ID, key, value)
          return nil
      }

      // CP Write: Requires quorum (W > N/2) across reachable peers before succeeding
      func (n *Node) WriteCP(key, value string) error {
          nodesTotal := len(n.Peers) + 1
          quorumNeeded := (nodesTotal / 2) + 1
          successfulWrites := 1 // write locally first
          
          n.Data[key] = value

          for id, peer := range n.Peers {
              // If node or target peer is partitioned, replicate write fails
              if n.Partitioned || peer.Partitioned {
                  fmt.Printf("[CP Mode] Node %d failed to replicate write to Node %d (partitioned)\n", n.ID, id)
                  continue
              }
              peer.Data[key] = value
              successfulWrites++
          }

          if successfulWrites < quorumNeeded {
              // Rollback local change if quorum fails
              delete(n.Data, key)
              return errors.New("write failed: quorum unreachable due to network partition")
          }

          fmt.Printf("[CP Mode] Node %d achieved quorum write (%d/%d instances verified)\n", n.ID, successfulWrites, quorumNeeded)
          return nil
      }

      func main() {
          // Initialize a 3-node cluster
          cluster := NewCluster()

          fmt.Println("--- Normal Operation (No Partition) ---")
          // CP write succeeds because all nodes are reachable (3/3 nodes succeed)
          err := cluster.Nodes[3].WriteCP("key1", "val1")
          fmt.Printf("CP Write result: %v\n\n", err)

          fmt.Println("--- Network Partition: Node 3 Isolated ---")
          cluster.PartitionNode3()

          // AP Write succeeds on Node 3 despite being partitioned
          err = cluster.Nodes[3].WriteAP("key2", "val2")
          fmt.Printf("AP Write result: %v\n\n", err)

          // CP Write fails on Node 3 because it cannot reach quorum
          err = cluster.Nodes[3].WriteCP("key3", "val3")
          fmt.Printf("CP Write result: %v\n", err)
      }
---

## The Foundations of CAP: Three Distributed Guarantees

The **CAP Theorem** states that any distributed data store can only guarantee two out of three system properties at the same time:

* **Consistency (C)**: Specifically **linearizability**. Every read request receives the most recent write or returns an error. The system acts as if there is only a single copy of the data, even if it is replicated across multiple geographic regions.
* **Availability (A)**: Every non-failing node in the cluster returns a non-error response for every request. It does not guarantee that the returned data is the most recent write, only that the node is active and responsive.
* **Partition Tolerance (P)**: The system continues to function despite any number of communication drops or delayed messages between nodes in the network.

---

## The Tradeoff: Partitions are Inevitable

In a perfect physical network where fibers never break and routers never drop packets, you could have all three properties. However, physical hardware is imperfect. Network partitions are a reality of distributed systems. A network partition occurs when communication between two or more nodes in a cluster fails while both groups remain individually functional.

Therefore, the choice is not "choose two out of three". The actual tradeoff is: **when a network partition (P) occurs, will your system choose Consistency (CP) or Availability (AP)?**

<svg viewBox="0 0 580 260" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <rect x="50" y="80" width="100" height="50" rx="6" fill="#3b4252" stroke="#88c0d0" stroke-width="2"/>
  <text x="100" y="105" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Node A</text>
  <text x="100" y="120" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Val = "X"</text>
  <rect x="330" y="50" width="100" height="50" rx="6" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="380" y="75" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">Node B</text>
  <text x="380" y="90" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Val = "X"</text>
  <rect x="330" y="130" width="100" height="50" rx="6" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="380" y="155" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">Node C</text>
  <text x="380" y="170" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Val = "X"</text>
  <path d="M 10 105 L 40 105" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#ar1)"/>
  <text x="25" y="98" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">Write "Y"</text>
  <path d="M 240 20 L 220 80 L 250 140 L 210 200 L 240 240" stroke="#bf616a" stroke-width="3" fill="none"/>
  <text x="230" y="15" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">Network Partition (P)</text>
  <path d="M 160 95 L 320 80" stroke="#bf616a" stroke-width="1.5" stroke-dasharray="2" fill="none"/>
  <text x="235" y="75" fill="#bf616a" font-family="sans-serif" font-size="8" text-anchor="middle" transform="rotate(-5, 235, 75)">Blocked</text>
  <rect x="30" y="195" width="220" height="45" rx="4" fill="#3b4252" stroke="#ebcb8b" stroke-width="1"/>
  <text x="140" y="212" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">AP Choice (Availability)</text>
  <text x="140" y="228" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">Accept write local. Reads from B/C return stale "X"</text>
  <rect x="300" y="195" width="250" height="45" rx="4" fill="#3b4252" stroke="#a3be8c" stroke-width="1"/>
  <text x="425" y="212" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">CP Choice (Consistency)</text>
  <text x="425" y="228" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">Reject write since quorum is unreachable. Return error.</text>
  <defs>
    <marker id="ar1" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#a3be8c"/>
    </marker>
  </defs>
</svg>

---

## CP Systems: Prioritizing Consistency Over Availability

In a **CP system**, when a network partition cuts off communication, the system halts writes or returns errors on the isolated nodes.

If the client attempts to write `Value Y` to `Node A`, but `Node A` cannot reach `Node B` or `Node C` to replicate the update, the system rejects the write. This prevents data divergence. If a client subsequently queries `Node B` or `Node C`, they will read the correct, albeit old, value of the system (`Value X`), and the system preserves consistency.

This model is common in systems that manage financial accounts or inventory ledgers where duplicate or diverging records are unacceptable.

* **Examples**: Google Spanner, Etcd, and ZooKeeper. These databases use consensus protocols (like Paxos or Raft) requiring a majority quorum (`W > N/2`) to accept any writes.

---

## AP Systems: Prioritizing Availability Over Consistency

In an **AP system**, nodes accept writes locally even when partitioned from the rest of the cluster.

If a partition isolates `Node A`, it will accept `Value Y` and immediately return a success response to the client. During the partition, if a different client queries `Node B` or `Node C`, they will get the stale `Value X`. The system is fully available, but it is inconsistent.

Once the partition heals, the nodes resolve conflicts using strategies like:

* **Last-Write-Wins (LWW)**: Using timestamp metadata to overwrite older data, though this is sensitive to clock drift.
* **Vector Clocks**: Tracking version histories to detect and flag conflicts for application-level resolution.
* **CRDTs (Conflict-free Replicated Data Types)**: Merging sets or registers mathematically (such as shopping carts) without manual intervention.

* **Examples**: Apache Cassandra, Amazon DynamoDB, and Couchbase.

---

## Beyond CAP: The PACELC Theorem

The CAP Theorem only focuses on how a system behaves during network failures. However, network splits are rare. The **PACELC Theorem** extends CAP by describing how a database operates under normal, healthy network conditions:

* If there is a **Partition (P)**, how does the system trade off **Availability (A)** and **Consistency (C)**?
* **Else (E)** (when the network is running normally), how does the system trade off **Latency (L)** and **Consistency (C)**?

For instance, MongoDB is a **PC/EC** system. During a partition, it sacrifices availability to preserve consistency. When running normally, it forces clients to wait for replication acknowledgments, prioritizing consistency over low latency. Cassandra is a **PA/EL** system. It prioritizes availability during partitions, and trades off consistency for low latency by returning local read results immediately during normal operations.

---

## Real-World Implementation and Consensus Limits

A common misconception is that a database is strictly CP or AP. In practice, modern databases are highly configurable.

For example, in Cassandra, developers can tune consistency levels on a per-query basis. A client can write using `QUORUM` consistency, requiring a majority of nodes to acknowledge, and read using `QUORUM` consistency. This configuration provides consistency (`R + W > N`) at the cost of latency. If the client writes using `ONE` and reads using `ONE`, the system operates with low latency but exhibits eventual consistency.

---

## Further Reading

- [Towards Robust Distributed Systems](https://dl.acm.org/doi/10.1145/343477.343502) — Eric Brewer's landmark presentation at the 2000 PODC symposium.
- [Brewer's Conjecture and the Feasibility of Consistent, Available, Partition-tolerant Web Services](https://dl.acm.org/doi/10.1145/564585.564601) — The formal mathematical proof of the CAP theorem by Seth Gilbert and Nancy Lynch.
- [PACELC Theorem](https://en.wikipedia.org/wiki/PACELC_theorem) — Detailed overview of how latency and consistency are traded off in distributed databases.
