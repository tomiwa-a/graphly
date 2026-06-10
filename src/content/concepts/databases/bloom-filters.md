---
title: Bloom Filters
slug: bloom-filters
summary: "A space-efficient probabilistic data structure that checks set membership with zero false negatives."
difficulty: intermediate
chapterId: databases
domain: Data Structures
estimatedMinutes: 14
prerequisites: [bits, hash-functions]
related: [caching-strategies, indexes]
seo_title: "Bloom Filters: Space-Efficient Probabilistic Set Membership"
seo_description: "Understand Bloom filters — the probabilistic data structure with zero false negatives that powers cache shielding, malicious URL detection, and database query optimization."
canonical_url: "/concepts/bloom-filters"
code_examples:
  - language: TypeScript
    title: Simple Bloom Filter implementation
    code: |
      class BloomFilter {
        private size: number;
        private bits: boolean[];

        constructor(size = 100) {
          this.size = size;
          this.bits = new Array(size).fill(false);
        }

        private hash1(str: string): number {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            hash = (hash * 31 + str.charCodeAt(i)) % this.size;
          }
          return hash;
        }

        private hash2(str: string): number {
          let hash = 5381;
          for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash + str.charCodeAt(i)) % this.size;
          }
          return Math.abs(hash);
        }

        add(item: string) {
          this.bits[this.hash1(item)] = true;
          this.bits[this.hash2(item)] = true;
        }

        contains(item: string): boolean {
          return this.bits[this.hash1(item)] && this.bits[this.hash2(item)];
        }
      }
---

## What it is

A Bloom Filter is a space-efficient probabilistic data structure. It can check if an element is a member of a set. It returns either:
1. "Possibly in the set" (potential False Positive)
2. "Definitely not in the set" (absolute guarantee of False Negative = 0%)
It uses a bit array and multiple independent hash functions.

## How it works under the hood

Initialize a bit array of size "m" to all 0s. Define "k" hash functions.
- To ADD: Hash the element with each of the "k" functions. Set the bits at those indices to 1.
- To QUERY: Hash the element with the same functions. If ANY of the bits at these indices is 0, the element is definitely NOT in the set. If ALL are 1, it might be in the set (or other keys set those bits, creating a false positive).

## Real-world Applications

1. Cache Shielding: Keep a Bloom Filter in memory. If a user queries a non-existent post ID, the Bloom filter says "Definitely Not Exist" instantly, preventing a database check.
2. Medium/Google Chrome: Check if a URL is in a malicious domain list locally before loading the page.
