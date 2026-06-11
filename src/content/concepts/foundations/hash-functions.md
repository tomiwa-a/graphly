---
title: Hash Functions
slug: hash-functions
summary: "The mathematical algorithms mapping arbitrary data to fixed-size signatures, powering HashTables, load balancing, and cryptographic security."
difficulty: beginner
chapterId: foundations
domain: Algorithms
estimatedMinutes: 10
prerequisites: [bits]
related: [bloom-filters, indexes]
seo_title: "Hash Functions: The Mathematics of Lookup Engines"
seo_description: "Learn the core rules of hashing, the difference between hash functions and hash tables, collision resolution, and the security tradeoffs of slow vs fast hash functions."
canonical_url: "/concepts/hash-functions"
code_examples: []
---

## Hash Function vs. Hash Table

Before diving into the mathematics, we must draw a clear line between the function and the structure:

* **Hash Function**: A pure mathematical algorithm. It takes raw input data of any size (like a string, a file, or an object) and translates it into a fixed-size number (e.g., a 32-bit integer). It holds no data; it is just a translator.
* **Hash Table (HashMap)**: A data structure that stores key-value pairs in memory. It *uses* a hash function to convert keys into indices of a physical array, allowing you to store and read values in near-instant ($O(1)$) time.

---

## The Hashing Pipeline

Here is how a hash function translates keys to locate memory slots:

<svg viewBox="0 0 600 240" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem;">
  <!-- Inputs -->
  <rect x="20" y="30" width="100" height="40" rx="5" fill="#2e3440" stroke="#4c566a" stroke-width="2" />
  <text x="70" y="55" fill="#eceff4" font-family="sans-serif" font-size="12" text-anchor="middle">"Alice"</text>
  <rect x="20" y="100" width="100" height="40" rx="5" fill="#2e3440" stroke="#4c566a" stroke-width="2" />
  <text x="70" y="125" fill="#eceff4" font-family="sans-serif" font-size="12" text-anchor="middle">"Bob"</text>
  <rect x="20" y="170" width="100" height="40" rx="5" fill="#2e3440" stroke="#4c566a" stroke-width="2" />
  <text x="70" y="195" fill="#eceff4" font-family="sans-serif" font-size="12" text-anchor="middle">"Charlie"</text>
  <!-- Connectors -->
  <path d="M 120 50 L 200 120" stroke="#88c0d0" stroke-width="2" fill="none" />
  <path d="M 120 120 L 200 120" stroke="#88c0d0" stroke-width="2" fill="none" />
  <path d="M 120 190 L 200 120" stroke="#88c0d0" stroke-width="2" fill="none" />
  <!-- Hash Function -->
  <rect x="200" y="90" width="160" height="60" rx="8" fill="#88c0d0" stroke="#81a1c1" stroke-width="2" />
  <text x="280" y="120" fill="#2e3440" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Hash Function</text>
  <text x="280" y="138" fill="#4c566a" font-family="sans-serif" font-size="10" text-anchor="middle">hash(key) % Buckets</text>
  <!-- Connectors 2 -->
  <path d="M 360 120 L 460 50" stroke="#a3be8c" stroke-width="2" fill="none" />
  <path d="M 360 120 L 460 120" stroke="#bf616a" stroke-width="2" fill="none" />
  <path d="M 360 120 L 460 120" stroke="#bf616a" stroke-width="2" fill="none" />
  <!-- Buckets -->
  <g transform="translate(460, 20)">
    <rect x="0" y="0" width="100" height="40" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="2" />
    <text x="10" y="25" fill="#eceff4" font-family="sans-serif" font-size="11">Index 01: [Alice]</text>
    <rect x="0" y="50" width="100" height="60" rx="4" fill="#3b4252" stroke="#bf616a" stroke-width="2" />
    <text x="10" y="70" fill="#eceff4" font-family="sans-serif" font-size="11">Index 02:</text>
    <text x="10" y="85" fill="#d8dee9" font-family="sans-serif" font-size="10">[Bob]</text>
    <text x="10" y="100" fill="#bf616a" font-family="sans-serif" font-size="10">[Charlie] (Collision!)</text>
    <rect x="0" y="130" width="100" height="40" rx="4" fill="#2e3440" stroke="#4c566a" stroke-width="1" />
    <text x="10" y="155" fill="#4c566a" font-family="sans-serif" font-size="11">Index 03: Empty</text>
  </g>
</svg>

---

## The 3 Hard Rules of Hashing

To be useful for computers, a hash function must obey three core laws:

### 1. Absolute Determinism
Same input must **always** yield the exact same hash output.
* *Why?* If you store "Alice" at memory index `8` today, but the hash function translates "Alice" to `25` tomorrow, you will look in the wrong slot and your data is lost forever.

### 2. Fixed-Length Output
No matter if the input is a single character (`"A"`) or a 4GB raw video file, the output size must remain identical (e.g. always a 32-bit integer or a 64-character hash string).
* *Why?* Computer memory relies on predictable layouts. Fixed-length outputs ensure database buckets and array memory frames can be pre-allocated with uniform spacing.

### 3. One-Way Transmission (Pre-Image Resistance)
You can easily go from input to output, but it must be mathematically impossible to work backward from the output hash to reconstruct the input.
* *Why?* Security. If database passwords are saved as hashes, an attacker stealing the database only sees the output. If the function is one-way, they cannot reconstruct the plain-text passwords.

---

## The Pigeonhole Principle & Collisions

A **Collision** occurs when two completely different inputs yield the identical hash output. 

This is governed by the **Pigeonhole Principle**: If you have 10 pigeons but only 9 nesting holes, at least one hole must contain more than one pigeon. Because the possible inputs to a hash function are infinite (any string of any length) but the output hash range is finite (e.g. 2<sup>32</sup> combinations for a 32-bit integer), collisions are mathematically guaranteed to happen.

### Resolution Strategies
* **Separate Chaining**: If keys collide at Index 2, store them inside a linked list nested under Index 2. 
* **Open Addressing**: If Index 2 is full, search linearly down the array until you find the next empty slot.

---

## Hashing Tradeoffs: Fast vs. Slow Functions

Backend engineers choose hash functions based on a critical tradeoff: **Execution Speed vs. Cryptographic Security**.

### Fast Hash Functions (Non-Cryptographic)
* *Algorithms*: MurmurHash, FNV-1a, xxHash.
* *Use Case*: Router load balancers, database index lookups, cache keys.
* **Pros**: Incredibly fast. Can compute hashes for millions of requests per second with negligible CPU usage.
* **Cons**: Vulnerable to **Hash Collision DoS (Denial of Service)** attacks. An attacker can craft a list of payload keys that purposefully collide on the same array index, turning a fast $O(1)$ lookup hash table into a slow $O(N)$ linked list, consuming 100% CPU and crashing the API server.

### Slow Hash Functions (Cryptographic & Key Derivation)
* *Algorithms*: bcrypt, Argon2, PBKDF2, SHA-256.
* *Use Case*: Password hashing, credential storage, integrity checks.
* **Pros**: Incredibly secure. They are designed to be computationally expensive (taking 100ms+ per hash) and utilize salt values.
* **Cons**: Heavy CPU cost. Running a slow hash function inside a cache lookup index would instantly bottleneck database throughput and slow the application to a crawl.
