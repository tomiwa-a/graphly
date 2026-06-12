---
title: Optimistic vs Pessimistic Locking
slug: locking-strategies
summary: "How databases handle write conflicts when multiple transactions read and modify the same data concurrently."
difficulty: intermediate
chapterId: databases
domain: Databases
estimatedMinutes: 12
prerequisites: [acid-transactions-isolation, concurrency-primitives]
related: [acid-transactions-isolation, distributed-locking]
seo_title: "Optimistic vs Pessimistic Locking: Database Concurrency Control"
seo_description: "Understand the differences between optimistic and pessimistic locking in databases. Learn how SELECT FOR UPDATE and version tracking work under the hood."
canonical_url: "/concepts/locking-strategies"
citations:
  - title: "On Optimistic Methods for Concurrency Control"
    author: "H. T. Kung & John T. Robinson"
    chapter: "ACM Transactions on Database Systems (TODS)"
    page_range: "213-226"
    external_link: "https://dl.acm.org/doi/10.1145/319076.319083"
code_examples:
  - language: python
    title: "Database Inventory Allocator: Pessimistic FOR UPDATE vs Optimistic Version Check"
    code: |
      import sqlite3
      import threading
      import time
      import random

      class InventoryDatabase:
          def __init__(self):
              self.conn = sqlite3.connect(":memory:", check_same_thread=False)
              self.cursor = self.conn.cursor()
              self.setup_db()
              self.pessimistic_lock = threading.Lock()

          def setup_db(self):
              self.cursor.execute("""
                  CREATE TABLE inventory (
                      id INTEGER PRIMARY KEY,
                      item_name TEXT,
                      stock INTEGER,
                      version INTEGER
                  )
              """)
              self.cursor.execute("INSERT INTO inventory (id, item_name, stock, version) VALUES (1, 'GraphQL Laptop Sleeve', 10, 1)")
              self.conn.commit()

          # --- PESSIMISTIC LOCKING SIMULATION ---
          # In PostgreSQL, this would use: SELECT stock FROM inventory WHERE id = 1 FOR UPDATE;
          def checkout_pessimistic(self, buyer_id):
              with self.pessimistic_lock:
                  cursor = self.conn.cursor()
                  cursor.execute("SELECT stock FROM inventory WHERE id = 1")
                  stock = cursor.fetchone()[0]
                  
                  # Simulate processing time (e.g. payment processing)
                  time.sleep(0.05)
                  
                  if stock > 0:
                      cursor.execute("UPDATE inventory SET stock = stock - 1 WHERE id = 1")
                      self.conn.commit()
                      print(f"Buyer {buyer_id} successfully bought item via Pessimistic Lock! Stock left: {stock - 1}")
                      return True
                  else:
                      print(f"Buyer {buyer_id} failed to buy. Out of stock!")
                      return False

          # --- OPTIMISTIC CONCURRENCY CONTROL (OCC) ---
          def checkout_optimistic(self, buyer_id):
              cursor = self.conn.cursor()
              
              # 1. Read phase
              cursor.execute("SELECT stock, version FROM inventory WHERE id = 1")
              row = cursor.fetchone()
              stock, current_version = row[0], row[1]
              
              # Simulate processing time (interleaved execution)
              time.sleep(0.05)
              
              if stock <= 0:
                  print(f"Buyer {buyer_id} failed to buy. Out of stock!")
                  return False
                  
              # 2. Validation & Write phase
              # The WHERE clause verifies that the version has not changed since we read it
              cursor.execute(
                  "UPDATE inventory SET stock = stock - 1, version = version + 1 WHERE id = 1 AND version = ?",
                  (current_version,)
              )
              self.conn.commit()
              
              # If no rows were affected, someone else updated the record first
              if cursor.rowcount == 0:
                  raise sqlite3.OperationalError(
                      f"Conflict detected for Buyer {buyer_id}! Stale version {current_version}."
                  )
                  
              print(f"Buyer {buyer_id} successfully bought item via OCC! Stock left: {stock - 1}")
              return True

      def run_simulation():
          db = InventoryDatabase()
          
          print("--- Running Pessimistic Locking Simulation ---")
          threads = []
          for i in range(5):
              t = threading.Thread(target=db.checkout_pessimistic, args=(i,))
              threads.append(t)
              t.start()
          for t in threads:
              t.join()

          # Reset stock for OCC simulation
          db.cursor.execute("UPDATE inventory SET stock = 10, version = 1 WHERE id = 1")
          db.conn.commit()

          print("\n--- Running Optimistic Concurrency Control Simulation ---")
          threads = []
          def attempt_occ(buyer_id):
              retries = 3
              for attempt in range(retries):
                  try:
                      db.checkout_optimistic(buyer_id)
                      return
                  except sqlite3.OperationalError as e:
                      print(f"[Retry] {e} Retrying... (Attempt {attempt+1}/{retries})")
                      time.sleep(random.uniform(0.01, 0.05))
              print(f"[Failure] Buyer {buyer_id} aborted after max retries.")

          for i in range(5):
              t = threading.Thread(target=attempt_occ, args=(i,))
              threads.append(t)
              t.start()
          for t in threads:
              t.join()

      if __name__ == "__main__":
          run_simulation()
