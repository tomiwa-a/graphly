---
title: Virtual Memory
slug: virtual-memory
summary: "Understand how operating systems give every process its own private address space, enabling isolation, safety, and efficient use of physical RAM."
difficulty: intermediate
chapterId: foundations
domain: Foundations
estimatedMinutes: 10
prerequisites: [processes-threads]
related: [file-descriptors]
seo_title: "Virtual Memory Explained: Pages, Page Tables, TLB & Page Faults"
seo_description: "Learn how virtual memory works: page tables, address translation, TLB caching, page faults, swap space, and why it is the foundation of process isolation."
canonical_url: "/concepts/virtual-memory"
code_examples:
  - language: bash
    title: "Observing virtual vs physical memory on Linux"
    code: |
      # See a process's virtual memory map
      cat /proc/$$/maps

      # Check total swap usage
      free -h

      # Watch page fault rate (majflt = major, minflt = minor)
      ps -o pid,comm,minflt,majflt -p $$

      # Use vmstat to watch swap-in/swap-out activity
      vmstat 1 5
---

## The core illusion

Imagine a hotel where every guest is told: "You have the entire building to yourself." Each guest moves in, arranges furniture, and lives as if they own the place. Behind the scenes, the hotel manager routes each guest to a specific set of rooms, making sure nobody walks into someone else's space. The guests never need to coordinate with each other.

**Virtual memory** works exactly like this. Every process running on your computer believes it has exclusive access to a vast, contiguous block of memory addresses, starting at `0x0000000000000000`. In reality, the operating system and CPU hardware silently map each process's *virtual* addresses to different locations in physical RAM, maintaining the illusion perfectly.

