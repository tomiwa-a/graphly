---
title: Distributed Locking
slug: distributed-locking
summary: "Understand how distributed locks prevent race conditions across multi-node services, and how fencing tokens prevent out-of-order writes during garbage collection pauses."
difficulty: advanced
chapterId: reliability
domain: Reliability
estimatedMinutes: 15
prerequisites: [distributed-consensus-raft, concurrency-primitives]
related: [distributed-transactions-sagas]
seo_title: "Distributed Locking: Redlock, Leases, and Fencing Tokens"
seo_description: "Deep dive into distributed locking patterns, why single-node locks fail, etcd vs Redis Redlock, and how fencing tokens guarantee correctness under garbage collection pauses."
canonical_url: "/concepts/distributed-locking"
citations:
  - title: "How to Do Distributed Locking"
    author: "Martin Kleppmann"
    chapter: "Self-published"
    page_range: "N/A"
    external_link: "https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html"
  - title: "Distributed Locks with Redis"
    author: "Redis Documentation"
    chapter: "Redis Patterns"
    page_range: "N/A"
    external_link: "https://redis.io/docs/manual/patterns/distributed-locks/"
code_examples:
  - language: go
    title: Resilient Distributed Lock Client with Fencing Tokens and Lease Renewal
    code: |
      package main

      import (
          "context"
          "errors"
          "fmt"
          "sync"
          "sync/atomic"
          "time"
      )

      // MockLockStore simulates etcd or a similar consensus database
      type MockLockStore struct {
          mu          sync.Mutex
          holder      string
          tokenSeq    int64
          expireTime  time.Time
      }

      type LockResult struct {
          Success      bool
          FencingToken int64
          LeaseID      string
      }

      var store = &MockLockStore{}

      func AcquireLock(ctx context.Context, clientID string, ttl time.Duration) (LockResult, error) {
          store.mu.Lock()
          defer store.mu.Unlock()

          now := time.Now()
          if store.holder != "" && now.Before(store.expireTime) {
              return LockResult{Success: false}, nil
          }

          // Generate a new monotonic fencing token
          atomic.AddInt64(&store.tokenSeq, 1)
          newToken := atomic.LoadInt64(&store.tokenSeq)

          store.holder = clientID
          store.expireTime = now.Add(ttl)

          return LockResult{
              Success:      true,
              FencingToken: newToken,
              LeaseID:      clientID,
          }, nil
      }

      func RenewLease(ctx context.Context, clientID string, ttl time.Duration) error {
          store.mu.Lock()
          defer store.mu.Unlock()

          if store.holder != clientID {
              return errors.New("lock ownership lost")
          }
          if time.Now().After(store.expireTime) {
              return errors.New("lock lease already expired")
          }

          store.expireTime = time.Now().Add(ttl)
          return nil
      }

      // MockStorageService implements optimistic lock checking using fencing tokens
      type MockStorageService struct {
          mu            sync.Mutex
          highestToken  int64
          resourceValue string
      }

      var storage = &MockStorageService{highestToken: 0, resourceValue: "initial"}

      func (s *MockStorageService) Write(token int64, value string) error {
          s.mu.Lock()
          defer s.mu.Unlock()

          // If incoming token is older than the highest token we have seen, reject the write
          if token < s.highestToken {
              return fmt.Errorf("write rejected: stale token %d is older than current highest token %d", token, s.highestToken)
          }

          s.highestToken = token
          s.resourceValue = value
          return nil
      }

      func main() {
          ctx, cancel := context.WithCancel(context.Background())
          defer cancel()

          clientID := "client-node-1"
          ttl := 3 * time.Second

          // 1. Acquire distributed lock
          lockRes, err := AcquireLock(ctx, clientID, ttl)
          if err != nil || !lockRes.Success {
              fmt.Println("Failed to acquire lock")
              return
          }
          fmt.Printf("Lock acquired. Fencing Token: %d\n", lockRes.FencingToken)

          // 2. Spawn background lease-renewal ticker
          var wg sync.WaitGroup
          wg.Add(1)
          go func() {
              defer wg.Done()
              ticker := time.NewTicker(1 * time.Second)
              defer ticker.Stop()

              for {
                  select {
                  case <-ticker.C:
                      err := RenewLease(ctx, clientID, ttl)
                      if err != nil {
                          fmt.Printf("Lease renewal failed: %v\n", err)
                          cancel() // Stop execution if lock is lost
                          return
                      }
                      fmt.Println("Lease renewed successfully")
                  case <-ctx.Done():
                      return
                  }
              }
          }()

          // Simulate work
          time.Sleep(1500 * time.Millisecond)

          // 3. Write to storage with the fencing token
          err = storage.Write(lockRes.FencingToken, "new-data-from-node-1")
          if err != nil {
              fmt.Printf("Error writing to storage: %v\n", err)
          } else {
              fmt.Println("Successfully wrote to storage!")
          }

          cancel()
          wg.Wait()
      }
