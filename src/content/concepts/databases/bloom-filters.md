---
title: Bloom Filters
slug: bloom-filters
summary: "A Bloom filter is a space-efficient probabilistic data structure that can definitively say an item is absent, trading a small false-positive rate for dramatically lower memory use than a hash set."
difficulty: intermediate
chapterId: databases
domain: Databases
estimatedMinutes: 10
prerequisites: [hash-functions]
related: [indexes, lsm-trees]
seo_title: "Bloom Filters Explained: Space-Efficient Probabilistic Data Structures"
seo_description: "Learn how Bloom filters use a bit array and multiple hash functions to cheaply confirm an item is absent, with real-world uses in Cassandra, RocksDB, and Chrome Safe Browsing."
canonical_url: "/concepts/bloom-filters"
code_examples:
  - language: python
    title: Bloom Filter in Python (illustrative)
    code: |
      import hashlib

      class BloomFilter:
          def __init__(self, m: int, k: int):
              """
              m: number of bits in the array
              k: number of hash functions
              """
              self.m = m
              self.k = k
              self.bits = [0] * m

          def _hashes(self, item: str):
              """Yield k bit positions for the given item."""
              for seed in range(self.k):
                  digest = hashlib.sha256(f"{seed}:{item}".encode()).hexdigest()
                  yield int(digest, 16) % self.m

          def add(self, item: str) -> None:
              for pos in self._hashes(item):
                  self.bits[pos] = 1

          def might_contain(self, item: str) -> bool:
              """
              Returns False  -> item is DEFINITELY absent (no false negatives).
              Returns True   -> item is PROBABLY present (may be a false positive).
              """
              return all(self.bits[pos] == 1 for pos in self._hashes(item))


      # Usage
      bf = BloomFilter(m=1000, k=3)

      bf.add("alice")
      bf.add("bob")

      print(bf.might_contain("alice"))   # True  (probably present)
      print(bf.might_contain("charlie")) # False (DEFINITELY absent — skip the disk read)
      print(bf.might_contain("dave"))    # True  (might be a false positive)
---

## The Problem: Expensive Lookups for Missing Keys

Imagine you run a database with millions of rows spread across hundreds of disk files. A user queries for a record that does not exist. Without help, your database must open file after file, read index pages, and confirm the record is missing, only to discover nothing is there. Each file access can cost **milliseconds** on spinning disk.

The question Bloom filters answer is: **can we cheaply confirm that an item definitely does NOT exist before paying for any expensive I/O?**

Think of it like checking your coat pockets before tearing apart your whole apartment looking for lost keys. If you feel nothing in any pocket, you know for certain the keys are not there. You have saved yourself a lengthy search.

## What Is a Bloom Filter?

A **Bloom filter** is a probabilistic data structure built from two ingredients:

* A **bit array** of `m` bits, all initially set to `0`.
* **`k` independent hash functions**, each mapping any input to a position in the bit array.

### Inserting an item

To insert an item, run it through all `k` hash functions. Each function produces a bit-array index. Set all `k` positions to `1`.

### Checking membership

To test whether an item exists, run it through the same `k` hash functions and check those positions:

* If **any** bit is `0`, the item is **definitely absent**. It could never have been inserted without setting all `k` bits to `1`.
* If **all** bits are `1`, the item is **probably present**, but not certainly. Those bits might have been set by other items that happened to share those positions (a false positive).

This asymmetry is the essential property: **no false negatives, possible false positives**.

## Diagram: Bit Array in Action

