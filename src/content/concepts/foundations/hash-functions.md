---
title: Hash Functions
slug: hash-functions
summary: "Mapping arbitrary-sized keys to fixed-size integers, powering HashMaps, cryptographic security, and data indexing."
difficulty: beginner
chapterId: foundations
domain: Algorithms
estimatedMinutes: 10
prerequisites: [bits]
related: [bloom-filters, indexes]
seo_title: "Hash Functions: From HashMap to Consistent Hashing"
seo_description: "Understand hash functions — how they map keys to integers, handle collisions, and power HashMaps, Bloom filters, and consistent hashing in distributed systems."
canonical_url: "/concepts/hash-functions"
code_examples:
  - language: TypeScript
    title: Simple DJB2 string hash
    code: |
      function djb2Hash(str: string): number {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          // hash * 33 + c
          hash = ((hash << 5) + hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
      }

      console.log(djb2Hash("hello")); // 261185
  - language: Go
    title: FNV-1a hash in Go
    code: |
      package main
      import (
          "fmt"
          "hash/fnv"
      )

      func hashString(s string) uint32 {
          h := fnv.New32a()
          h.Write([]byte(s))
          return h.Sum32()
      }

      func main() {
          fmt.Println(hashString("hello")) // 1335836873
      }
---

## What it is

A hash function takes an input (often a string or object) and returns a fixed-size integer, called a hash value or code. A good hash function is deterministic (same input always yields same output), fast to compute, and minimizes collisions (different inputs yielding the same hash value).

## Why it matters

Hash functions power the core data structures of the web: Hash tables support O(1) average-time inserts and reads. In backend engineering, hash functions distribute load uniformly (Consistent Hashing), detect data tampering (cryptographic hashes like SHA-256), and determine bit indices for space-saving probabilistic filters.

## Collision Resolution

When two different keys generate the same hash, it is a collision. Databases resolve collisions using:
- Chaining: Storing colliding items in a linked list at that index.
- Open Addressing: Finding another empty slot using probing sequences (linear, quadratic).