---

## The Purpose of Distributed Locks

In a single-process application, multiple threads coordinate access to shared memory using mutual exclusion structures like **mutexes** or semaphores managed directly by the operating system kernel. However, modern backends run across multiple independent server instances. When these instances need to coordinate access to a shared resource that does not natively support transactions, standard in-memory locks are useless.

A **distributed lock** is a lease mechanism shared across multiple computer nodes. Its primary purpose is to ensure that only one node at a time can perform a specific operational action. Common use cases include:

* Preventing multiple instances of a cron service from running the same end-of-month billing job.
* Ensuring that only one worker node compiles a resource-heavy cache file.
* Safeguarding non-relational storage blocks from concurrent, overlapping modifications.

If multiple nodes execute these critical actions simultaneously, it leads to **split-brain** scenarios, data duplication, or resource corruption.

---

## Single-Node Lock Structures

The simplest way to implement a distributed lock is to store a key-value record in a fast, centralized database like Redis. 

A client attempts to acquire the lock by writing a unique key with a short time-to-live (TTL) expiration using a conditional write:

```bash
# Set key if it does not exist, with an expiration time of 10000 milliseconds
SET resource_lock client_identifier NX PX 10000
```

If the command succeeds, the client holds the lock. Once finished, the client deletes the key. The TTL ensures that if the client crashes or becomes disconnected, the lock will eventually expire, preventing a permanent deadlock.

### Failover and Crash Vulnerabilities

While fast, this single-node model is fragile. In production, Redis is typically configured with a primary node and one or more replica nodes. If the primary node crashes after confirming the lock write but before replicating the key to the standby replica, a failover will promote the replica to primary. 

Since the replica does not contain the key, another client can immediately acquire the lock, violating mutual exclusion.

```
[Client 1] -----> (Primary: Lock Set) -- [Crashes before Sync] --> (Replica)
[Client 2] ------------------------------------------------------> (Replica Promoted to Primary: Lock Set!)
```

---

## The Redlock Algorithm

To solve the single-node failover problem, Redis developers proposed the **Redlock** algorithm. Instead of a single primary instance, Redlock uses multiple fully independent Redis master nodes (typically five).

To acquire the lock, a client performs the following steps:

1. Records the current timestamp.
2. Attempts to acquire the lock key in all five instances sequentially, using the same key name and a unique random value, with a lock acquisition timeout that is small compared to the lock's auto-release time.
3. Computes the elapsed time to acquire all locks. If the client successfully acquires the lock from a majority of nodes (at least three out of five) and the elapsed time is less than the lock validity time, the lock is considered acquired.
4. If acquired, the lock validity time is defined as the initial validity time minus the time spent acquiring it.
5. If the client fails to acquire the majority or the validity time becomes negative, it immediately sends an unlock script (which deletes the key if the value matches) to all instances.

### Academic Correctness Critiques

Distributed systems researchers, most notably Martin Kleppmann, have criticized Redlock. They argue that Redlock is unsafe because it relies on a **synchronous system model** with assumptions about physical clock drift, which does not hold true in real-world networks. 

If a node experiences a sudden clock jump (due to an NTP sync update) or a long network partition, the lease duration can expire on one node earlier than others, allowing a second client to claim the lock.

---

## Consensus-Backed Locking

For strict safety guarantees, engineers prefer consensus-backed engines like `etcd` or Consul. These systems utilize consensus protocols like Raft to manage state replication.

```
Client ----[Create Lease with TTL]----> etcd Leader
Leader ----[Consensus replicated]-----> Followers
Client <---[Lease ID returned]--------- Leader
```

In `etcd`, locking is tied to a **lease** structure:

* **Leases**: A client requests a lease with a specific Time-to-Live (TTL). The lease is replicated to follower nodes via the Raft consensus log.
* **Keep-Alive**: The client must continuously send heartbeat requests (keep-alive pings) to renew the lease before the TTL expires.
* **Auto-Teardown**: If the client crashes, the heartbeat stops, the lease expires, and `etcd` automatically deletes all keys bound to that lease, releasing the lock.

This ensures that the lock state is durably replicated and verified by a quorum of nodes before the client receives confirmation.

---

