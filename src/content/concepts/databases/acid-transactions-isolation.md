---
title: ACID & Isolation Levels
slug: acid-transactions-isolation
summary: "Deep dive into database transaction guarantees, isolation levels, concurrency anomalies like write skew, and control mechanisms such as MVCC, 2PL, and SSI."
difficulty: advanced
chapterId: databases
domain: Databases
estimatedMinutes: 15
prerequisites: [indexes]
related: [concurrency-primitives, vector-clocks]
seo_title: "ACID Transactions and Concurrency Isolation Levels"
seo_description: "Learn ACID transactions, SQL isolation levels, concurrency phenomena (dirty/phantom reads, write skew), and implementations like MVCC and 2PL."
canonical_url: "/concepts/acid-transactions-isolation"
code_examples:
  - language: python
    title: Simulating Write Skew Anomaly under Snapshot Isolation (Psycopg2)
    code: |
      import psycopg2
      import threading
      import time

      # Supposing we have a table: doctors (id, name, on_call)
      # Setup: INSERT INTO doctors (name, on_call) VALUES ('Alice', true), ('Bob', true);
      # Rule: At least one doctor must remain on call at all times.

      def doctor_leave_call(doctor_id, thread_name):
          conn = psycopg2.connect("dbname=hospital user=postgres password=secret host=localhost")
          # Repeatable Read isolation levels implement Snapshot Isolation in PostgreSQL
          conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_REPEATABLE_READ)
          cur = conn.cursor()
          
          try:
              print(f"[{thread_name}] Starting transaction at REPEATABLE READ...")
              
              # Step 1: Count doctors currently on call
              cur.execute("SELECT COUNT(*) FROM doctors WHERE on_call = true;")
              count = cur.fetchone()[0]
              print(f"[{thread_name}] Currently on-call: {count}")
              
              # Delay to ensure overlapping transactions (concurrent execution)
              time.sleep(2)
              
              # Step 2: If count >= 2, this doctor can safely take off
              if count >= 2:
                  print(f"[{thread_name}] Condition met ({count} >= 2). Updating doctor {doctor_id} to off-call.")
                  cur.execute("UPDATE doctors SET on_call = false WHERE id = %s;", (doctor_id,))
                  conn.commit()
                  print(f"[{thread_name}] Committed change successfully!")
              else:
                  print(f"[{thread_name}] Cannot leave call. Only {count} active.")
                  conn.rollback()
                  
          except Exception as e:
              print(f"[{thread_name}] Error: {e}")
              conn.rollback()
          finally:
              cur.close()
              conn.close()

      # Running doctor_leave_call(1, "Txn 1") and doctor_leave_call(2, "Txn 2") concurrently
      # will lead to BOTH transactions committing successfully because they read the same initial snapshot (count = 2).
      # As a result, both Alice and Bob are updated to on_call = false, leaving 0 doctors on call, violating the application invariant.
      #
      # Resolving Write Skew:
      # Option A: Use SERIALIZABLE isolation level. PostgreSQL will detect the serialization dependency cycle and abort one of them:
      #    conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_SERIALIZABLE)
      #
      # Option B: Use SELECT FOR UPDATE to force explicit write locks on the matching rows:
      #    cur.execute("SELECT COUNT(*) FROM doctors WHERE on_call = true FOR UPDATE;")
---

## The Concept

In database systems, a **transaction** is a logical unit of execution containing one or more operations (such as reading, writing, or updating rows). To guarantee data integrity under concurrent execution and system failures, databases provide **ACID** guarantees:

* **Atomicity**: The transaction executes completely or not at all (All-or-Nothing). If a failure occurs mid-transaction, any changes are rolled back.
* **Consistency**: A transaction can only transition the database from one valid state to another, preserving all schema invariants, constraints, and triggers.
* **Isolation**: Concurrent transactions execute without interfering with one another, preventing intermediate, uncommitted states from leaking.
* **Durability**: Once a transaction commits, its modifications are permanently recorded (usually in a write-ahead log on non-volatile storage) and survive system crashes.

