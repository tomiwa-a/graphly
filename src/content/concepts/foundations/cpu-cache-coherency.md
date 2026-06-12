---
title: CPU Cache Coherency
slug: cpu-cache-coherency
summary: "Explore how multi-core CPUs keep cache memories in sync, coordinate state transitions, and avoid concurrency bottlenecks like false sharing."
difficulty: advanced
chapterId: foundations
domain: Foundations
estimatedMinutes: 15
prerequisites: [concurrency-primitives]
related: [processes-threads, virtual-memory]
seo_title: "CPU Cache Coherency: MESI Protocol and False Sharing"
seo_description: "Learn how CPU cache coherency works. Master the memory hierarchy, cache lines, the MESI protocol, false sharing detection, memory barriers, and data alignment."
canonical_url: "/concepts/cpu-cache-coherency"
citations:
  - title: "Computer Architecture: A Quantitative Approach"
    author: "John L. Hennessy and David A. Patterson"
    chapter: "Chapter 5: Thread-Level Parallelism"
    page_range: "348-392"
    external_link: "https://www.elsevier.com/books/computer-architecture/hennessy/978-0-12-811905-1"
  - title: "Is Parallel Programming Hard, And, If So, What Can You Do About It?"
    author: "Paul E. McKenney"
    chapter: "Appendix C: Why Memory Barriers Are Required"
    page_range: "389-410"
    external_link: "https://kernel.org/pub/linux/kernel/people/paulmck/perfbook/perfbook.html"
code_examples:
  - language: cpp
    title: "Measuring and Preventing False Sharing in Multi-Threaded Arrays"
    code: |
      #include <iostream>
      #include <thread>
      #include <vector>
      #include <chrono>
      #include <new>

      const uint64_t ITERATIONS = 100000000ULL;

      // Structure demonstrating False Sharing
      // Adjacent members share the same 64-byte cache line
      struct NaiveData {
          uint64_t thread1_count;
          uint64_t thread2_count;
      } naive_data;

      // Structure utilizing alignment attributes to isolate members on separate cache lines
      struct OptimizedData {
          alignas(64) uint64_t thread1_count;
          alignas(64) uint64_t thread2_count;
      } optimized_data;

      void run_naive_worker1() {
          for (volatile uint64_t i = 0; i < ITERATIONS; ++i) {
              naive_data.thread1_count++;
          }
      }

      void run_naive_worker2() {
          for (volatile uint64_t i = 0; i < ITERATIONS; ++i) {
              naive_data.thread2_count++;
          }
      }

      void run_optimized_worker1() {
          for (volatile uint64_t i = 0; i < ITERATIONS; ++i) {
              optimized_data.thread1_count++;
          }
      }

      void run_optimized_worker2() {
          for (volatile uint64_t i = 0; i < ITERATIONS; ++i) {
              optimized_data.thread2_count++;
          }
      }

      int main() {
          std::cout << "Cache line size suggestion: " << std::hardware_destructive_interference_size << " bytes\n";
          std::cout << "Size of NaiveData: " << sizeof(NaiveData) << " bytes\n";
          std::cout << "Size of OptimizedData: " << sizeof(OptimizedData) << " bytes\n\n";

          // Test Naive execution (False Sharing)
          auto start_naive = std::chrono::high_resolution_clock::now();
          std::thread t1(run_naive_worker1);
          std::thread t2(run_naive_worker2);
          t1.join();
          t2.join();
          auto end_naive = std::chrono::high_resolution_clock::now();
          std::chrono::duration<double, std::milli> naive_duration = end_naive - start_naive;
          std::cout << "Naive execution time: " << naive_duration.count() << " ms\n";

          // Test Optimized execution (Aligned data boundaries)
          auto start_opt = std::chrono::high_resolution_clock::now();
          std::thread t3(run_optimized_worker1);
          std::thread t4(run_optimized_worker2);
          t3.join();
          t4.join();
          auto end_opt = std::chrono::high_resolution_clock::now();
          std::chrono::duration<double, std::milli> opt_duration = end_opt - start_opt;
          std::cout << "Optimized execution time: " << opt_duration.count() << " ms\n";

          double speedup = naive_duration.count() / opt_duration.count();
          std::cout << "Speedup achieved: " << speedup << "x\n";

          return 0;
      }
---

## The CPU Cache Hierarchy

Modern CPUs execute instructions in less than a nanosecond, but retrieving data from main RAM takes about 50 to 100 nanoseconds. If a CPU core had to wait for RAM on every instruction, it would spend most of its cycles idling. 

