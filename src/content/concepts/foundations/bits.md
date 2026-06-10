---
title: Bits & Binary
slug: bits
summary: "The fundamental units of binary information and bitwise operations that power all higher-level data structures."
difficulty: beginner
chapterId: foundations
domain: Foundations
estimatedMinutes: 8
prerequisites: []
related: [hash-functions]
seo_title: "Bits and Binary: Bitwise Operations for Backend Engineers"
seo_description: "Understanding bits, binary representation, and bitwise operations — the foundation of high-performance data structures like Bloom filters and bitmap indexes."
canonical_url: "/concepts/bits"
code_examples:
  - language: TypeScript
    title: Bitwise flags in TypeScript
    code: |
      const READ = 1 << 0;  // 0001
      const WRITE = 1 << 1; // 0010
      const EXEC = 1 << 2;  // 0100

      // Combine flags using OR (|)
      let userPerms = READ | WRITE; // 0011

      // Check flags using AND (&)
      const canWrite = (userPerms & WRITE) === WRITE;
      console.log(canWrite); // true

      // Remove a flag using AND NOT
      userPerms = userPerms & ~WRITE; // 0001
  - language: Go
    title: Bitwise manipulation in Go
    code: |
      package main
      import "fmt"

      func main() {
          var bitmask uint8 = 0 // 00000000

          // Set 3rd bit to 1
          bitmask |= (1 << 3) // 00001000

          // Check 3rd bit
          hasThird := (bitmask & (1 << 3)) != 0
          fmt.Println(hasThird) // true
      }
---

## What it is

A bit (binary digit) is the most basic unit of information in computing, representing a logical state of 0 or 1. Pointers, arrays, and integers are all stored as sequences of bits in memory. Bitwise operators (AND, OR, XOR, NOT, shifts) manipulate these binary values directly, offering maximum execution speed and minimum memory footprint.

## Why it matters

High-performance data structures—like bit arrays, Bloom filters, and bitmap indexes—depend directly on bitwise arithmetic. By using individual bits as boolean flags, a system can store and query set membership in raw CPU cache with zero pointer indirection or database overhead.

## Key Bitwise Operators

1. AND (&): Sets bit to 1 if both bits are 1.
2. OR (|): Sets bit to 1 if either bit is 1.
3. XOR (^): Sets bit to 1 if only one bit is 1.
4. Left Shift (<<): Shifts bits left, filling with 0. Multiplying by 2^n.
5. Right Shift (>>): Shifts bits right. Dividing by 2^n.