<svg viewBox="0 0 580 370" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <!-- Title -->
  <text x="290" y="28" font-family="sans-serif" font-size="14" fill="#88c0d0" text-anchor="middle" font-weight="bold">Bloom Filter — 10-bit array, 3 hash functions</text>
  <!-- Bit array boxes -->
  <rect x="30" y="50" width="50" height="36" rx="4" fill="#2e3440" stroke="#4c566a"/>
  <rect x="82" y="50" width="50" height="36" rx="4" fill="#2e3440" stroke="#4c566a"/>
  <rect x="134" y="50" width="50" height="36" rx="4" fill="#2e3440" stroke="#4c566a"/>
  <rect x="186" y="50" width="50" height="36" rx="4" fill="#2e3440" stroke="#4c566a"/>
  <rect x="238" y="50" width="50" height="36" rx="4" fill="#2e3440" stroke="#4c566a"/>
  <rect x="290" y="50" width="50" height="36" rx="4" fill="#2e3440" stroke="#4c566a"/>
  <rect x="342" y="50" width="50" height="36" rx="4" fill="#2e3440" stroke="#4c566a"/>
  <rect x="394" y="50" width="50" height="36" rx="4" fill="#2e3440" stroke="#4c566a"/>
  <rect x="446" y="50" width="50" height="36" rx="4" fill="#2e3440" stroke="#4c566a"/>
  <rect x="498" y="50" width="50" height="36" rx="4" fill="#2e3440" stroke="#4c566a"/>
  <!-- Index labels -->
  <text x="55" y="48" font-family="sans-serif" font-size="10" fill="#4c566a" text-anchor="middle">0</text>
  <text x="107" y="48" font-family="sans-serif" font-size="10" fill="#4c566a" text-anchor="middle">1</text>
  <text x="159" y="48" font-family="sans-serif" font-size="10" fill="#4c566a" text-anchor="middle">2</text>
  <text x="211" y="48" font-family="sans-serif" font-size="10" fill="#4c566a" text-anchor="middle">3</text>
  <text x="263" y="48" font-family="sans-serif" font-size="10" fill="#4c566a" text-anchor="middle">4</text>
  <text x="315" y="48" font-family="sans-serif" font-size="10" fill="#4c566a" text-anchor="middle">5</text>
  <text x="367" y="48" font-family="sans-serif" font-size="10" fill="#4c566a" text-anchor="middle">6</text>
  <text x="419" y="48" font-family="sans-serif" font-size="10" fill="#4c566a" text-anchor="middle">7</text>
  <text x="471" y="48" font-family="sans-serif" font-size="10" fill="#4c566a" text-anchor="middle">8</text>
  <text x="523" y="48" font-family="sans-serif" font-size="10" fill="#4c566a" text-anchor="middle">9</text>
  <!-- After inserting alice (bits 2,5,8 = 1) and bob (bits 1,5,9 = 1) -->
  <!-- bit 1 set by bob -->
  <rect x="82" y="50" width="50" height="36" rx="4" fill="#3b4252" stroke="#88c0d0"/>
  <text x="107" y="73" font-family="sans-serif" font-size="15" fill="#a3be8c" text-anchor="middle" font-weight="bold">1</text>
  <!-- bit 2 set by alice -->
  <rect x="134" y="50" width="50" height="36" rx="4" fill="#3b4252" stroke="#88c0d0"/>
  <text x="159" y="73" font-family="sans-serif" font-size="15" fill="#a3be8c" text-anchor="middle" font-weight="bold">1</text>
  <!-- bit 5 set by alice + bob -->
  <rect x="290" y="50" width="50" height="36" rx="4" fill="#3b4252" stroke="#88c0d0"/>
  <text x="315" y="73" font-family="sans-serif" font-size="15" fill="#a3be8c" text-anchor="middle" font-weight="bold">1</text>
  <!-- bit 8 set by alice -->
  <rect x="446" y="50" width="50" height="36" rx="4" fill="#3b4252" stroke="#88c0d0"/>
  <text x="471" y="73" font-family="sans-serif" font-size="15" fill="#a3be8c" text-anchor="middle" font-weight="bold">1</text>
  <!-- bit 9 set by bob -->
  <rect x="498" y="50" width="50" height="36" rx="4" fill="#3b4252" stroke="#88c0d0"/>
  <text x="523" y="73" font-family="sans-serif" font-size="15" fill="#a3be8c" text-anchor="middle" font-weight="bold">1</text>
  <!-- zero bits -->
  <text x="55" y="73" font-family="sans-serif" font-size="15" fill="#4c566a" text-anchor="middle">0</text>
  <text x="211" y="73" font-family="sans-serif" font-size="15" fill="#4c566a" text-anchor="middle">0</text>
  <text x="263" y="73" font-family="sans-serif" font-size="15" fill="#4c566a" text-anchor="middle">0</text>
  <text x="367" y="73" font-family="sans-serif" font-size="15" fill="#4c566a" text-anchor="middle">0</text>
  <!-- Insert alice label -->
  <text x="55" y="112" font-family="sans-serif" font-size="11" fill="#88c0d0" text-anchor="middle" font-style="italic">insert 'alice'</text>
  <text x="55" y="124" font-family="sans-serif" font-size="10" fill="#d8dee9" text-anchor="middle">h1=2, h2=5, h3=8</text>
  <line x1="80" y1="126" x2="152" y2="88" stroke="#88c0d0" stroke-width="1" stroke-dasharray="3,2"/>
  <line x1="80" y1="126" x2="308" y2="88" stroke="#88c0d0" stroke-width="1" stroke-dasharray="3,2"/>
  <line x1="80" y1="126" x2="464" y2="88" stroke="#88c0d0" stroke-width="1" stroke-dasharray="3,2"/>
  <!-- Insert bob label -->
  <text x="500" y="112" font-family="sans-serif" font-size="11" fill="#ebcb8b" text-anchor="middle" font-style="italic">insert 'bob'</text>
  <text x="500" y="124" font-family="sans-serif" font-size="10" fill="#d8dee9" text-anchor="middle">h1=1, h2=5, h3=9</text>
  <line x1="495" y1="126" x2="104" y2="88" stroke="#ebcb8b" stroke-width="1" stroke-dasharray="3,2"/>
  <line x1="495" y1="126" x2="312" y2="88" stroke="#ebcb8b" stroke-width="1" stroke-dasharray="3,2"/>
  <line x1="495" y1="126" x2="516" y2="88" stroke="#ebcb8b" stroke-width="1" stroke-dasharray="3,2"/>
  <!-- Divider -->
  <line x1="30" y1="160" x2="550" y2="160" stroke="#4c566a" stroke-width="1" stroke-dasharray="4,3"/>
  <!-- Check charlie: positions 2, 4, 7 — bit 4 = 0, DEFINITELY absent -->
  <text x="290" y="182" font-family="sans-serif" font-size="12" fill="#eceff4" text-anchor="middle" font-weight="bold">Check 'charlie' — h1=2, h2=4, h3=7</text>
  <!-- highlight positions checked -->
  <rect x="134" y="198" width="50" height="36" rx="4" fill="#3b4252" stroke="#a3be8c" stroke-width="2"/>
  <text x="159" y="221" font-family="sans-serif" font-size="15" fill="#a3be8c" text-anchor="middle" font-weight="bold">1</text>
  <text x="159" y="248" font-family="sans-serif" font-size="9" fill="#a3be8c" text-anchor="middle">✓ set</text>
  <rect x="238" y="198" width="50" height="36" rx="4" fill="#2e3440" stroke="#bf616a" stroke-width="2"/>
  <text x="263" y="221" font-family="sans-serif" font-size="15" fill="#bf616a" text-anchor="middle" font-weight="bold">0</text>
  <text x="263" y="248" font-family="sans-serif" font-size="9" fill="#bf616a" text-anchor="middle">✗ zero!</text>
  <rect x="394" y="198" width="50" height="36" rx="4" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="419" y="221" font-family="sans-serif" font-size="15" fill="#4c566a" text-anchor="middle">0</text>
  <text x="419" y="248" font-family="sans-serif" font-size="9" fill="#4c566a" text-anchor="middle">not checked</text>
  <rect x="290" y="260" width="200" height="28" rx="5" fill="#3b4252" stroke="#bf616a"/>
  <text x="390" y="279" font-family="sans-serif" font-size="12" fill="#bf616a" text-anchor="middle" font-weight="bold">'charlie' DEFINITELY NOT present</text>
  <!-- Check dave: positions 1, 2, 5 — all set = possible false positive -->
  <text x="290" y="312" font-family="sans-serif" font-size="12" fill="#eceff4" text-anchor="middle" font-weight="bold">Check 'dave' — h1=1, h2=2, h3=5 — all bits are 1</text>
  <rect x="140" y="328" width="200" height="28" rx="5" fill="#3b4252" stroke="#ebcb8b"/>
  <text x="240" y="347" font-family="sans-serif" font-size="12" fill="#ebcb8b" text-anchor="middle" font-weight="bold">'dave' MAYBE present (false positive)</text>
