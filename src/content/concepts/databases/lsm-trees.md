---
title: LSM-Trees
slug: lsm-trees
summary: "Log-Structured Merge-Trees convert random disk writes into fast sequential writes by staging writes in memory and periodically flushing them to immutable sorted files on disk."
difficulty: intermediate
chapterId: databases
domain: Databases
estimatedMinutes: 12
prerequisites: [indexes]
related: [bloom-filters, indexes]
seo_title: "LSM-Trees Explained: Write-Optimized Storage for Modern Databases"
seo_description: "Understand how Log-Structured Merge-Trees work: the Memtable, Write-Ahead Log, SSTables, compaction, tombstones, and why RocksDB, Cassandra, and LevelDB use them."
canonical_url: "/concepts/lsm-trees"
code_examples:
  - language: yaml
    title: RocksDB compaction settings (used in Kafka, TiKV)
    code: |
      # RocksDB column family options (typically set via application config)
      # Leveled compaction — keeps total data size per level bounded
      compaction_style: kCompactionStyleLevel

      # Level 0 SSTable count before triggering compaction
      level0_file_num_compaction_trigger: 4

      # Maximum bytes at Level 1 before spilling to Level 2
      max_bytes_for_level_base: 268435456  # 256 MiB

      # Each subsequent level is 10x larger than the previous
      max_bytes_for_level_multiplier: 10

      # Bloom filter bits per key — reduces false-positive rate per SSTable
      bloom_locality: 1
      # (bloom_bits_per_key configured at table factory level, typical value: 10)

      # Memtable size: when this fills up, it is flushed to Level 0 as a new SSTable
      write_buffer_size: 67108864  # 64 MiB

      # Number of memtables kept in memory while a flush is in progress
      max_write_buffer_number: 3
---

## The Problem: B-Trees and Random Writes

The **B-tree** is the workhorse behind most traditional databases (PostgreSQL, MySQL, SQLite). It is a balanced tree stored on disk that supports fast reads by keeping data sorted and directly locatable in `O(log n)` page lookups.

But writes in a B-tree have a painful property: they update the tree **in place**. Inserting a single row might require reading a leaf page into memory, modifying it, and writing it back to its original location on disk. That is a **random write**, and random writes are the slow path for both spinning disks and SSDs:

* On **spinning disks**, the read/write head must physically seek to the correct track. Seek time (5-10ms) dominates latency. A database doing thousands of random writes per second spends most of its time waiting for the disk head.
* On **SSDs**, there is no seek penalty, but random writes still cause **write amplification**: SSDs must erase an entire block (often 512KB) before rewriting even a single byte. Frequent small random writes wear out flash cells faster and reduce throughput.

For write-heavy workloads (logging, time-series, event streams), this is a serious bottleneck.

## The LSM-Tree Insight

**Log-Structured Merge-Trees** (LSM-Trees) flip the write model. Instead of touching files on disk immediately, they:

