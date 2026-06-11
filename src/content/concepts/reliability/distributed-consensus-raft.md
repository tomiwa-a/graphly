---
title: Distributed Consensus & Raft
slug: distributed-consensus-raft
summary: "The Raft consensus algorithm enables a cluster of machines to operate as a single, highly available state machine by electing a leader and replicating a consistent log of events."
difficulty: advanced
chapterId: reliability
domain: Reliability & Scale
estimatedMinutes: 20
prerequisites: [vector-clocks]
related: [database-replication]
seo_title: "Raft Consensus Algorithm: Distributed State Machine Replication"
seo_description: "Learn the Raft consensus algorithm, terms, leader elections, and log replication safety invariants for reliable distributed systems."
canonical_url: "/concepts/distributed-consensus-raft"
citations:
  - title: "In Search of an Understandable Consensus Algorithm"
    author: "Diego Ongaro and John Ousterhout"
    chapter: "Section 5: The Raft Consensus Algorithm"
    page_range: "305-320"
    external_link: "https://raft.github.io/raft.pdf"
code_examples:
  - language: go
    title: "Raft Leader Election State Machine"
    code: |
      package main

      import (
          "math/rand"
          "sync"
          "time"
      )

      type NodeState int

      const (
          Follower NodeState = iota
          Candidate
          Leader
      )

      type VoteRequest struct {
          Term         int
          CandidateID  int
          LastLogIndex int
          LastLogTerm  int
      }

      type VoteResponse struct {
          Term        int
          VoteGranted bool
      }

      type Heartbeat struct {
          Term     int
          LeaderID int
      }

      type RaftNode struct {
          mu        sync.Mutex
          id        int
          state     NodeState
          currentTerm int
          votedFor  int
          peers     []int
          votesRecv int

          electionTimeout time.Duration
          electionTimer   *time.Timer
          heartbeatTicker *time.Ticker

          stateChanged chan struct{}
      }

      func NewRaftNode(id int, peers []int) *RaftNode {
          n := &RaftNode{
              id:           id,
              state:        Follower,
              currentTerm:  0,
              votedFor:     -1,
              peers:        peers,
              stateChanged: make(chan struct{}, 10),
          }
          n.resetElectionTimeout()
          go n.run()
          return n
      }

      func (n *RaftNode) resetElectionTimeout() {
          rand.Seed(time.Now().UnixNano() + int64(n.id))
          timeout := time.Duration(150+rand.Intn(150)) * time.Millisecond
          n.electionTimeout = timeout
          if n.electionTimer != nil {
              n.electionTimer.Stop()
          }
          n.electionTimer = time.NewTimer(timeout)
      }

      func (n *RaftNode) run() {
          for {
              n.mu.Lock()
              state := n.state
              n.mu.Unlock()

              switch state {
              case Follower:
                  select {
                  case <-n.electionTimer.C:
                      n.mu.Lock()
                      n.transitionToCandidate()
                      n.mu.Unlock()
                  case <-n.stateChanged:
                  }
              case Candidate:
                  select {
                  case <-n.electionTimer.C:
                      n.mu.Lock()
                      n.startElection()
                      n.mu.Unlock()
                  case <-n.stateChanged:
                  }
              case Leader:
                  select {
                  case <-n.heartbeatTicker.C:
                      n.sendHeartbeats()
                  case <-n.stateChanged:
                  }
              }
          }
      }

      func (n *RaftNode) transitionToCandidate() {
          n.state = Candidate
          n.startElection()
      }

      func (n *RaftNode) startElection() {
          n.currentTerm++
          n.votedFor = n.id
          n.votesRecv = 1
          n.resetElectionTimeout()

          term := n.currentTerm
          id := n.id

          for _, peer := range n.peers {
              go func(peerID int) {
                  req := VoteRequest{
                      Term:        term,
                      CandidateID: id,
                  }
                  res := n.sendRequestVote(peerID, req)
                  if res.VoteGranted {
                      n.mu.Lock()
                      defer n.mu.Unlock()
                      if n.state == Candidate && n.currentTerm == term {
                          n.votesRecv++
                          if n.votesRecv > (len(n.peers)+1)/2 {
                              n.transitionToLeader()
                          }
                      }
                  } else if res.Term > term {
                      n.mu.Lock()
                      defer n.mu.Unlock()
                      n.currentTerm = res.Term
                      n.transitionToFollower()
                  }
              }(peer)
          }
      }

      func (n *RaftNode) transitionToLeader() {
          n.state = Leader
          if n.electionTimer != nil {
              n.electionTimer.Stop()
          }
          n.heartbeatTicker = time.NewTicker(50 * time.Millisecond)
          n.stateChanged <- struct{}{}
      }

      func (n *RaftNode) transitionToFollower() {
          n.state = Follower
          n.votedFor = -1
          if n.heartbeatTicker != nil {
              n.heartbeatTicker.Stop()
          }
          n.resetElectionTimeout()
          n.stateChanged <- struct{}{}
      }

      func (n *RaftNode) HandleHeartbeat(hb Heartbeat) {
          n.mu.Lock()
          defer n.mu.Unlock()

          if hb.Term >= n.currentTerm {
              n.currentTerm = hb.Term
              if n.state != Follower {
                  n.transitionToFollower()
              } else {
                  n.resetElectionTimeout()
              }
          }
      }

      func (n *RaftNode) sendRequestVote(peerID int, req VoteRequest) VoteResponse {
          return VoteResponse{Term: n.currentTerm, VoteGranted: true}
      }

      func (n *RaftNode) sendHeartbeats() {}