To bridge this latency gap, processors use a hierarchy of small, high-speed memory buffers called **caches** built directly into the silicon:

* **L1 Cache**: The fastest cache, dedicated to a single CPU core. It is divided into an L1 instruction cache and an L1 data cache. Access latency is typically 1 to 4 clock cycles.
* **L2 Cache**: Slightly larger than L1, also dedicated to a single core. Access latency is typically 10 to 15 clock cycles.
* **L3 Cache**: A much larger cache shared among all cores on a single CPU die. Access latency is typically 40 to 75 clock cycles.
* **Main RAM**: The system memory, shared by all cores. Access latency is 100 to 200+ cycles.

```
                    ┌──────────────────────────────────┐
                    │            L3 Cache              │
                    │         (Shared, 40-75c)         │
                    └───────────┬──────────────┬───────┘
                                │              │
                  ┌─────────────┴─┐      ┌─────┴─────────┐
                  │   L2 Cache    │      │   L2 Cache    │
                  │ (Private, 12c)│      │ (Private, 12c)│
                  └──────┬────────┘      └─────┬─────────┘
                         │                     │
                  ┌──────┴────────┐      ┌─────┴─────────┐
                  │   L1 Cache    │      │   L1 Cache    │
                  │  (Private, 4c)│      │  (Private, 4c)│
                  └──────┬────────┘      └─────┬─────────┘
                         ▼                     ▼
                     CPU Core 1            CPU Core 2
```

---

## Cache Lines

Caches do not load memory byte-by-byte. Instead, they organize data transfers into fixed-size blocks called **cache lines**. On almost all modern x86 and ARM processors, a cache line is **64 bytes** in size.

When you read a single 8-byte integer from memory, the CPU loads the entire 64-byte block containing that integer into the L1 cache. This design relies on the principle of **spatial locality**: the assumption that if you access one memory address, you are likely to access nearby addresses soon after (such as when iterating through an array).

---

## Coherency Coordination: The MESI Protocol

Because each CPU core has its own private L1 and L2 caches, multi-core systems face a synchronization challenge. If Core 1 edits a variable cached in its private L1 store, and Core 2 attempts to read that same address, Core 2 will receive stale data unless the caches coordinate.

To keep these caches in sync, hardware processors use a cache coherency protocol. The standard protocol on modern processors is **MESI** (Modified, Exclusive, Shared, Invalid), named after the four states a cache line can occupy:

* **Modified (M)**: The cache line is present only in the current core's cache, and its data has been edited (it is dirty relative to main memory). The current core must write the data back to memory or forward it to another core before the line can be evicted.
* **Exclusive (E)**: The cache line is present only in the current core's cache and matches the data in main memory.
* **Shared (S)**: The cache line is present in multiple cores' caches and matches the data in main memory. The line is read-only in this state; a core must transition the line to the Modified state before writing to it.
* **Invalid (I)**: The cache line does not contain valid data. Accessing this line triggers a cache miss, requiring a read from a shared cache or main memory.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 340" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="24" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">MESI Protocol: Cache Line State Transitions</text>
  <rect x="30" y="60" width="230" height="150" rx="8" fill="#2e3440" stroke="#88c0d0" stroke-width="1.5"/>
  <text x="145" y="80" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">CPU Core 1</text>
  <rect x="45" y="100" width="200" height="90" rx="4" fill="#3b4252" stroke="#d8dee9" stroke-width="1"/>
  <text x="145" y="118" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">L1 Cache (64-Byte Line)</text>
  <rect x="55" y="135" width="180" height="40" rx="3" fill="#2e3440" stroke="#a3be8c" stroke-width="1"/>
  <text x="145" y="152" fill="#a3be8c" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">State: Modified (M)</text>
  <text x="145" y="166" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Value dirty, Core 1 owns exclusivity</text>
  <line x1="260" y1="135" x2="320" y2="135" stroke="#bf616a" stroke-width="1.5" stroke-dasharray="3,3"/>
  <polygon points="320,135 313,131 313,139" fill="#bf616a"/>
  <text x="290" y="125" fill="#bf616a" font-family="sans-serif" font-size="8" text-anchor="middle">Invalidate Line</text>
  <rect x="320" y="60" width="230" height="150" rx="8" fill="#2e3440" stroke="#ebcb8b" stroke-width="1.5"/>
  <text x="435" y="80" fill="#ebcb8b" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">CPU Core 2</text>
  <rect x="335" y="100" width="200" height="90" rx="4" fill="#3b4252" stroke="#d8dee9" stroke-width="1"/>
  <text x="435" y="118" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">L1 Cache (64-Byte Line)</text>
  <rect x="345" y="135" width="180" height="40" rx="3" fill="#2e3440" stroke="#bf616a" stroke-width="1"/>
  <text x="435" y="152" fill="#bf616a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">State: Invalid (I)</text>
  <text x="435" y="166" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Must read from memory on next access</text>
  <rect x="150" y="240" width="280" height="60" rx="6" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="290" y="262" fill="#a3be8c" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Shared L3 Cache / Main Memory</text>
  <text x="290" y="278" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">Data block address: 0x7ffd98</text>
  <text x="290" y="291" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Core 1's edit must be flushed here before Core 2 reads it</text>
  <path d="M 145 210 L 145 240" stroke="#88c0d0" stroke-width="1.2" fill="none"/>
  <polygon points="145,240 142,233 148,233" fill="#88c0d0"/>
  <path d="M 435 210 L 435 240" stroke="#ebcb8b" stroke-width="1.2" fill="none"/>
  <polygon points="435,240 432,233 438,233" fill="#ebcb8b"/>