This design gives you three things for free: isolation (process A cannot read process B's memory), overcommitment (you can have more virtual memory than physical RAM), and simplicity (every process compiles to the same address layout without needing to know what else is running).

## Pages: memory divided into fixed chunks

Rather than tracking memory byte-by-byte (which would require enormous bookkeeping), the OS divides both virtual and physical memory into fixed-size chunks called **pages**. On most modern systems a page is **4 KB** (4,096 bytes).

Why fixed sizes? Because uniform chunk sizes make allocation and deallocation trivial: any free physical page can satisfy any virtual page request, eliminating **external fragmentation** (the problem where free memory exists but in fragments too small to use). The CPU's memory management hardware is also designed around this fixed page size, making translation fast.

## Virtual-to-physical address translation

Each process has a **page table**: a data structure maintained by the OS that maps virtual page numbers to physical **page frame** numbers. When your code accesses a memory address, the CPU's **Memory Management Unit (MMU)** automatically:

1. Splits the virtual address into a *page number* and a *byte offset within the page*.
2. Looks up the page number in the page table.
3. Combines the resulting physical frame number with the original byte offset.
4. Forwards the resulting physical address to RAM.

Your code never sees any of this. It just uses the virtual address, and the hardware handles the rest in nanoseconds.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 290" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="26" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Virtual Memory: Two Processes, Shared Physical RAM</text>
  <rect x="20" y="42" width="140" height="180" rx="8" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="90" y="60" fill="#81a1c1" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Process A</text>
  <text x="90" y="74" fill="#4c566a" font-family="sans-serif" font-size="10" text-anchor="middle">Virtual Space</text>
  <rect x="32" y="82" width="116" height="28" rx="4" fill="#3b4252" stroke="#88c0d0" stroke-width="1"/>
  <text x="90" y="100" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">0x0000 – Stack</text>
  <rect x="32" y="116" width="116" height="28" rx="4" fill="#3b4252" stroke="#88c0d0" stroke-width="1"/>
  <text x="90" y="134" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">0x1000 – Heap</text>
  <rect x="32" y="150" width="116" height="28" rx="4" fill="#3b4252" stroke="#88c0d0" stroke-width="1"/>
  <text x="90" y="168" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">0x2000 – Code</text>
  <rect x="32" y="184" width="116" height="28" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="90" y="202" fill="#4c566a" font-family="sans-serif" font-size="10" text-anchor="middle">0xFFFF – (unused)</text>
  <rect x="420" y="42" width="140" height="180" rx="8" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="490" y="60" fill="#81a1c1" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Process B</text>
  <text x="490" y="74" fill="#4c566a" font-family="sans-serif" font-size="10" text-anchor="middle">Virtual Space</text>
  <rect x="432" y="82" width="116" height="28" rx="4" fill="#3b4252" stroke="#ebcb8b" stroke-width="1"/>
  <text x="490" y="100" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">0x0000 – Stack</text>
  <rect x="432" y="116" width="116" height="28" rx="4" fill="#3b4252" stroke="#ebcb8b" stroke-width="1"/>
  <text x="490" y="134" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">0x1000 – Heap</text>
  <rect x="432" y="150" width="116" height="28" rx="4" fill="#3b4252" stroke="#ebcb8b" stroke-width="1"/>
  <text x="490" y="168" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">0x2000 – Code</text>
  <rect x="432" y="184" width="116" height="28" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="490" y="202" fill="#4c566a" font-family="sans-serif" font-size="10" text-anchor="middle">0xFFFF – (unused)</text>
  <rect x="205" y="55" width="170" height="155" rx="8" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="290" y="74" fill="#a3be8c" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Physical RAM</text>
  <rect x="217" y="82" width="146" height="22" rx="3" fill="#88c0d0" fill-opacity="0.25" stroke="#88c0d0" stroke-width="1"/>
  <text x="290" y="97" fill="#88c0d0" font-family="sans-serif" font-size="10" text-anchor="middle">Frame 0x04 · A's Stack</text>
  <rect x="217" y="108" width="146" height="22" rx="3" fill="#ebcb8b" fill-opacity="0.2" stroke="#ebcb8b" stroke-width="1"/>
  <text x="290" y="123" fill="#ebcb8b" font-family="sans-serif" font-size="10" text-anchor="middle">Frame 0x11 · B's Stack</text>
  <rect x="217" y="134" width="146" height="22" rx="3" fill="#88c0d0" fill-opacity="0.25" stroke="#88c0d0" stroke-width="1"/>
  <text x="290" y="149" fill="#88c0d0" font-family="sans-serif" font-size="10" text-anchor="middle">Frame 0x07 · A's Heap</text>
  <rect x="217" y="160" width="146" height="22" rx="3" fill="#ebcb8b" fill-opacity="0.2" stroke="#ebcb8b" stroke-width="1"/>
  <text x="290" y="175" fill="#ebcb8b" font-family="sans-serif" font-size="10" text-anchor="middle">Frame 0x1A · B's Heap</text>
  <rect x="217" y="186" width="146" height="18" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="290" y="199" fill="#4c566a" font-family="sans-serif" font-size="10" text-anchor="middle">Frame 0x2F · (free)</text>
  <line x1="148" y1="96" x2="205" y2="93" stroke="#88c0d0" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arr)"/>
  <line x1="148" y1="130" x2="205" y2="145" stroke="#88c0d0" stroke-width="1.5" stroke-dasharray="5,3"/>
  <line x1="432" y1="96" x2="375" y2="119" stroke="#ebcb8b" stroke-width="1.5" stroke-dasharray="5,3"/>
  <line x1="432" y1="130" x2="375" y2="171" stroke="#ebcb8b" stroke-width="1.5" stroke-dasharray="5,3"/>
  <text x="290" y="260" fill="#d8dee9" font-family="sans-serif" font-size="11" text-anchor="middle">Both processes use address 0x0000, but the OS maps them to</text>
  <text x="290" y="278" fill="#d8dee9" font-family="sans-serif" font-size="11" text-anchor="middle">completely different physical frames — no collision possible.</text>
</svg>

## The TLB: a hardware shortcut

Walking the page table on every memory access would be painfully slow. Modern CPUs include a **Translation Lookaside Buffer (TLB)**: a small, extremely fast hardware cache that stores the most recently used virtual-to-physical address mappings.

When the CPU needs to translate an address:

1. It checks the TLB first (typically 1-4 clock cycles).
2. On a **TLB hit**: the physical address is available immediately, no page table walk needed.
3. On a **TLB miss**: the MMU walks the page table (many cycles), loads the result into the TLB, and evicts the least-recently-used entry.