1. Buffer writes in memory (fast).
2. When the buffer is full, flush it to disk in **one sequential write** (fast, because the disk head does not need to seek anywhere).
3. Later, merge and sort files in the background (sequential reads and writes, the disk's happy path).

Think of it like a busy restaurant kitchen. Instead of a waiter running to the storage room for every single ingredient request (random access), the kitchen manager batches all the day's orders, prepares a consolidated list, and restocks everything in a single organized trip (sequential access). The cost per item drops dramatically.

## The Three-Stage Pipeline

### Stage 1: Memtable

Every write (insert or update) goes first to the **Memtable**, an in-memory sorted data structure, typically implemented as a **red-black tree** or **skip list**. Because it is in memory, writes are extremely fast. The Memtable keeps keys sorted at all times so a flush produces a sorted file without extra work.

### Stage 2: Write-Ahead Log (WAL)

Before acknowledging a write, the database also appends it to the **Write-Ahead Log**, a simple append-only file on disk. The WAL is not sorted and is not meant for reads. Its sole purpose is crash recovery: if the process crashes before the Memtable is flushed, the WAL lets the database replay the lost writes on restart.

The WAL write is sequential (always append), so it is fast even on spinning disk.

### Stage 3: SSTables

When the Memtable reaches a size threshold (e.g., 64 MB), it is **flushed** to disk as a new **SSTable** (Sorted String Table). An SSTable is:

* **Immutable**: once written, it is never modified.
* **Sorted**: all keys are stored in order, enabling binary search and efficient merging.
* **Self-indexed**: an index block at the end of the file maps key ranges to byte offsets inside the file.

Newly flushed SSTables land at **Level 0**. Over time, a background **compaction** process merges smaller SSTables into larger ones and promotes them to deeper levels (Level 1, Level 2, ...).

## Diagram: The Write and Read Path

<svg viewBox="0 0 580 400" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <!-- Title -->
  <text x="290" y="24" font-family="sans-serif" font-size="13" fill="#88c0d0" text-anchor="middle" font-weight="bold">LSM-Tree Write Path and Level Structure</text>
  <!-- Client write -->
  <rect x="218" y="38" width="144" height="34" rx="6" fill="#3b4252" stroke="#88c0d0" stroke-width="1.5"/>
  <text x="290" y="60" font-family="sans-serif" font-size="12" fill="#eceff4" text-anchor="middle">Client Write</text>
  <!-- Arrows from client to WAL and Memtable -->
  <line x1="240" y1="72" x2="130" y2="108" stroke="#88c0d0" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="340" y1="72" x2="390" y2="108" stroke="#88c0d0" stroke-width="1.5" marker-end="url(#arr)"/>
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#88c0d0"/>
    </marker>
    <marker id="arr-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#a3be8c"/>
    </marker>
    <marker id="arr-yellow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#ebcb8b"/>
    </marker>
  </defs>
  <!-- WAL box -->
  <rect x="50" y="108" width="130" height="42" rx="6" fill="#2e3440" stroke="#ebcb8b" stroke-width="1.5"/>
  <text x="115" y="127" font-family="sans-serif" font-size="11" fill="#ebcb8b" text-anchor="middle" font-weight="bold">Write-Ahead Log</text>
  <text x="115" y="142" font-family="sans-serif" font-size="10" fill="#d8dee9" text-anchor="middle">(append-only, on disk)</text>
  <!-- Memtable box -->
  <rect x="340" y="108" width="130" height="42" rx="6" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="405" y="127" font-family="sans-serif" font-size="11" fill="#a3be8c" text-anchor="middle" font-weight="bold">Memtable</text>
  <text x="405" y="142" font-family="sans-serif" font-size="10" fill="#d8dee9" text-anchor="middle">(in-memory, sorted)</text>
  <!-- Flush arrow from Memtable -->
  <line x1="405" y1="150" x2="405" y2="185" stroke="#a3be8c" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#arr-green)"/>
  <text x="430" y="172" font-family="sans-serif" font-size="9" fill="#a3be8c">flush when full</text>
  <!-- Level 0 -->
  <rect x="260" y="185" width="290" height="36" rx="6" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="405" y="200" font-family="sans-serif" font-size="11" fill="#81a1c1" text-anchor="middle" font-weight="bold">Level 0 — SSTables (newest, may overlap)</text>
  <text x="405" y="214" font-family="sans-serif" font-size="10" fill="#d8dee9" text-anchor="middle">SST-1  SST-2  SST-3  SST-4</text>
  <!-- Compaction arrow L0 -> L1 -->
  <line x1="405" y1="221" x2="405" y2="252" stroke="#ebcb8b" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#arr-yellow)"/>
  <text x="455" y="242" font-family="sans-serif" font-size="9" fill="#ebcb8b">compaction</text>
  <!-- Level 1 -->
  <rect x="230" y="252" width="320" height="36" rx="6" fill="#2e3440" stroke="#81a1c1"/>
  <text x="390" y="267" font-family="sans-serif" font-size="11" fill="#81a1c1" text-anchor="middle" font-weight="bold">Level 1 — SSTables (sorted, non-overlapping)</text>
  <text x="390" y="281" font-family="sans-serif" font-size="10" fill="#d8dee9" text-anchor="middle">SST-A  SST-B  SST-C</text>
  <!-- Compaction arrow L1 -> L2 -->
  <line x1="390" y1="288" x2="390" y2="318" stroke="#ebcb8b" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#arr-yellow)"/>
  <!-- Level 2 -->
  <rect x="190" y="318" width="360" height="36" rx="6" fill="#2e3440" stroke="#81a1c1"/>
  <text x="370" y="333" font-family="sans-serif" font-size="11" fill="#81a1c1" text-anchor="middle" font-weight="bold">Level 2 — SSTables (larger, non-overlapping)</text>
  <text x="370" y="347" font-family="sans-serif" font-size="10" fill="#d8dee9" text-anchor="middle">SST-X  SST-Y  SST-Z  ...</text>
  <!-- Read path label -->
  <text x="115" y="200" font-family="sans-serif" font-size="10" fill="#d8dee9" text-anchor="middle">Read path:</text>
  <text x="115" y="213" font-family="sans-serif" font-size="10" fill="#d8dee9" text-anchor="middle">Memtable first,</text>
  <text x="115" y="226" font-family="sans-serif" font-size="10" fill="#d8dee9" text-anchor="middle">then L0 → L1 → L2</text>
  <text x="115" y="239" font-family="sans-serif" font-size="10" fill="#d8dee9" text-anchor="middle">(newest to oldest)</text>
  <!-- Bloom filter note -->
  <rect x="30" y="270" width="165" height="32" rx="5" fill="#3b4252" stroke="#88c0d0"/>
  <text x="112" y="284" font-family="sans-serif" font-size="10" fill="#88c0d0" text-anchor="middle" font-weight="bold">Each SSTable has a</text>
  <text x="112" y="297" font-family="sans-serif" font-size="10" fill="#88c0d0" text-anchor="middle">Bloom filter to skip misses</text>
  <!-- Tombstone note -->
  <rect x="30" y="318" width="165" height="32" rx="5" fill="#3b4252" stroke="#bf616a"/>
  <text x="112" y="332" font-family="sans-serif" font-size="10" fill="#bf616a" text-anchor="middle" font-weight="bold">Deletes write a tombstone</text>
  <text x="112" y="345" font-family="sans-serif" font-size="10" fill="#bf616a" text-anchor="middle">removed during compaction</text>
  <!-- WAL crash recovery note -->
  <text x="115" y="168" font-family="sans-serif" font-size="9" fill="#4c566a" text-anchor="middle">crash recovery only</text>
</svg>

## Why Reads Are Harder

The write path is fast, but reads pay a cost called **read amplification**.

To find a key, the database must check:

1. The Memtable (in memory, fast).
2. Level 0 SSTables, from newest to oldest. Level 0 files can have overlapping key ranges, so multiple files may need to be checked.
3. Level 1, 2, 3... SSTables. Each level's files are non-overlapping, so at most one file per level needs checking.

In the worst case (a key that does not exist anywhere), you read one file at every level before concluding the key is missing. This is where **Bloom filters** make LSM-Trees practical.

## Bloom Filters per SSTable

Every SSTable carries a small **Bloom filter** in its index block. Before opening any SSTable file to look up a key, the database checks the filter:

* If the filter says "definitely absent," skip the file entirely. Zero I/O.
* If the filter says "possibly present," open the file and do a binary search.

With Bloom filters tuned to a ~1% false-positive rate, the database opens the wrong file only 1% of the time. Read amplification drops dramatically in practice.

## Compaction: Keeping Order

Left unchecked, Level 0 would accumulate SSTables indefinitely. Reads would get slower as more files pile up. **Compaction** is the background process that prevents this.

Compaction takes a set of SSTables, **merge-sorts** them into a new, larger SSTable, and deletes the originals. Because all SSTables are already sorted, the merge is a simple k-way merge (the same algorithm used in merge sort), which is sequential I/O from start to finish.

### Leveled compaction

Each level has a **size budget**. When a level exceeds its budget, one or more SSTables are picked and merged with the overlapping SSTables in the next level. Each level is typically 10x larger than the previous. This keeps reads predictable: at most one SSTable per level (except Level 0) can contain any given key range.

**RocksDB**, **Cassandra** (with LCS), and **LevelDB** all support leveled compaction.

### Size-tiered compaction

Instead of fixed levels, SSTables of similar size are grouped and merged together. Writes are cheaper (fewer compaction bytes written), but reads are worse because more files can contain overlapping key ranges. Cassandra's default (STCS) uses this approach for write-dominated tables.

## Tombstones: How Deletes Work

LSM-Trees cannot delete data immediately. Deleting from an immutable SSTable would require rewriting the entire file.

Instead, a **delete** writes a special marker called a **tombstone** into the Memtable alongside regular writes. The tombstone propagates through the system like any write, appearing in SSTables at each level. During compaction, when a tombstone is merged with the actual key-value entry, both are discarded. The data is physically removed only at that point.

This has an important consequence: deleted data continues to consume space until compaction reaches the level where both the tombstone and the original entry exist. For workloads with heavy deletes, it is important to tune compaction aggressively.

## B-Tree vs. LSM-Tree

| Dimension | B-Tree | LSM-Tree |
|---|---|---|
| Write pattern | Random (in-place update) | Sequential (append + flush) |
| Write throughput | Lower for write-heavy loads | Higher for write-heavy loads |
| Read pattern | Direct lookup, `O(log n)` | Check Memtable + multiple levels |
| Read amplification | Low (single tree traversal) | Higher (multiple SSTables) |
| Write amplification | Lower | Higher (data written multiple times during compaction) |
| Space amplification | Low | Moderate (stale data until compaction) |
| Deletes | In-place, immediate | Tombstones, deferred |
| Best for | Read-heavy, random access | Write-heavy, append-heavy |

Neither is universally better. PostgreSQL and MySQL choose B-trees because their workloads are read-heavy and random. Kafka's internal log storage, time-series databases, and wide-column stores choose LSM-trees because they ingest data faster than they read it.

## Real Databases Using LSM-Trees

* **RocksDB**: a high-performance embedded key-value store from Meta, used as the storage engine for Kafka (KIP-630/KRaft), TiKV, CockroachDB, and MyRocks (MySQL variant).
* **Apache Cassandra**: a wide-column distributed database used at Apple, Netflix, and Discord. Each node uses an LSM-tree storage engine called the Cassandra Storage Engine.
* **LevelDB**: the open-source library from Google that pioneered the leveled compaction strategy. Used inside Chrome's IndexedDB.
* **ScyllaDB**: a C++ reimplementation of Cassandra with lower latency, using the same LSM-tree storage model.
* **InfluxDB and TimescaleDB variants**: time-series databases benefit from LSM because incoming data is naturally time-ordered and append-heavy.

## Code Example: RocksDB Configuration

```yaml
# RocksDB column family options (used in Kafka, TiKV, CockroachDB)

# Leveled compaction: keeps total data size per level bounded
compaction_style: kCompactionStyleLevel

# Level 0 SSTable count before triggering compaction to Level 1
level0_file_num_compaction_trigger: 4

# Maximum bytes at Level 1 (256 MiB)
max_bytes_for_level_base: 268435456

# Each level is 10x larger than the previous
max_bytes_for_level_multiplier: 10

# Memtable size: flush to Level 0 when this fills (64 MiB)
write_buffer_size: 67108864

# Number of memtables kept in memory while a flush is in progress
max_write_buffer_number: 3
```

```go
// Opening a RocksDB database in Go (via grocksdb)
opts := grocksdb.NewDefaultOptions()
opts.SetCreateIfMissing(true)

// Memtable flushes when it reaches 64 MiB
opts.SetWriteBufferSize(64 * 1024 * 1024)

// Bloom filter: ~10 bits per key -> ~1% false positive rate
bbto := grocksdb.NewDefaultBlockBasedTableOptions()
bbto.SetFilterPolicy(grocksdb.NewBloomFilter(10))
opts.SetBlockBasedTableFactory(bbto)

db, err := grocksdb.OpenDb(opts, "/data/mydb")
if err != nil {
    log.Fatal(err)
}
defer db.Close()

// Writes go to WAL + Memtable atomically
wo := grocksdb.NewDefaultWriteOptions()
db.Put(wo, []byte("user:1001"), []byte(`{"name":"alice"}`))

// Reads check Memtable -> L0 -> L1 -> ... skipping via Bloom filters
ro := grocksdb.NewDefaultReadOptions()
val, _ := db.Get(ro, []byte("user:1001"))
fmt.Println(string(val.Data()))
```

## Further Reading

* [The Log-Structured Merge-Tree (LSM-Tree) original paper — O'Neil et al., 1996](https://www.cs.umb.edu/~poneil/lsmtree.pdf)
* [RocksDB: A Persistent Key-Value Store for Fast Storage — Meta Engineering](https://rocksdb.org/blog/2013/11/07/rocksdb-a-persistent-key-value-store-for-fast-storage.html)
* [Designing Data-Intensive Applications, Chapter 3 — Martin Kleppmann](https://dataintensive.net/)
* [Cassandra Storage Engine: SSTables and Compaction](https://cassandra.apache.org/doc/latest/cassandra/managing/operating/compaction/index.html)
* [LevelDB Implementation Notes — Google](https://github.com/google/leveldb/blob/main/doc/impl.md)