</svg>

## False Positives: The Acceptable Trade-off

The filter can answer "definitely no" or "probably yes." It **cannot** answer "definitely yes." This is fine for the use cases it targets.

In the Cassandra example: a false positive means the database reads a disk file unnecessarily and then discovers the key is missing. That is one wasted I/O. Without a Bloom filter it would waste that I/O on every SSTable. With one, it wastes it only on the small fraction of false positives.

The **false positive rate** depends on:

* `m`: the number of bits. More bits, lower collision probability.
* `k`: the number of hash functions. Too few means too few bits set per item; too many means the array fills quickly. There is an optimal `k` for any target false positive rate.
* `n`: the number of items inserted. More items fill more bits.

A common rule of thumb: roughly **10 bits per item** gives about a 1% false positive rate with the optimal `k`.

## No Deletions

Standard Bloom filters are **append-only**. You cannot "unset" a bit for a deleted item because that bit may also have been set by a completely different item. Clearing it would corrupt other items' membership information.

**Counting Bloom filters** solve this by replacing each bit with a small counter. Inserting increments the counters, deleting decrements them, and a position is "set" when its counter is greater than zero. The trade-off is higher memory use (typically 4 bits per cell instead of 1).

## Real-World Uses

* **Apache Cassandra**: maintains one Bloom filter per SSTable on disk. When reading a key, Cassandra checks each SSTable's filter first. If the filter says "definitely absent," the SSTable is skipped entirely, avoiding a disk read.
* **Google Chrome Safe Browsing**: your browser keeps a locally cached Bloom filter of known malicious URLs. When you visit a site, Chrome checks the local filter. Only if the filter says "possibly present" does Chrome send a network request to Google's servers to confirm. This saves a network round-trip for the vast majority of safe URLs.
* **RocksDB and LevelDB**: each SSTable file carries a Bloom filter in its index block. Reads that miss all levels do not need to open any file.
* **Redis**: the `RedisBloom` module provides Bloom filter commands (`BF.ADD`, `BF.EXISTS`) for use cases like deduplicating event streams.
* **Akamai CDN**: reportedly uses Bloom filters to avoid caching one-hit-wonder content that is only requested once and would pollute the cache.