The TLB typically holds 64-1024 entries. Because real programs tend to access the same memory regions repeatedly (good **locality of reference**), TLB hit rates above 99% are common. When you context-switch between processes, the TLB is usually flushed because the mappings are no longer valid, which is part of why context switches have a measurable cost.

## Page faults

When a process accesses a virtual address whose page table entry is marked *not present in RAM*, the MMU triggers a **page fault**: a CPU exception that hands control to the OS. Page faults come in two flavors:

**Minor page fault:** The page is already in memory but not yet mapped into this process's page table. This happens after `fork()` (copy-on-write pages) or when accessing freshly allocated heap memory that hasn't been touched yet. Resolution takes microseconds.

**Major page fault:** The page is not in RAM at all. The OS must read it from disk (the **swap space**), which takes milliseconds. This is the expensive case.

> [!WARNING]
> A process that frequently triggers major page faults is said to be **thrashing**. On a machine with insufficient RAM, the system can spend more time swapping pages in and out than actually executing code, grinding to a halt.

## Swap space

**Swap space** (or the swap file on Windows/macOS) is a region of disk the OS uses as an overflow area for RAM. When physical memory is full and a new page is needed, the OS picks a rarely-used page, writes it to swap, marks the original physical frame as free, and reuses it.

Swap makes it possible to run more processes than would otherwise fit in RAM. The cost is stark: RAM access takes ~100 nanoseconds, while disk access takes ~100 microseconds (SSD) to ~10 milliseconds (HDD). When a process's working set exceeds available RAM and it begins hitting swap regularly, you will feel it.

## Memory isolation and crash safety

Because each process has its own page table, the OS can enforce a hard rule: no virtual address in Process A can map to any physical frame belonging to Process B. This makes it **physically impossible** for one process to corrupt another's memory through normal code execution.

When a process crashes or runs amok and corrupts its own memory, the OS simply tears down that process's page table. Every other process continues unaffected, still mapped to their own physical frames. This is why a crashed browser tab does not take down the whole browser, and why a crashing microservice does not corrupt its neighbors.

## Practical implications for engineers

**`mmap()` is fast for large files.** The traditional way to read a file involves a `read()` syscall, which copies data from the kernel's page cache into your process's heap (two copies total). `mmap()` instead inserts the file's pages directly into your process's virtual address space. When you access a byte in that region, you're reading from the page cache with zero extra copies. This is why databases and key-value stores use `mmap()` heavily.

**Large heap allocations trigger page faults.** When you call `malloc()` for a large block, the OS allocates virtual pages but does not immediately back them with physical frames. Each page only gets a physical frame on first access, triggering a minor page fault. This is called **lazy allocation** and it means allocating 10 GB of memory is fast; touching 10 GB of memory is slow (paid in page fault overhead).

**`fork()` is cheaper than you think.** When a process calls `fork()`, the child gets an exact copy of the parent's virtual address space. But the OS does not copy physical frames: it uses **copy-on-write (CoW)**. Both parent and child point to the same physical pages, marked read-only. Only when either process writes to a page does the OS copy that specific page. This is why `fork()` is used prolifically in web servers despite cloning the entire address space.

```bash
# See a process's virtual memory map
cat /proc/$$/maps

# Check total swap usage
free -h

# Watch page fault rate (majflt = major, minflt = minor)
ps -o pid,comm,minflt,majflt -p $$

# Use vmstat to watch swap-in/swap-out activity
vmstat 1 5
```

## Further Reading

* [Virtual Memory — MIT 6.004 Lecture Notes](https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/)
* [Memory Management Reference — memorymanagement.org](https://www.memorymanagement.org/)
* [What Every Programmer Should Know About Memory — Ulrich Drepper](https://people.freebsd.org/~lstewart/articles/cpumemory.pdf)
* [Linux Kernel: Understanding the Virtual Memory Manager — Mel Gorman](https://www.kernel.org/doc/gorman/)
* [Page Fault Explained — Julia Evans (b0rk)](https://jvns.ca/blog/2019/11/29/understanding-how-ruby-uses-memory/)