Of these, **Isolation** is the most complex and expensive to enforce. Absolute isolation requires executing transactions sequentially (serializability), which severely limits database throughput. Consequently, databases allow developers to trade isolation guarantees for performance by configuring weaker **isolation levels**.

```xml
<svg viewBox="0 0 580 380" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="22" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Write Skew Anomaly under Snapshot Isolation</text>
  <line x1="80" y1="90" x2="80" y2="330" stroke="#4c566a" stroke-width="1.5"/>
  <line x1="290" y1="90" x2="290" y2="330" stroke="#4c566a" stroke-width="1.5" stroke-dasharray="3,3"/>
  <line x1="500" y1="90" x2="500" y2="330" stroke="#4c566a" stroke-width="1.5"/>
  <text x="80" y="80" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Transaction 1 (Alice)</text>
  <text x="290" y="60" fill="#81a1c1" font-family="sans-serif" font-size="10" text-anchor="middle">Database State (Doctors on Call: Alice, Bob)</text>
  <text x="500" y="80" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Transaction 2 (Bob)</text>
  <path d="M 80 110 L 290 120" stroke="#88c0d0" stroke-width="1.2" marker-end="url(#arrow)"/>
  <text x="185" y="110" fill="#88c0d0" font-family="sans-serif" font-size="9" text-anchor="middle">1. Read on-call count (returns 2)</text>
  <path d="M 500 140 L 290 150" stroke="#88c0d0" stroke-width="1.2" marker-end="url(#arrow)"/>
  <text x="395" y="140" fill="#88c0d0" font-family="sans-serif" font-size="9" text-anchor="middle">2. Read on-call count (returns 2)</text>
  <rect x="230" y="165" width="120" height="25" rx="3" fill="#3b4252" stroke="#ebcb8b"/>
  <text x="290" y="181" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle" text-anchor="middle">Snapshot: Active=Alice,Bob</text>
  <path d="M 80 210 L 290 220" stroke="#a3be8c" stroke-width="1.2" marker-end="url(#arrow)"/>
  <text x="185" y="205" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">3. Update Alice (on_call = false)</text>
  <path d="M 500 240 L 290 250" stroke="#a3be8c" stroke-width="1.2" marker-end="url(#arrow)"/>
  <text x="395" y="235" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">4. Update Bob (on_call = false)</text>
  <path d="M 80 280 L 290 280" stroke="#eceff4" stroke-width="1.2" marker-end="url(#arrow)"/>
  <text x="185" y="275" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">5. Commit Success</text>
  <path d="M 500 300 L 290 300" stroke="#eceff4" stroke-width="1.2" marker-end="url(#arrow)"/>
  <text x="395" y="295" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">6. Commit Success</text>
  <rect x="200" y="340" width="180" height="25" rx="3" fill="#2e3440" stroke="#bf616a"/>
  <text x="290" y="356" fill="#bf616a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Invariant Broken: 0 active doctors</text>
  <defs>
    <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#d8dee9"/>
    </marker>
  </defs>
</svg>
```

---

## Practical Analogy

Think of isolation levels as different coordination rules in a shared digital document:

* **Read Uncommitted** is like seeing changes in the document in real time as another person types, even before they hit save. You might read text that they ultimately decide to delete, which is like a dirty read.
* **Read Committed** is like only seeing sections of the document after the editor clicks the save button. If you read a paragraph twice, it might change between reads if they saved a new edit in between, which is like a non-repeatable read.
* **Repeatable Read** is like freeze-framing a copy of the document when you open it. No matter how many edits other people save, you read the exact same snapshot of data. However, if they add a brand-new page to the document, you might suddenly detect this phantom page when printing the document.
* **Serializable** is like placing a checkout lock on the document. Only one person can edit or read relevant sections at a time. If someone else tries to read, they must wait until you close the tab.

---

## Read Phenomena (Anomalies)

To understand isolation levels, we must define the database anomalies they prevent:

* **Dirty Read**: Transaction A reads modifications made by Transaction B before Transaction B commits. If Transaction B rolls back, Transaction A has read fake, non-existent data.
* **Non-repeatable Read (Fuzzy Read)**: Transaction A reads a row value. Transaction B updates that row and commits. Transaction A reads the row again and finds the value has changed.
* **Phantom Read**: Transaction A queries a set of rows matching a condition (e.g. `age > 30`). Transaction B inserts a new row matching the condition and commits. When Transaction A executes the query again, it detects new rows (phantoms) that were not there initially.
* **Write Skew**: A complex anomaly occurring under Snapshot Isolation. It occurs when two concurrent transactions read the same data snapshot, determine that they can safely update two *distinct* records, and commit. Individually, each transaction respects the application invariants, but combined, their actions break the rule.

---

## The SQL Standard Isolation Levels

The ANSI SQL standard defines four isolation levels based on which anomalies they prevent:

| Isolation Level | Dirty Reads | Non-Repeatable Reads | Phantom Reads |
| :--- | :--- | :--- | :--- |
| **Read Uncommitted** | Allowed | Allowed | Allowed |
| **Read Committed** | Prevented | Allowed | Allowed |
| **Repeatable Read** | Prevented | Prevented | Allowed |
| **Serializable** | Prevented | Prevented | Prevented |

---

## Implementation Mechanisms

Database engines enforce these isolation guarantees using distinct architectural patterns:

### 1. Two-Phase Locking (2PL)
A pessimistic concurrency control mechanism. It requires transactions to acquire locks on data items:
* **Shared Locks (S)**: Acquired for read operations. Multiple transactions can hold shared locks on the same row.
* **Exclusive Locks (X)**: Acquired for write operations. Only one transaction can hold an exclusive lock, blocking all other reads and writes.

The two phases are:
1. **Growing Phase**: The transaction acquires locks but cannot release any.
2. **Shrinking Phase**: The transaction releases locks but cannot acquire new ones.
Strict 2PL holds exclusive locks until the transaction completes, preventing dirty reads.

### 2. Multi-Version Concurrency Control (MVCC)
Enables readers to avoid blocking writers, and writers to avoid blocking readers. Instead of overwriting row data in place, the database creates a new version of the row with a transaction timestamp (`tx_id`). 
* When writing, the database appends a new tuple with metadata indicating which transaction created it.
* When reading, the database uses a transaction read-time snapshot to filter out versions created by transactions that had not committed at the start of the read.
Stale row versions are cleaned up asynchronously via background garbage collection (e.g. VACUUM in PostgreSQL).

### 3. Concurrency Control Philosophies: OCC vs PCC
* **Pessimistic Concurrency Control (PCC)**: Assumes conflicts are highly likely. It locks resources preemptively, forcing concurrent transactions to block and wait. This prevents conflicts but increases latency and risk of deadlocks.
* **Optimistic Concurrency Control (OCC)**: Assumes conflicts are rare. Transactions execute without locking, reading snapshots and writing to private workspaces. At commit time, the database performs a validation check. If another transaction has modified the same data in the meantime, the current transaction is aborted and must retry.

### 4. Serializable Snapshot Isolation (SSI)
SSI is an optimistic implementation of serializable isolation. Instead of blocking operations with locks, it tracks read-write dependencies during execution using virtual locks called `SIREAD` locks. If the database detects a cycle of read-write conflicts among concurrent transactions at commit time, it aborts one of the transactions, avoiding write skew without the overhead of heavy locking.

---

## Further Reading

* [Designing Data-Intensive Applications](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/) — Chapter 7: Weak Isolation Levels and Concurrency Control
* [A Evaluation of Difference-Isolation Levels](https://www.microsoft.com/en-us/research/publication/a-critique-of-ansi-sql-isolation-levels/) — Critique of ANSI SQL isolation levels by Hal Berenson et al.
* [PostgreSQL Documentation: Concurrency Control](https://www.postgresql.org/docs/current/mvcc.html) — Technical implementation details of MVCC in PostgreSQL
* [Serializable Snapshot Isolation in PostgreSQL](https://arxiv.org/abs/1208.4179) — Academic paper describing SSI implementation
