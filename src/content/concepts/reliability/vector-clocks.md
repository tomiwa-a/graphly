---
title: Vector Clocks
slug: vector-clocks
summary: "Vector clocks give each node in a distributed system a logical timestamp that captures causal relationships between events, enabling conflict detection without a global clock."
difficulty: advanced
chapterId: reliability
domain: Reliability
estimatedMinutes: 12
prerequisites: [message-queues]
related: [circuit-breakers]
seo_title: "Vector Clocks Explained: Causality, Conflict Detection & CRDTs"
seo_description: "Understand how vector clocks track causal order across distributed nodes, detect concurrent writes, and how systems like DynamoDB and Riak use them for conflict resolution."
canonical_url: "/concepts/vector-clocks"
code_examples:
  - language: python
    title: Vector clock merge and happens-before check
    code: |
      from typing import Dict

      VectorClock = Dict[str, int]

      def merge(a: VectorClock, b: VectorClock) -> VectorClock:
          """Return a new clock with the element-wise maximum of a and b."""
          keys = set(a) | set(b)
          return {k: max(a.get(k, 0), b.get(k, 0)) for k in keys}

      def happens_before(a: VectorClock, b: VectorClock) -> bool:
          """True if a causally precedes b (a -> b)."""
          keys = set(a) | set(b)
          all_leq = all(a.get(k, 0) <= b.get(k, 0) for k in keys)
          at_least_one_lt = any(a.get(k, 0) < b.get(k, 0) for k in keys)
          return all_leq and at_least_one_lt

      def concurrent(a: VectorClock, b: VectorClock) -> bool:
          """True if neither a -> b nor b -> a (potential conflict)."""
          return not happens_before(a, b) and not happens_before(b, a)

      # Two nodes write independently
      write_a = {"A": 2, "B": 1, "C": 0}
      write_b = {"A": 1, "B": 2, "C": 0}

      print(happens_before(write_a, write_b))  # False
      print(happens_before(write_b, write_a))  # False
      print(concurrent(write_a, write_b))       # True — conflict!

      merged = merge(write_a, write_b)
      print(merged)  # {"A": 2, "B": 2, "C": 0}
---

## The problem: no global clock

In a single-machine system, time is easy. The OS gives you a monotonically increasing clock and every event has an unambiguous timestamp.

In a distributed system, you have N machines each with their own hardware clock. Those clocks drift. NTP corrects them, but only approximately, and a correction can even move the clock backward. You cannot trust wall-clock time to tell you which of two writes on different nodes happened first.

This is not an academic concern. When two users edit the same record on two different replicas, and both edits are applied without knowing the order, you get **silent data corruption**.

## Lamport timestamps: the first step

Leslie Lamport's 1978 solution introduces a **logical clock**: a simple counter that does not measure real time, but instead captures a consistent ordering of events.

The rules are:
1. Before each event, increment your local counter.
2. When you send a message, attach your current counter value.
3. When you receive a message, set your counter to `max(local, received) + 1`.

