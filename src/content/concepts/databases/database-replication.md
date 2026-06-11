---
title: Database Replication
slug: database-replication
summary: "Learn database replication topologies, synchronization trade-offs, handling replication lag, leader failover, and quorum-based leaderless writes."
difficulty: intermediate
chapterId: databases
domain: Databases
estimatedMinutes: 15
prerequisites: [change-data-capture]
related: [acid-transactions-isolation]
seo_title: "Database Replication: Topologies, Lag, and Quorums"
seo_description: "Explore database replication structures including single-leader, multi-leader, and leaderless layouts, replication lag, failover protocols, and quorum math."
canonical_url: "/concepts/database-replication"
code_examples:
  - language: go
    title: Dynamo-Style Sloppy Quorum and Hinted Handoff Simulator
    code: |
      package main

      import (
          "fmt"
          "sync"
          "time"
      )

      type WritePayload struct {
          Key   string
          Value string
      }

      type Hint struct {
          TargetNode string
          Payload    WritePayload
          Timestamp  time.Time
      }

      type Node struct {
          Name      string
          Reachable bool
          Data      map[string]string
          mu        sync.Mutex
      }

      func (n *Node) Write(key, val string) bool {
          n.mu.Lock()
          defer n.mu.Unlock()
          if !n.Reachable {
              return false
          }
          n.Data[key] = val
          return true
      }

      type Cluster struct {
          Nodes       []*Node
          N           int
          W           int
          R           int
          HintStorage map[string][]Hint
          mu          sync.Mutex
      }

      func NewCluster(nodeNames []string, w, r int) *Cluster {
          nodes := make([]*Node, len(nodeNames))
          for i, name := range nodeNames {
              nodes[i] = &Node{
                  Name:      name,
                  Reachable: true,
                  Data:      make(map[string]string),
              }
          }
          return &Cluster{
              Nodes:       nodes,
              N:           len(nodeNames),
              W:           w,
              R:           r,
              HintStorage: make(map[string][]Hint),
          }
      }

      func (c *Cluster) Write(key, val string) error {
          payload := WritePayload{Key: key, Value: val}
          var wg sync.WaitGroup
          confirmations := 0
          var confMu sync.Mutex

          for _, node := range c.Nodes {
              wg.Add(1)
              go func(n *Node) {
                  defer wg.Done()
                  if success := n.Write(key, val); success {
                      confMu.Lock()
                      confirmations++
                      confMu.Unlock()
                  }
              }(node)
          }
          wg.Wait()

          if confirmations >= c.W {
              fmt.Printf("Strict write quorum met: %d/%d confirmations\n", confirmations, c.W)
              return nil
          }

          fmt.Printf("Strict write quorum failed (%d/%d). Attempting Sloppy Quorum...\n", confirmations, c.W)
          
          activeWrites := confirmations
          for _, node := range c.Nodes {
              if activeWrites >= c.W {
                  break
              }
              
              node.mu.Lock()
              isReachable := node.Reachable
              node.mu.Unlock()

              if !isReachable {
                  for _, backupNode := range c.Nodes {
                      if backupNode.Name == node.Name {
                          continue
                      }
                      backupNode.mu.Lock()
                      backupReachable := backupNode.Reachable
                      backupNode.mu.Unlock()

                      if backupReachable {
                          c.mu.Lock()
                          c.HintStorage[backupNode.Name] = append(c.HintStorage[backupNode.Name], Hint{
                              TargetNode: node.Name,
                              Payload:    payload,
                              Timestamp:  time.Now(),
                          })
                          c.mu.Unlock()
                          
                          fmt.Printf("Stored hint on backup node %s for target offline node %s\n", backupNode.Name, node.Name)
                          activeWrites++
                          break
                      }
                  }
              }
          }

          if activeWrites >= c.W {
              fmt.Printf("Sloppy write quorum met: %d/%d confirmations (including hints)\n", activeWrites, c.W)
              return nil
          }

          return fmt.Errorf("write failed: failed to satisfy sloppy quorum (%d/%d)", activeWrites, c.W)
      }

      func (c *Cluster) RecoverNode(nodeName string) {
          var targetNode *Node
          for _, node := range c.Nodes {
              if node.Name == nodeName {
                  targetNode = node
                  break
              }
          }
          if targetNode == nil {
              return
          }

          targetNode.mu.Lock()
          targetNode.Reachable = true
          targetNode.mu.Unlock()
          fmt.Printf("Node %s has recovered and is online\n", nodeName)

          c.mu.Lock()
          defer c.mu.Unlock()

          for backupName, hints := range c.HintStorage {
              var activeHints []Hint
              for _, hint := range hints {
                  if hint.TargetNode == nodeName {
                      success := targetNode.Write(hint.Payload.Key, hint.Payload.Value)
                      if success {
                          fmt.Printf("Replayed hint from %s to %s for key: %s\n", backupName, nodeName, hint.Payload.Key)
                      } else {
                          activeHints = append(activeHints, hint)
                      }
                  } else {
                      activeHints = append(activeHints, hint)
                  }
              }
              c.HintStorage[backupName] = activeHints
          }
      }