---

## The Consensus Problem in Distributed Systems

In a single-node system, preserving data consistency is straightforward, the server decides what happens and when. In a distributed system consisting of multiple independent nodes, this becomes a fundamental challenge. Networks are unreliable, packets are delayed or dropped, nodes crash without warning, and temporary network partitions isolate subsets of nodes.

The **consensus problem** is the task of getting a cluster of independent nodes to agree on a sequence of state changes. If the nodes cannot agree, different replicas will drift, resulting in data corruption and split-brain scenarios where separate parts of the cluster accept conflicting writes.

To resolve this, systems rely on **State Machine Replication** (SMR). The core principle is that if all nodes start in the identical initial state, and apply the exact same sequence of input commands in the same order, they will arrive at the same final state. Consensus algorithms like Raft and Paxos exist to ensure that all replicas agree on the exact contents and ordering of this replicated log.

## Cluster Quorums and Fault Tolerance

Distributed consensus algorithms do not require all nodes in a cluster to be online to progress. Instead, they rely on a **quorum**, which is a strict majority of the nodes.

If a cluster has `N` members, a quorum is defined as:

`Quorum = (N / 2) + 1`

To survive `F` node failures, the cluster must contain at least `2F + 1` members.
* A cluster of 3 nodes can tolerate 1 failure, since a quorum of 2 nodes remains active.
* A cluster of 5 nodes can tolerate 2 failures, since a quorum of 3 nodes remains active.

Using a majority quorum ensures that even during a network partition, only one partition can contain a majority of nodes. The partition containing the minority will fail to form a quorum and refuse to accept updates, preventing conflicting states from being written to different halves of the network.

## Raft Node States and Term Epochs

Raft divides time into **terms** of arbitrary length, which act as logical clocks. Terms are numbered with consecutive integers. Each term begins with a leader election. If a leader wins, it coordinates the cluster for the remainder of that term. If an election results in a split vote, the term ends, and a new term begins immediately with another election.

At any given moment, a Raft node exists in one of three states:
1. **Follower**: Passive nodes that only respond to incoming requests from other nodes. If followers receive no communication within an election timeout, they transition to Candidates.
2. **Candidate**: Active nodes trying to win an election. They increment the term counter, vote for themselves, and broadcast vote requests to all other nodes.
3. **Leader**: The single active coordinator of the cluster. The leader handles all client writes, replicates log entries, and sends periodic heartbeats to assert authority.

## Diagram: Raft State Transitions

The following state machine details how nodes transition between Follower, Candidate, and Leader roles:

<svg viewBox="0 0 580 250" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="24" font-family="sans-serif" font-size="14" fill="#88c0d0" text-anchor="middle" font-weight="bold">Raft Node State Transitions</text>
  <rect x="40" y="80" width="120" height="60" rx="8" fill="#2e3440" stroke="#81a1c1" stroke-width="2"/>
  <text x="100" y="110" font-family="sans-serif" font-size="12" fill="#eceff4" text-anchor="middle" font-weight="bold">Follower</text>
  <text x="100" y="125" font-family="sans-serif" font-size="9" fill="#81a1c1" text-anchor="middle">Responds to RPCs</text>
  <rect x="230" y="80" width="120" height="60" rx="8" fill="#2e3440" stroke="#ebcb8b" stroke-width="2"/>
  <text x="290" y="110" font-family="sans-serif" font-size="12" fill="#eceff4" text-anchor="middle" font-weight="bold">Candidate</text>
  <text x="290" y="125" font-family="sans-serif" font-size="9" fill="#81a1c1" text-anchor="middle">Requests votes</text>
  <rect x="420" y="80" width="120" height="60" rx="8" fill="#2e3440" stroke="#a3be8c" stroke-width="2"/>
  <text x="480" y="110" font-family="sans-serif" font-size="12" fill="#eceff4" text-anchor="middle" font-weight="bold">Leader</text>
  <text x="480" y="125" font-family="sans-serif" font-size="9" fill="#81a1c1" text-anchor="middle">Sends heartbeats</text>
  <path d="M 160 95 L 230 95" stroke="#ebcb8b" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="195" y="88" font-family="sans-serif" font-size="8" fill="#ebcb8b" text-anchor="middle">Timeout</text>
  <path d="M 350 95 L 420 95" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="385" y="88" font-family="sans-serif" font-size="8" fill="#a3be8c" text-anchor="middle">Majority Votes</text>
  <path d="M 450 140 C 370 200, 210 200, 130 140" stroke="#81a1c1" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="290" y="195" font-family="sans-serif" font-size="9" fill="#81a1c1" text-anchor="middle">Discovers higher term (new leader)</text>
  <path d="M 260 140 C 230 160, 170 160, 140 140" stroke="#81a1c1" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="195" y="165" font-family="sans-serif" font-size="8" fill="#81a1c1" text-anchor="middle">New leader / term</text>
  <path d="M 270 80 C 270 50, 310 50, 310 80" stroke="#ebcb8b" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="290" y="45" font-family="sans-serif" font-size="8" fill="#ebcb8b" text-anchor="middle">Election Timeout</text>
  <defs>
    <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#81a1c1"/>
    </marker>
  </defs>
</svg>

## The Raft Protocol Phases

Raft organizes consensus into two distinct, sequential phases:

### Phase 1: Leader Election
Nodes begin as Followers. Each node runs a randomized **election timeout** (typically between 150ms and 300ms). If a follower hears nothing from a leader before its timer expires:
1. It transition to Candidate.
2. It increments its term counter and votes for itself.
3. It sends a `RequestVote` RPC to its peers.
4. If it receives votes from a majority of nodes in the cluster, it becomes the Leader.

The timeout randomization is crucial. It ensures that nodes rarely time out at the exact same instant, avoiding split votes where no candidate receives a majority.

### Phase 2: Log Replication
Once a leader is elected, it begins serving clients:
1. A client sends a write command to the leader.
2. The leader appends the command to its local log as an uncommitted entry.
3. The leader sends an `AppendEntries` RPC to all followers.
4. Followers write the entry to their local logs and acknowledge receipt.
5. Once a majority of followers acknowledge, the leader commits the entry, applies it to its local state machine, and returns success to the client.
6. The leader notifies followers of the commit status in subsequent heartbeats, prompting them to apply the command to their state machines.

## Core Safety Invariants

To guarantee absolute correctness, Raft enforces five core safety properties:
* **Election Safety**: At most one leader can be elected per term.
* **Leader Append-Only**: A leader never overwrites or truncates its own log entries, it only appends new ones.
* **Log Matching**: If two logs contain an entry with the identical index and term, they are guaranteed to be identical up to that index.
* **Leader Completeness**: If a log entry is committed in a given term, that entry will be present in the logs of the leaders for all higher-numbered terms. Candidates whose logs are less up-to-date than a follower's log will be denied that follower's vote.
* **State Machine Safety**: If a server has applied a log entry at a given index to its state machine, no other server will ever apply a different log entry for the same index.

## Cluster Membership Changes and Log Compaction

Real-world clusters must occasionally add or remove nodes and prevent logs from growing indefinitely:
* **Joint Consensus**: During configuration changes (adding or removing nodes), Raft uses a two-phase joint consensus configuration mechanism to prevent split-brain states where two independent majorities could be formed under the old and new configurations.
* **Log Compaction**: Raft prevents log bloat through snapshotting. Each node periodically saves its current state to disk and discards the log entries leading up to that state. If a follower lags too far behind, the leader sends the raw snapshot via an `InstallSnapshot` RPC instead of incremental log entries.

## Further Reading

* [In Search of an Understandable Consensus Algorithm (Original Raft Paper)](https://raft.github.io/raft.pdf)
* [Raft Consensus Algorithm Interactive Visualization](https://raft.github.io/)
* [Designing Data-Intensive Applications by Martin Kleppmann](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/)