## The Out-of-Order Write Problem

Even with a consensus-backed lock, a major safety issue remains: the client itself can experience a pause *after* acquiring the lock but *before* writing to storage. 

This is most commonly caused by a stop-the-world **garbage collection (GC)** pause, virtual machine migration, or network congestion.

### The Fencing Token Solution

To prevent out-of-order writes during GC pauses, you must use **fencing tokens**. A fencing token is a monotonic, increasing number returned by the lock service every time a lock is acquired.

When writing to the target storage system, the client must include this fencing token. The storage engine tracks the highest token it has processed and rejects any write requests containing a lower token number.

<svg viewBox="0 0 580 360" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="25" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Fencing Tokens in Distributed Locking</text>
  <rect x="230" y="50" width="120" height="45" rx="6" fill="#2e3440" stroke="#88c0d0" stroke-width="2"/>
  <text x="290" y="70" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Lock Service</text>
  <text x="290" y="82" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">e.g. etcd / ZooKeeper</text>
  <rect x="40" y="140" width="110" height="50" rx="6" fill="#2e3440" stroke="#ebcb8b" stroke-width="2"/>
  <text x="95" y="162" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Client 1</text>
  <text x="95" y="176" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle">Garbage Collection Pause</text>
  <rect x="430" y="140" width="110" height="50" rx="6" fill="#2e3440" stroke="#a3be8c" stroke-width="2"/>
  <text x="485" y="162" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Client 2</text>
  <text x="485" y="176" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Runs normally</text>
  <rect x="230" y="270" width="120" height="50" rx="6" fill="#2e3440" stroke="#eceff4" stroke-width="2"/>
  <text x="290" y="292" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Storage Service</text>
  <text x="290" y="306" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Last Token Verified: 34</text>
  <path d="M 100 140 L 230 75" stroke="#ebcb8b" stroke-width="1.5" fill="none" stroke-dasharray="2,2"/>
  <text x="135" y="95" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle">1. Acquire (Token=33)</text>
  <path d="M 480 140 L 350 75" stroke="#a3be8c" stroke-width="1.5" fill="none"/>
  <text x="445" y="95" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">2. Acquire (Token=34)</text>
  <path d="M 485 190 L 350 275" stroke="#a3be8c" stroke-width="2" fill="none"/>
  <text x="445" y="240" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">3. Write (Token=34) - OK</text>
  <path d="M 95 190 L 230 275" stroke="#bf616a" stroke-width="2" fill="none"/>
  <text x="135" y="240" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle">4. Delayed Write (Token=33)</text>
  <circle cx="205" cy="255" r="10" fill="#bf616a"/>
  <text x="205" y="259" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">X</text>
  <text x="205" y="238" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">REJECTED (33 &lt; 34)</text>
</svg>

In this diagram, Client 1 is suspended due to a GC pause immediately after obtaining Token 33. The lease expires, and Client 2 claims the lock, receiving Token 34. Client 2 writes its update to the storage node. When Client 1 wakes up and attempts to submit its write with Token 33, the storage engine compares 33 against its recorded high watermark of 34 and safely rejects it.

---

## Lease Renewal and Lock Classification

A primary challenge of leasing is choosing an appropriate TTL. If the TTL is too short, a long-running transaction might lose the lock mid-execution. If the TTL is too long, a crashed client will keep the resource locked for an excessive duration, stalling operations.

To balance this, modern client libraries run a background **lease-renewal thread** (sometimes called a watchdog or lease-keep-alive loop). The client acquires a lock with a short TTL (e.g. 5 seconds) and, while processing the task, sends periodic heartbeat RPCs to extend the TTL. If the process crashes or gets partitioned, the heartbeats stop, and the lock is freed within the 5-second window.

### Shared vs Exclusive Locks

Depending on the operational workload, you can configure locks with different accessibility rules:

* **Shared Locks (Reader)**: Multiple nodes can hold the lock concurrently as long as they are only performing read operations.
* **Exclusive Locks (Writer)**: Only a single node can hold the lock, blocking all other readers and writers.

This classification maximizes read performance while preserving strict consistency during mutations.

---

## Further Reading

* [How to Do Distributed Locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html) — Martin Kleppmann's detailed post on safety limits of Redlock
* [Distributed Locks with Redis](https://redis.io/docs/manual/patterns/distributed-locks/) — Official Redis page detailing the Redlock algorithm
* [etcd developer guide: concurrency](https://etcd.io/docs/v3.5/dev-guide/api_concurrency_reference_v3/) — API specifications for etcd distributed concurrency primitives