---

## The Problem: Lost Updates in Concurrent Access

In multi-user systems, databases must handle concurrent reads and writes to the same records. A common issue is the **lost update** anomaly, which occurs during a read-modify-write pattern.

Imagine two customers try to buy the last remaining inventory item at the exact same moment.

1. Customer A reads the stock level and sees `1` item.
2. Customer B reads the stock level and also sees `1` item.
3. Customer A submits an order, decrementing the stock to `0`.
4. Customer B submits an order, decrementing the stock from their read value (`1`) to `0`.

Customer B has overwritten Customer A's update. The store sold the same item twice, but the database only shows a stock of `0`. To resolve this, database engines use **concurrency control** mechanisms to serialize concurrent write access.

---

## Pessimistic Locking: Lock First, Ask Questions Later

**Pessimistic locking** assumes the worst case, that conflicts are highly likely to occur. It prevents conflicts by locking target database rows before a transaction begins modifying them.

When a transaction acquires a lock on a row, any other transaction attempting to read or write that row is forced to block and wait until the locking transaction finishes and releases the lock.

In relational databases, this is typically done using the SQL statement `SELECT ... FOR UPDATE`.

<svg viewBox="0 0 580 280" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="145" y="25" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Pessimistic Locking (PCC)</text>
  <line x1="145" y1="45" x2="145" y2="245" stroke="#4c566a" stroke-dasharray="4" stroke-width="1.5"/>
  <rect x="25" y="55" width="105" height="30" rx="4" fill="#3b4252" stroke="#81a1c1" stroke-width="1"/>
  <text x="77" y="73" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">Tx A: Lock Row 1</text>
  <rect x="165" y="95" width="105" height="30" rx="4" fill="#2e3440" stroke="#bf616a" stroke-width="1"/>
  <text x="217" y="113" fill="#bf616a" font-family="sans-serif" font-size="10" text-anchor="middle">Tx B: Blocked...</text>
  <rect x="25" y="145" width="105" height="30" rx="4" fill="#3b4252" stroke="#a3be8c" stroke-width="1"/>
  <text x="77" y="163" fill="#a3be8c" font-family="sans-serif" font-size="10" text-anchor="middle">Tx A: Commit &amp; Unlock</text>
  <rect x="165" y="195" width="105" height="30" rx="4" fill="#3b4252" stroke="#ebcb8b" stroke-width="1"/>
  <text x="217" y="213" fill="#ebcb8b" font-family="sans-serif" font-size="10" text-anchor="middle">Tx B: Resumes &amp; Runs</text>
  <path d="M 130 70 L 165 110" stroke="#bf616a" stroke-width="1.5" stroke-dasharray="2" fill="none"/>
  <path d="M 130 160 L 165 210" stroke="#a3be8c" stroke-width="1.5" stroke-dasharray="2" fill="none"/>
  <text x="435" y="25" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Optimistic Locking (OCC)</text>
  <line x1="435" y1="45" x2="435" y2="245" stroke="#4c566a" stroke-dasharray="4" stroke-width="1.5"/>
  <rect x="315" y="55" width="105" height="30" rx="4" fill="#2e3440" stroke="#d8dee9" stroke-width="1"/>
  <text x="367" y="73" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">Tx A: Read v1</text>
  <rect x="455" y="55" width="105" height="30" rx="4" fill="#2e3440" stroke="#d8dee9" stroke-width="1"/>
  <text x="507" y="73" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">Tx B: Read v1</text>
  <rect x="315" y="115" width="105" height="35" rx="4" fill="#3b4252" stroke="#a3be8c" stroke-width="1"/>
  <text x="367" y="128" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Tx A: Write (v1-&gt;v2)</text>
  <text x="367" y="142" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">SUCCESS</text>
  <rect x="455" y="175" width="105" height="35" rx="4" fill="#3b4252" stroke="#bf616a" stroke-width="1"/>
  <text x="507" y="188" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle">Tx B: Write (v1-&gt;v2)</text>
  <text x="507" y="202" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle">FAIL (Stale version)</text>
