---
title: LSM-Trees (Log-Structured Merge-Trees)
slug: lsm-trees
summary: "A write-optimized storage engine architecture that handles heavy write traffic by buffering updates in memory and writing them sequentially to disk."
difficulty: advanced
chapterId: databases
domain: Databases
estimatedMinutes: 12
prerequisites: [virtual-memory]
related: [indexes]
seo_title: "LSM-Trees: Write-Optimized Storage Engines Explained Simply"
seo_description: "Learn how Log-Structured Merge-Trees (LSM-Trees) structure writes in Memtables and SSTables, with background compaction cycles."
canonical_url: "/concepts/lsm-trees"
code_examples:
  - language: Go
    title: Simple Memtable simulation in Go
    code: |
      package main
      import (
          "fmt"
          "sync"
      )

      type Memtable struct {
          mu   sync.Mutex
          data map[string]string
      }

      func (m *Memtable) Put(key, value string) {
          m.mu.Lock()
          defer m.mu.Unlock()
          m.data[key] = value // Buffer writes in memory first
      }

      func main() {
          mem := &Memtable{data: make(map[string]string)}
          mem.Put("user_102", "active")
          fmt.Println("Write buffered in Memtable memory")
      }
  - language: Python
    title: SSTable structured write simulation in Python
    code: |
      import time

      # Simulating flushing memory buffer to disk as sorted string table (SSTable)
      memtable_buffer = {"user_b": "active", "user_a": "suspended"}

      # Sort by key before writing sequentially
      sorted_keys = sorted(memtable_buffer.keys())
      with open("sstable_flush.db", "a") as f:
          for k in sorted_keys:
              f.write(f"{k}:{memtable_buffer[k]}\n")
      print("SSTable flushed sequentially to disk")
---

## The Concept

Traditional databases (like PostgreSQL) store data in **B-Trees**. B-Trees require modifying database files in place, resulting in random disk writes. While B-Trees enable fast read lookups, random writes are a bottleneck under heavy write traffic.

A **Log-Structured Merge-Tree (LSM-Tree)** is a storage engine structure designed to prioritize write speed:
1. All incoming writes (`PUT`/`DELETE`) are written sequentially to a Write-Ahead Log (WAL) for durability and stored in a memory-buffered sorted tree called a **Memtable**.
2. Once the Memtable is full, it is flushed to disk as a sorted, immutable **SSTable (Sorted String Table)**.
3. Because SSTables are immutable, background processes periodically clean, merge, and discard obsolete keys in a cycle called **Compaction**.

---

## Practical Analogy

Think of LSM-Trees as the **Library Notepad System**:

* If a library receives 100 new book returns a minute, finding the exact shelf location for every book and filing them one-by-one is slow and exhausting (random writes).
* Instead, the librarian writes every book receipt sequentially in a pocket **Notepad (Memtable)**. Writing in the notepad is immediate.
* Once the notepad is full, they slide it onto a desk shelf as an **immutable notebook (SSTable)**.
* When a reader wants to search for a book, the librarian searches the pocket notepad first, then scans the immutable notebooks on the shelf.
* At the end of the day, when the shelves get crowded, the librarian merges the notebooks, removes duplicate check-ins, and cleans up the library files (**Compaction**).

---

## Why it matters in Backend Systems

1. **High-Write Databases**: Databases built for high-ingestion loads (like Cassandra, RocksDB, InfluxDB, and ScyllaDB) utilize LSM-Trees to sustain millions of writes per second.
2. **Reduced Disk Write Amplification**: LSM-Trees write data sequentially, which is significantly faster on SSDs and preserves drive lifespan by avoiding repetitive random sector updates.
3. **Read Penalties (Read Amplification)**: The tradeoff for fast writes is slower reads. To fetch a record, the engine must look in the Memtable and multiple SSTables. Databases use **Bloom Filters** to quickly determine if a key does *not* exist in an SSTable, optimizing lookup path speeds.
