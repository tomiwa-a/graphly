---
title: Virtual Memory
slug: virtual-memory
summary: "How page tables and address translations provide memory isolation and security between running applications."
difficulty: intermediate
chapterId: foundations
domain: Foundations
estimatedMinutes: 11
prerequisites: [processes-threads]
related: [indexes]
seo_title: "Virtual Memory Explained Simply for Backend Developers"
seo_description: "Learn how the Memory Management Unit (MMU) maps virtual address spaces to physical RAM, page tables, and memory protection."
canonical_url: "/concepts/virtual-memory"
code_examples:
  - language: Go
    title: Virtual address comparison in Go
    code: |
      package main
      import "fmt"

      func main() {
          x := 42
          // This outputs the virtual memory address of 'x' inside the process
          fmt.Printf("Virtual memory address of x: %p\n", &x)
      }
  - language: TypeScript
    title: Allocating array memory in Node.js
    code: |
      // Node.js allocates a contiguous block of virtual memory
      const buffer = Buffer.alloc(1024 * 1024); // 1MB virtual buffer
      console.log(`Buffer allocated in virtual memory space`);
---

## The Concept

Every process on your computer runs under the illusion that it has exclusive access to a contiguous, massive block of memory (e.g., 0 to $2^{64}$ bytes). This is called **Virtual Memory**. 

Processes cannot read or write to physical RAM directly. Instead, they interact with virtual addresses. Under the hood, hardware in the CPU (the Memory Management Unit, or MMU) maps these virtual addresses to actual physical slots in physical RAM using a translation database called a **Page Table**.

---

## Practical Analogy

Think of Virtual Memory as the **Hotel Front Desk Room Assignment**:

* Each guest checking into the hotel (a process) is given a room key and told their room number is between `1` and `100,000`. To the guest, it feels like they have the entire hotel layout to themselves.
* In reality, the hotel front desk (the Memory Management Unit / Page Table) maps the guest's virtual room number to a physical room somewhere in the building. 
* Virtual rooms `101` and `102` might map to physical room `504` in Building A and physical room `912` in Building B. The guest doesn't know and doesn't care. If guest A tries to peek into guest B's room, the front desk catches it and throws an alarm (**Segmentation Fault**).

---

## Why it matters in Backend Systems

1. **Isolation & Fault Safety**: Because virtual memory address spaces are separate, a bug in process A (like writing past array bounds) can never corrupt or overwrite memory inside process B (like database buffers).
2. **Efficient RAM Sharing (Overcommit)**: The OS doesn't allocate physical RAM until the program actually writes data. This allows servers to spin up many processes that declare high virtual memory footprint but occupy very little actual physical RAM.
3. **Memory Mapped Files (`mmap`)**: High-performance storage engines (like database index files) map file descriptors directly to virtual memory addresses. Writing data to memory translates directly to disk writes behind the scenes, bypassing expensive read/write system calls.