</svg>

### Pessimistic Downsides

While pessimistic locking guarantees consistency, it introduces significant performance trade-offs:

* **Reduced Throughput**: By forcing concurrent transactions to serialize, it reduces the system's ability to utilize CPU and IO resources in parallel.
* **Deadlock Risks**: If Transaction A locks Row 1 and waits for Row 2, while Transaction B locks Row 2 and waits for Row 1, a deadlock occurs. The database must run detection algorithms to abort one of the transactions.
* **Active Thread Blocking**: Database connections are held open while waiting for locks to release, potentially exhausting connection pools.

---

## Optimistic Concurrency Control (OCC): Validate at the Finish Line

**Optimistic locking**, or Optimistic Concurrency Control, assumes that conflicts are rare. Instead of blocking access, it allows transactions to read and modify data freely. Before committing, the transaction validates whether another transaction has modified the data since it was read.

To implement OCC, tables must track a state-indicator field: usually an incrementing `version` integer or a high-precision timestamp.

The execution workflow is split into three phases:

1. **Read Phase**: The transaction reads the target record, including its current version number (e.g. `version = 1`).
2. **Validation Phase**: The transaction attempts to update the database row. The SQL query structure dynamically checks the version number in its filtering conditions:
   `UPDATE table SET value = new_value, version = version + 1 WHERE id = X AND version = current_version`
3. **Commit Phase**: If the row has not changed, the version matches, the query modifies the row, and the transaction commits successfully. If another transaction has modified the row, the version in the database is now different, the update affects zero rows, and the transaction fails, prompting an application retry.

### OCC Downsides

Although OCC avoids blocking and locks, it suffers under high-concurrency write workloads:

* **Transaction Aborts**: High conflict rates mean many writes will fail during validation.
* **Retry Storms**: The application must retry aborted transactions, which increases CPU and network overhead, creating a feedback loop of more conflicts.

---

## Comparing the Strategies: When to Use Which

The optimal strategy depends on the read-to-write ratio and the frequency of data contention:

* **Use Pessimistic Locking when contention is high**. If multiple transactions frequently update the same records (such as checkout operations for a hot-ticket event or inventory updates), PCC avoids the CPU and network overhead of constant transaction aborts and retries.
* **Use Optimistic Locking when contention is low**. In read-heavy systems with occasional updates (such as user profile settings or wiki page edits), OCC offers superior performance, higher throughput, and zero risk of deadlocks.

---

## Further Reading

- [On Optimistic Methods for Concurrency Control](https://dl.acm.org/doi/10.1145/319076.319083) — The original paper introducing the concept of OCC.
- [PostgreSQL Explicit Locking Documentation](https://www.postgresql.org/docs/current/explicit-locking.html) — Deep dive into table-level and row-level locks like `FOR UPDATE`.
- [Concurrency Control in Distributed Systems](https://www.sandtable.com/concurrency-control-in-distributed-systems/) — Explains how locking strategies translate to distributed databases.