This guarantees: if event A **causally precedes** event B (A's result was used to produce B), then `timestamp(A) < timestamp(B)`.

The limitation: Lamport timestamps are a **total order** but they cannot distinguish causal ordering from coincidence. If two events have timestamps 5 and 7, you know the one with 5 was assigned its timestamp before the one with 7, but you cannot tell whether 5 actually influenced 7 or whether they happened completely independently on different nodes. You need a richer data structure to answer that question.

## Vector clocks: one counter per node

A **vector clock** extends Lamport's idea by keeping one counter per node. Each node maintains a vector like `[A:2, B:1, C:0]` meaning: "I have seen 2 events from A, 1 from B, and 0 from C (or C is unknown to me)."

The update rules are:
1. Before each local event on node X, increment `clock[X]`.
2. When node X sends a message, attach its full vector.
3. When node X receives a message with vector `V`, merge by taking the element-wise max of `V` and the local vector, then increment `clock[X]`.

The vector now encodes what the node knows about every other node's history. If your vector says `B:1`, you know you have received (directly or indirectly) exactly one event from node B.

## Visualising causality and concurrency

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 310" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <defs>
    <marker id="arrowvc" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#81a1c1"/>
    </marker>
    <marker id="arrowconc" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#bf616a"/>
    </marker>
  </defs>
  <!-- Node labels -->
  <text x="80" y="28" font-family="sans-serif" font-size="14" fill="#88c0d0" text-anchor="middle" font-weight="bold">Node A</text>
  <text x="290" y="28" font-family="sans-serif" font-size="14" fill="#88c0d0" text-anchor="middle" font-weight="bold">Node B</text>
  <text x="500" y="28" font-family="sans-serif" font-size="14" fill="#88c0d0" text-anchor="middle" font-weight="bold">Node C</text>
  <!-- Timeline lines -->
  <line x1="80" y1="36" x2="80" y2="295" stroke="#4c566a" stroke-width="2"/>
  <line x1="290" y1="36" x2="290" y2="295" stroke="#4c566a" stroke-width="2"/>
  <line x1="500" y1="36" x2="500" y2="295" stroke="#4c566a" stroke-width="2"/>
  <!-- A: event 1 -->
  <circle cx="80" cy="60" r="8" fill="#a3be8c" stroke="#eceff4" stroke-width="1.2"/>
  <text x="80" y="64" font-family="sans-serif" font-size="9" fill="#2e3440" text-anchor="middle" font-weight="bold">a1</text>
  <text x="10" y="63" font-family="sans-serif" font-size="9" fill="#ebcb8b" text-anchor="middle">[A:1,B:0,C:0]</text>
  <!-- A -> B message -->
  <line x1="88" y1="65" x2="282" y2="110" stroke="#81a1c1" stroke-width="1.3" stroke-dasharray="5,3" marker-end="url(#arrowvc)"/>
  <!-- B: event 1 (receives from A) -->
  <circle cx="290" cy="115" r="8" fill="#a3be8c" stroke="#eceff4" stroke-width="1.2"/>
  <text x="290" y="119" font-family="sans-serif" font-size="9" fill="#2e3440" text-anchor="middle" font-weight="bold">b1</text>
  <text x="360" y="118" font-family="sans-serif" font-size="9" fill="#ebcb8b" text-anchor="middle">[A:1,B:1,C:0]</text>
  <!-- A: event 2 -->
  <circle cx="80" cy="155" r="8" fill="#a3be8c" stroke="#eceff4" stroke-width="1.2"/>
  <text x="80" y="159" font-family="sans-serif" font-size="9" fill="#2e3440" text-anchor="middle" font-weight="bold">a2</text>
  <text x="10" y="158" font-family="sans-serif" font-size="9" fill="#ebcb8b" text-anchor="middle">[A:2,B:0,C:0]</text>
  <!-- B: event 2 (independent, no message from A yet) -->
  <circle cx="290" cy="155" r="8" fill="#a3be8c" stroke="#eceff4" stroke-width="1.2"/>
  <text x="290" y="159" font-family="sans-serif" font-size="9" fill="#2e3440" text-anchor="middle" font-weight="bold">b2</text>
  <text x="360" y="158" font-family="sans-serif" font-size="9" fill="#ebcb8b" text-anchor="middle">[A:1,B:2,C:0]</text>
  <!-- Concurrent writes label -->
  <line x1="88" y1="155" x2="282" y2="155" stroke="#bf616a" stroke-width="1.2" stroke-dasharray="4,2" marker-end="url(#arrowconc)"/>
  <line x1="282" y1="160" x2="88" y2="160" stroke="#bf616a" stroke-width="1.2" stroke-dasharray="4,2" marker-end="url(#arrowconc)"/>
  <text x="185" y="145" font-family="sans-serif" font-size="10" fill="#bf616a" text-anchor="middle">concurrent (conflict!)</text>
  <!-- B -> C message -->
  <line x1="298" y1="162" x2="492" y2="205" stroke="#81a1c1" stroke-width="1.3" stroke-dasharray="5,3" marker-end="url(#arrowvc)"/>
  <!-- C: event 1 (receives from B) -->
  <circle cx="500" cy="210" r="8" fill="#a3be8c" stroke="#eceff4" stroke-width="1.2"/>
  <text x="500" y="214" font-family="sans-serif" font-size="9" fill="#2e3440" text-anchor="middle" font-weight="bold">c1</text>
  <text x="548" y="213" font-family="sans-serif" font-size="9" fill="#ebcb8b" text-anchor="middle">[A:1,B:2,C:1]</text>
  <!-- Legend -->
  <rect x="30" y="270" width="12" height="12" rx="2" fill="#a3be8c"/>
  <text x="48" y="281" font-family="sans-serif" font-size="10" fill="#d8dee9">Event</text>
  <line x1="100" y1="276" x2="120" y2="276" stroke="#81a1c1" stroke-width="1.3" stroke-dasharray="5,3"/>
  <text x="128" y="281" font-family="sans-serif" font-size="10" fill="#d8dee9">Message carries clock</text>
  <line x1="295" y1="276" x2="315" y2="276" stroke="#bf616a" stroke-width="1.3" stroke-dasharray="4,2"/>
  <text x="323" y="281" font-family="sans-serif" font-size="10" fill="#d8dee9">Concurrent writes</text>
</svg>

In the diagram, `a2` on node A and `b2` on node B are **concurrent**: neither has received a message from the other before writing. Their vector clocks (`[A:2,B:0,C:0]` and `[A:1,B:2,C:0]`) are **incomparable**: neither is element-wise less than or equal to the other. That incomparability is the signal of a conflict.

## Happens-before vs concurrent

Formally, event X **happens-before** Y (written X -> Y) if:
* Every component of X's vector clock is less than or equal to Y's corresponding component, **and**
* At least one component is strictly less than Y's.

If neither `X -> Y` nor `Y -> X` holds, the events are **concurrent**. They may have produced conflicting writes to the same key.

## Conflict detection in real systems

**Amazon DynamoDB** (original design, documented in the 2007 Dynamo paper) used vector clocks to detect concurrent writes to the same key. When two concurrent versions of a record were detected, the system stored both and returned them as **siblings** to the application. The application code was responsible for merging them. In practice this was hard to get right, so DynamoDB later switched to last-write-wins with a physical timestamp as the default.

**Riak** (a distributed key-value store descended from the Dynamo design) still exposes siblings when siblings are enabled. Applications can implement custom merge logic, which is the correct approach for collaborative document editing or shopping carts where both writes may contain valid data.

## Modern alternative: CRDTs

**Conflict-free Replicated Data Types (CRDTs)** sidestep the conflict problem by choosing data structures that always produce a deterministic merge result, regardless of the order in which concurrent writes are applied.

Examples:
* **G-Counter** (Grow-only counter): each node maintains its own counter and the total is the sum. Incrementing on any node is always safe.
* **LWW-Register** (Last-Write-Wins Register): whichever write has the highest timestamp wins. Simple, but loses data.
* **OR-Set** (Observed-Remove Set): add and remove operations are tagged with unique identifiers. The set can be merged without ambiguity.

CRDTs are used in collaborative text editors (Figma, Notion), distributed counters (CDN edge caches), and eventually-consistent databases. The tradeoff is that not every data structure has a CRDT equivalent, and some CRDT semantics are surprising (e.g. a deletion may reappear after a merge).

## Scalability limit: dotted version vectors

Plain vector clocks grow linearly with the number of nodes. In a cluster of 500 machines, every version vector is 500 integers. This becomes expensive in memory and on the wire.

**Dotted version vectors** are a practical compression used by Riak and other systems. They separate the causal context (what you know about the whole cluster) from the specific version dot (which exact event produced this value), allowing compaction without losing causality information.

## Code example

```python
from typing import Dict

VectorClock = Dict[str, int]

def merge(a: VectorClock, b: VectorClock) -> VectorClock:
    """Return a new clock with the element-wise maximum of a and b."""
    keys = set(a) | set(b)
    return {k: max(a.get(k, 0), b.get(k, 0)) for k in keys}

def happens_before(a: VectorClock, b: VectorClock) -> bool:
    """True if a causally precedes b (a -> b)."""
    keys = set(a) | set(b)
    all_leq = all(a.get(k, 0) <= b.get(k, 0) for k in keys)
    at_least_one_lt = any(a.get(k, 0) < b.get(k, 0) for k in keys)
    return all_leq and at_least_one_lt

def concurrent(a: VectorClock, b: VectorClock) -> bool:
    """True if neither a -> b nor b -> a (potential conflict)."""
    return not happens_before(a, b) and not happens_before(b, a)

# Two nodes write independently
write_a = {"A": 2, "B": 1, "C": 0}
write_b = {"A": 1, "B": 2, "C": 0}

print(happens_before(write_a, write_b))  # False
print(happens_before(write_b, write_a))  # False
print(concurrent(write_a, write_b))       # True — conflict!

merged = merge(write_a, write_b)
print(merged)  # {"A": 2, "B": 2, "C": 0}
```

`merge` takes the element-wise max to produce the most up-to-date combined view of the system. `happens_before` implements the formal definition: all components must be <=, with at least one strictly <. When `concurrent` returns `True`, the application must resolve the conflict explicitly.

## Further Reading

* [Time, Clocks, and the Ordering of Events in a Distributed System (Lamport, 1978)](https://lamport.azurewebsites.net/pubs/time-clocks.pdf)
* [Dynamo: Amazon's Highly Available Key-value Store (DeCandia et al., 2007)](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)
* [Riak Documentation: Vector Clocks](https://docs.riak.com/riak/kv/latest/learn/concepts/causal-context/)
* [A comprehensive study of Convergent and Commutative Replicated Data Types (Shapiro et al., 2011)](https://inria.hal.science/inria-00555588)
* [Basho Blog: Why Vector Clocks are Hard](https://riak.com/posts/technical/why-vector-clocks-are-hard/)