</svg>

When a core modifies a shared cache line, it broadcasts an **invalidation signal** across the hardware interconnect bus. Other cores caching that line must set their local copies to the Invalid state. Only when these cores acknowledge the invalidation can the writing core modify the data and mark the line as Modified.

---

## False Sharing

The MESI protocol operates on whole cache lines, not individual variables. This design quirk introduces a performance issue known as **false sharing**.

False sharing occurs when two threads running on different cores modify independent variables that happen to reside in the same 64-byte cache line:

```
            ┌──────────────────────────────────────────────┐
            │            Shared 64-byte Cache Line         │
            │  [ Variable X (Core 1) ] [ Variable Y (Core 2) ]  │
            └──────────────────────┬───────────────────────┘
                                   │
                    (Both cores edit concurrently)
                                   ▼
            ┌──────────────────────────────────────────────┐
            │   MESI Protocol forces continuous bounces    │
            │   and invalidation loops between L1 caches   │
            └──────────────────────────────────────────────┘
```

Even though the threads do not share data, the hardware treats the entire cache line as shared. 

When Core 1 writes to variable X, it invalidates the entire cache line on Core 2. When Core 2 writes to variable Y, it invalidates the cache line on Core 1. The cache line bounces between the cores' private caches, degrading performance.

---

## Memory Barriers and Store Buffers

To keep write operations fast, CPUs do not wait for invalidation acknowledgments to complete. Instead, they use hardware optimizations:

* **Store Buffers**: When a core writes data, it writes to a store buffer and immediately continues executing instructions. The data is flushed to the cache once invalidation acknowledgments arrive.
* **Invalidation Queues**: Cores queue incoming invalidation requests in an invalidation queue, acknowledging them immediately and processing them asynchronously.

While these structures improve performance, they can lead to out-of-order execution, where writes become visible to other cores in a different order than they were written. 

To prevent this, engineers use **memory barriers** (or fences) in multi-threaded code. A memory barrier forces the CPU to flush its store buffer and process its invalidation queue, ensuring memory operations are visible in the expected order across all cores.

---

## Mitigating False Sharing with Data Alignment

You can prevent false sharing by ensuring that independent variables accessed by different threads are allocated on separate cache lines.

In C++11 and later, you can use the `alignas` specifier to align variables to cache line boundaries:

```cpp
struct OptimizedData {
    alignas(64) uint64_t thread1_count;
    alignas(64) uint64_t thread2_count;
};
```

This instructs the compiler to insert padding bytes so that each variable starts on a new 64-byte boundary, isolating them on separate cache lines. While this uses slightly more memory, it eliminates false sharing and prevents invalidation loops.

---

## Further Reading

* [Computer Architecture: A Quantitative Approach](https://www.elsevier.com/books/computer-architecture/hennessy/978-0-12-811905-1) — Chapter 5 provides a detailed look at cache design and coherency.
* [Is Parallel Programming Hard, And, If So, What Can You Do About It?](https://kernel.org/pub/linux/kernel/people/paulmck/perfbook/perfbook.html) — Appendix C explains the need for memory barriers.
* [Eliminating False Sharing](https://software.intel.com/content/www/us/en/develop/articles/avoiding-and-identifying-false-sharing-among-threads.html) — Intel documentation on diagnosing and resolving false sharing.
* [What Every Programmer Should Know About Memory](https://people.freebsd.org/~lstewart/articles/cpumemory.pdf) — Covers hardware cache structures and page translation.