---

## The Concept

In database systems, **replication** is the practice of keeping copies of the same data on multiple physically separate machines (nodes) connected via a network. Replication provides two primary benefits:
1. **High Availability**: If one machine crashes, another can take over, preventing system downtime.
2. **Scalability**: Multiple machines can serve read queries, allowing the system to handle higher read volume than a single node could support.

However, distributing updates across multiple nodes introduces synchronization, network latency, and consistency challenges.

```xml
<svg viewBox="0 0 580 380" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="24" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Replication Lag and Consistency Anomalies</text>
  <line x1="120" y1="80" x2="120" y2="340" stroke="#4c566a" stroke-width="1"/>
  <line x1="320" y1="80" x2="320" y2="340" stroke="#4c566a" stroke-width="1"/>
  <line x1="480" y1="80" x2="480" y2="340" stroke="#4c566a" stroke-width="1"/>
  <text x="120" y="72" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Leader</text>
  <text x="320" y="72" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Replica B (Fast)</text>
  <text x="480" y="72" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Replica C (Lagged)</text>
  <rect x="10" y="90" width="80" height="25" rx="3" fill="#2e3440" stroke="#88c0d0"/>
  <text x="50" y="106" fill="#88c0d0" font-family="sans-serif" font-size="9" text-anchor="middle">Client A</text>
  <path d="M 90 102 L 120 102" stroke="#eceff4" stroke-width="1.2" marker-end="url(#arr)"/>
  <text x="105" y="96" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">Write X=1</text>
  <path d="M 120 115 L 320 135" stroke="#a3be8c" stroke-width="1.2" marker-end="url(#arr-green)"/>
  <text x="220" y="120" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">Sync (Replicated)</text>
  <path d="M 120 115 L 480 280" stroke="#bf616a" stroke-width="1.2" stroke-dasharray="3,3" marker-end="url(#arr-red)"/>
  <text x="300" y="190" fill="#bf616a" font-family="sans-serif" font-size="8" text-anchor="middle">Replication Lag (Delayed)</text>
  <path d="M 90 155 L 320 155" stroke="#eceff4" stroke-width="1.2" marker-end="url(#arr)"/>
  <text x="200" y="150" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">Read X (returns X=1)</text>
  <text x="200" y="165" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">Consistent Read</text>
  <rect x="10" y="210" width="80" height="25" rx="3" fill="#2e3440" stroke="#ebcb8b"/>
  <text x="50" y="226" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle">Client B</text>
  <path d="M 90 222 L 480 222" stroke="#eceff4" stroke-width="1.2" marker-end="url(#arr)"/>
  <text x="285" y="217" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">Read X (returns X=null)</text>
  <text x="285" y="232" fill="#bf616a" font-family="sans-serif" font-size="8" text-anchor="middle">Anomaly: Read-After-Write violation</text>
  <path d="M 90 255 L 320 255" stroke="#eceff4" stroke-width="1.2" marker-end="url(#arr)"/>
  <text x="205" y="250" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">1st Read (returns X=1)</text>
  <path d="M 90 310 L 480 310" stroke="#eceff4" stroke-width="1.2" marker-end="url(#arr)"/>
  <text x="285" y="305" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">2nd Read (returns X=null)</text>
  <text x="285" y="322" fill="#bf616a" font-family="sans-serif" font-size="8" text-anchor="middle">Anomaly: Monotonic Reads violation</text>
  <defs>
    <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#eceff4"/>
    </marker>
    <marker id="arr-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#a3be8c"/>
    </marker>
    <marker id="arr-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#bf616a"/>
    </marker>
  </defs>
</svg>
```

---

## Practical Analogy

Think of replication topologies as different office reporting structures:

* **Single-Leader** is like a manager typing out a master report and printing out physical copies to distribute to their staff members. The team can read the report, but if they want to modify it, they must send their changes to the manager first, who updates the master version and distributes the changes.
* **Multi-Leader** is like two separate regional directors in different time zones updating their local region spreadsheets independently. Every evening, they email their spreadsheets to each other and merge the changes, having to reconcile conflicts when they both edit the same row.
* **Leaderless (Dynamo-Style)** is like a cooperative team of five workers where there is no boss. If you want to log a task, you write it on three of the boards yourself. If someone wants to verify the log, they check three of the boards to make sure they get the most up-to-date entry.

---

## Replication Topologies

Databases write data using one of three replication patterns:

### 1. Single-Leader (Primary-Replica)
All write requests are sent to a designated **leader** (or primary) node. The leader writes the new data to local storage and sends the update to all **replicas** (followers) as a replication log. Replicas only serve read queries, which makes scaling read traffic simple.

### 2. Multi-Leader (Active-Active)
Common in multi-datacenter deployments. Each datacenter houses a leader node. Clients write to their local leader, which asynchronously replicates updates to leaders in other datacenters. This setup survives datacenter outages, but it introduces the complexity of **conflict resolution**.

### 3. Leaderless (Dynamo-Style)
Popularized by Amazon Dynamo, Cassandra, and Riak. There is no leader node. Clients write directly to multiple replicas. The system uses quorum voting to decide if a write is successful.

---

## Synchronous vs Asynchronous Replication

Replicating updates to followers can happen in two ways:
* **Synchronous**: The leader waits for confirmations from the replicas before reporting success to the client. This guarantees that all nodes are in sync and prevents data loss on leader failure, but it adds network latency and blocks writes if a replica offline.
* **Asynchronous**: The leader writes the update locally and immediately reports success to the client. Replicas are updated in the background. This minimizes latency, but if the leader crashes before updates reach the replicas, data is lost.
Many systems configure a hybrid setup (e.g. one synchronous follower and multiple asynchronous followers) to balance durability and write performance.

---

## Replication Lag & Consistency Anomalies

In asynchronous systems, followers eventually catch up to the leader. The time delay between a write to the leader and its appearance on a replica is called **replication lag**. Large replication lag causes consistency anomalies:

* **Read-After-Write (Read-Your-Own-Writes) Consistency**: Guaranteed when a user is assured they will always see updates they submitted themselves. If a user posts a comment and the subsequent page refresh reads from a lagged replica, the comment disappears. To prevent this, the system routes reads for user-owned records back to the leader.
* **Monotonic Reads**: Guarantees that a user will not see data regress in time. If a user queries lagged Replica C, refreshes, and hits even more lagged Replica D, their view of the database goes backward. To enforce this, the client is pinned to session-specific replicas (e.g. hashed by user ID).
* **Consistent Prefix Reads**: Guarantees that if a sequence of writes occurs in a specific order, anyone reading the data will see them in that same order. In partitioned databases, different partitions replicate independently, which can cause replies to appear before the original questions.

---

## Leader Election, Failover, and Transport

If the leader node goes offline, the system must perform **failover**:
1. Replicas detect the leader is down (usually via heartbeat timeouts).
2. A new leader is chosen through a consensus vote or designated by a controller.
3. The load balancer is updated to route writes to the new leader.

### Failover Hazards
* **Split-Brain**: Occurs when two nodes believe they are the active leader. Both accept writes, causing divergent databases. Fencing tokens (monotonically increasing epoch numbers) are used to reject writes from the old, demoted leader.
* **Replication Transport**: Replicas sync using different payload types:
  * **Statement-Based**: The leader sends raw SQL strings (e.g. `INSERT INTO users...`). This fails if query functions are non-deterministic (e.g. `NOW()` or `RAND()`).
  * **Write-Ahead Log (WAL) Shipping**: The leader sends raw byte blocks written to disk. This is highly efficient but tightly couples the leader and replicas to the same database version.
  * **Logical Replication**: The leader sends high-level logical records (e.g. updated column values for a specific primary key). This decouples the wire format from internal storage, allowing rolling upgrades.

---

## Quorum-Based Replication Math

In a leaderless system, read and write operations query a subset of nodes.
Let:
* `N` = The total number of replica nodes in the cluster.
* `W` = The number of nodes that must confirm a write for it to succeed.
* `R` = The number of nodes queried during a read.

To guarantee that a read operation always returns the most up-to-date write, we must satisfy the strict quorum inequality:
`W + R > N`

This inequality ensures that the set of nodes written to and the set of nodes read from overlap by at least one node. That overlapping node contains the newest write version, which is identified using write timestamps.

### Sloppy Quorums and Hinted Handoff
Under network partitions, a client may be unable to reach `W` primary nodes assigned to a key. If the system values availability over strict consistency, it accepts writes on healthy backup nodes outside the key's primary group. These backups write **hints** to their local storage indicating where the data belongs. Once the partition heals, the backup replays the hints to the primary node (**hinted handoff**).

---

## Further Reading

* [Dynamo: Amazon’s Highly Available Key-value Store](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) — Seminal paper introducing leaderless quorums and hinted handoffs
* [Designing Data-Intensive Applications](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/) — Chapter 5: Replication
* [PostgreSQL Documentation: High Availability and Replication](https://www.postgresql.org/docs/current/high-availability.html) — Technical details of WAL and logical replication
* [Distributed Systems: Principles and Paradigms](https://www.pearson.com/en-us/subject-catalog/p/distributed-systems/P200000003254) — Section on replication and consistency models