## Bloom Filter vs. Hash Set

| Property | Hash Set | Bloom Filter |
|---|---|---|
| False negatives | Never | Never |
| False positives | Never | Possible (tunable) |
| Memory | `O(n)` items stored | Fixed `m` bits |
| Deletions | Supported | Not in standard form |
| Lookup cost | `O(1)` average | `O(k)` hash operations |
| Scales with item size | Yes (stores the item) | No (only bits are stored) |

The key insight is that a Bloom filter never stores the items themselves. You cannot retrieve them and you cannot enumerate what is in it. It is purely a membership oracle.

## Code Example

```python
import hashlib

class BloomFilter:
    def __init__(self, m: int, k: int):
        # m: number of bits in the array
        # k: number of hash functions
        self.m = m
        self.k = k
        self.bits = [0] * m

    def _hashes(self, item: str):
        # Derive k independent positions using a seeded SHA-256
        for seed in range(self.k):
            digest = hashlib.sha256(f"{seed}:{item}".encode()).hexdigest()
            yield int(digest, 16) % self.m

    def add(self, item: str) -> None:
        for pos in self._hashes(item):
            self.bits[pos] = 1

    def might_contain(self, item: str) -> bool:
        # False  -> DEFINITELY absent (safe to skip the disk read)
        # True   -> PROBABLY present (do the actual lookup to confirm)
        return all(self.bits[pos] == 1 for pos in self._hashes(item))


bf = BloomFilter(m=1000, k=3)
bf.add("alice")
bf.add("bob")

print(bf.might_contain("alice"))    # True  — probably present
print(bf.might_contain("charlie"))  # False — definitely absent, skip I/O
```

In production you would use a well-tested library (e.g., `pybloom-live` in Python, or the built-in filters in RocksDB and Cassandra) rather than rolling your own. The implementation above is for illustration.

## Further Reading

* [Bloom Filters by Example — Bill Mill](https://llimllib.github.io/bloomfilter-tutorial/)
* [Bloom Filters: Sketching Your Way to Faster Lookups — Brilliant.org](https://brilliant.org/wiki/bloom-filter/)
* [Cassandra Bloom Filters — Apache Cassandra Docs](https://cassandra.apache.org/doc/latest/cassandra/operating/bloom_filters.html)
* [Google Safe Browsing: How it works](https://safebrowsing.google.com/)
* [Bloom Filter Calculator — Thomas Hurst](https://hur.st/bloomfilter/)
