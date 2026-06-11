---
title: Processes & Threads
slug: processes-threads
summary: "Understand how operating systems run programs using isolated processes and lightweight threads, and when to use each."
difficulty: beginner
chapterId: foundations
domain: Foundations
estimatedMinutes: 10
prerequisites: [virtual-memory]
related: [file-descriptors]
seo_title: "Processes & Threads Explained | Graphy"
seo_description: "Learn the difference between OS processes and threads, how context switching works, CPU-bound vs I/O-bound work, and how goroutines and the GIL affect concurrency."
canonical_url: "/concepts/processes-threads"
code_examples:
  - language: go
    title: Spawning goroutines
    code: |
      package main

      import (
        "fmt"
        "sync"
      )

      func worker(id int, wg *sync.WaitGroup) {
        defer wg.Done()
        fmt.Printf("Worker %d starting\n", id)
        // simulate work
        fmt.Printf("Worker %d done\n", id)
      }

      func main() {
        var wg sync.WaitGroup
        for i := 1; i <= 5; i++ {
          wg.Add(1)
          go worker(i, &wg) // each go keyword spawns a goroutine
        }
        wg.Wait() // block until all goroutines finish
      }
  - language: bash
    title: Inspecting processes and threads
    code: |
      # List all running processes
      ps aux

      # Show threads inside a process (Linux)
      ps -T -p <pid>

      # See how many OS threads a Go program uses
      cat /proc/<pid>/status | grep Threads
---

## What is a process?

A **process** is an isolated, running instance of a program. The operating system gives every process its own private memory space, its own set of open file descriptors, its own program counter, and its own list of signals. One process cannot accidentally read or write another process's memory — the OS enforces this boundary using virtual memory.

Think of a process like a separate restaurant kitchen. Each kitchen has its own equipment, its own pantry, and its own entrance. A fire in one kitchen does not spread to the next.

When you type `node server.js` in a terminal, the OS creates a new process: it loads the program from disk, allocates heap memory, sets up the stack, and hands execution to the first instruction.

## What is a thread?

A **thread** is a unit of execution that lives *inside* a process. Threads within the same process share the process's heap memory, file descriptors, and global variables — but each thread maintains its own stack and program counter.

Extending the kitchen analogy: threads are the chefs inside that kitchen. They all work in the same room, use the same fridge and stovetop, but each chef is preparing a different dish simultaneously.

A single-threaded program runs one instruction at a time. A multi-threaded program can run many threads concurrently, all sharing the same address space.

## Process vs thread anatomy

The diagram below shows two processes side by side (each fully isolated) and then zooms into one process with three threads sharing its heap but each owning a private stack:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 340" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <!-- Title -->
  <text x="290" y="26" font-family="sans-serif" font-size="13" fill="#88c0d0" text-anchor="middle" font-weight="bold">Process vs Thread Memory Layout</text>
  <!-- Process A box -->
  <rect x="20" y="40" width="170" height="200" rx="8" fill="#2e3440" stroke="#4c566a" stroke-width="1.5"/>
  <text x="105" y="60" font-family="sans-serif" font-size="12" fill="#88c0d0" text-anchor="middle" font-weight="bold">Process A</text>
  <rect x="35" y="68" width="140" height="28" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="105" y="87" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">Code Segment</text>
  <rect x="35" y="103" width="140" height="28" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="105" y="122" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">Heap (private)</text>
  <rect x="35" y="138" width="140" height="28" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="105" y="157" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">Stack (main thread)</text>
  <rect x="35" y="173" width="140" height="28" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="105" y="192" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">File Descriptors</text>
  <rect x="35" y="208" width="140" height="22" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="105" y="223" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">Signal Handlers</text>
  <!-- Process B box -->
  <rect x="200" y="40" width="170" height="200" rx="8" fill="#2e3440" stroke="#4c566a" stroke-width="1.5"/>
  <text x="285" y="60" font-family="sans-serif" font-size="12" fill="#88c0d0" text-anchor="middle" font-weight="bold">Process B</text>
  <rect x="215" y="68" width="140" height="28" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="285" y="87" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">Code Segment</text>
  <rect x="215" y="103" width="140" height="28" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="285" y="122" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">Heap (private)</text>
  <rect x="215" y="138" width="140" height="28" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="285" y="157" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">Stack (main thread)</text>
  <rect x="215" y="173" width="140" height="28" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="285" y="192" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">File Descriptors</text>
  <rect x="215" y="208" width="140" height="22" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="285" y="223" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">Signal Handlers</text>
  <!-- Isolation barrier -->
  <line x1="190" y1="45" x2="190" y2="238" stroke="#bf616a" stroke-width="2" stroke-dasharray="5,3"/>
  <text x="190" y="252" font-family="sans-serif" font-size="10" fill="#bf616a" text-anchor="middle">Isolated</text>
  <!-- Multi-thread process box -->
  <rect x="390" y="40" width="170" height="240" rx="8" fill="#2e3440" stroke="#4c566a" stroke-width="1.5"/>
  <text x="475" y="60" font-family="sans-serif" font-size="12" fill="#88c0d0" text-anchor="middle" font-weight="bold">Process C (3 threads)</text>
  <!-- Shared heap -->
  <rect x="405" y="68" width="140" height="34" rx="4" fill="#81a1c1" stroke="#4c566a" stroke-width="1"/>
  <text x="475" y="89" font-family="sans-serif" font-size="11" fill="#2e3440" text-anchor="middle" font-weight="bold">Shared Heap</text>
  <!-- Thread stacks -->
  <rect x="405" y="112" width="40" height="60" rx="4" fill="#a3be8c" stroke="#4c566a" stroke-width="1"/>
  <text x="425" y="130" font-family="sans-serif" font-size="9" fill="#2e3440" text-anchor="middle" font-weight="bold">T1</text>
  <text x="425" y="143" font-family="sans-serif" font-size="9" fill="#2e3440" text-anchor="middle">Stack</text>
  <text x="425" y="156" font-family="sans-serif" font-size="9" fill="#2e3440" text-anchor="middle">+ PC</text>
  <rect x="455" y="112" width="40" height="60" rx="4" fill="#a3be8c" stroke="#4c566a" stroke-width="1"/>
  <text x="475" y="130" font-family="sans-serif" font-size="9" fill="#2e3440" text-anchor="middle" font-weight="bold">T2</text>
  <text x="475" y="143" font-family="sans-serif" font-size="9" fill="#2e3440" text-anchor="middle">Stack</text>
  <text x="475" y="156" font-family="sans-serif" font-size="9" fill="#2e3440" text-anchor="middle">+ PC</text>
  <rect x="505" y="112" width="40" height="60" rx="4" fill="#a3be8c" stroke="#4c566a" stroke-width="1"/>
  <text x="525" y="130" font-family="sans-serif" font-size="9" fill="#2e3440" text-anchor="middle" font-weight="bold">T3</text>
  <text x="525" y="143" font-family="sans-serif" font-size="9" fill="#2e3440" text-anchor="middle">Stack</text>
  <text x="525" y="156" font-family="sans-serif" font-size="9" fill="#2e3440" text-anchor="middle">+ PC</text>
  <!-- Shared FDs -->
  <rect x="405" y="182" width="140" height="28" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="475" y="201" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">Shared File Descriptors</text>
  <!-- Legend -->
  <rect x="405" y="220" width="12" height="12" rx="2" fill="#81a1c1"/>
  <text x="422" y="231" font-family="sans-serif" font-size="9" fill="#d8dee9">Shared</text>
  <rect x="460" y="220" width="12" height="12" rx="2" fill="#a3be8c"/>
  <text x="477" y="231" font-family="sans-serif" font-size="9" fill="#d8dee9">Per-thread</text>
  <!-- Caption -->
  <text x="290" y="310" font-family="sans-serif" font-size="10" fill="#81a1c1" text-anchor="middle">Processes are fully isolated. Threads share heap but each has its own stack and program counter (PC).</text>
</svg>

## Context switching

The OS can run far more threads than there are CPU cores. It does this by rapidly **context switching**: pausing one thread, saving its state (registers, program counter, stack pointer) into the kernel, and restoring another thread's saved state so it can run.

This is not free. Each switch involves a kernel entry, cache pollution, and TLB flushes. A system with thousands of OS threads in contention can spend more time switching than doing real work — a condition called **thrashing**. This is one reason why languages like Go invented green threads (goroutines) instead of mapping every goroutine directly to an OS thread.

## CPU-bound vs I/O-bound work

The right concurrency model depends on what your code spends time doing:

* **CPU-bound work** (image processing, cryptography, machine learning inference) keeps the CPU busy doing computation. More threads than cores does not help — you need true parallelism across cores. The right tool is multiple processes or threads pinned to individual cores.
* **I/O-bound work** (database queries, HTTP calls, reading from disk) spends most of its time waiting. The CPU sits idle. You can handle thousands of simultaneous I/O operations with far fewer threads by using async I/O or a thread pool, because waiting costs nothing in terms of CPU cycles.

A web server that calls a database on every request is almost entirely I/O-bound — which is why Node.js (single-threaded event loop) and Nginx (non-blocking I/O) can handle enormous request volumes on modest hardware.

## Concurrency vs parallelism

These two terms are often used interchangeably but they mean different things:

* **Concurrency** is the ability to deal with many things at once. A single chef who switches between chopping vegetables, stirring soup, and checking the oven is working concurrently — only one hand moves at a time, but multiple tasks make progress.
* **Parallelism** is actually doing many things at the same instant. Multiple chefs each working on a different dish simultaneously is parallel work.

A single-core machine can be concurrent (via time-slicing) but cannot be truly parallel. A multi-core machine can be both.

## The Python GIL

Python's **Global Interpreter Lock** (GIL) is a mutex inside CPython that allows only one thread to execute Python bytecode at a time, even on a multi-core machine. This means Python threads cannot achieve true CPU parallelism for compute-intensive work.

Workarounds include:

* Using `multiprocessing` (spawns separate processes, each with its own GIL).
* Running native C extensions that release the GIL (NumPy does this).
* Switching to an alternative runtime: PyPy partially relaxes this, and Python 3.13 ships with an experimental free-threaded (no-GIL) mode.

Go and Rust do not have a GIL. Go's runtime scheduler multiplexes goroutines across multiple OS threads freely, and Rust's ownership model enforces thread safety at compile time.

## Green threads and goroutines

**Green threads** are threads implemented entirely in user space, managed by a runtime rather than the OS kernel. They are far cheaper to create and switch between than OS threads because no kernel call is required.

Go's **goroutines** are the most widely known example. Starting a goroutine costs only a few kilobytes of stack (which grows dynamically), and Go's runtime multiplexes all goroutines onto a pool of OS threads using an M:N scheduler (M goroutines on N OS threads). A production Go service routinely runs hundreds of thousands of goroutines on a handful of OS threads.

```go
// Each "go" keyword spawns a goroutine — cheap enough to spawn per request
go handleConnection(conn)
```

Node.js takes a different approach: instead of green threads it uses a single-threaded event loop backed by libuv's thread pool for blocking I/O. JavaScript code never runs in parallel, but I/O callbacks are managed asynchronously.

## Thread safety and race conditions

When two threads share mutable state without coordination, you get **race conditions**: the result depends on the exact interleaving of operations, which is non-deterministic.

Example: two threads both read a counter value of `100`, both increment it, and both write back `101`. The expected result was `102`. This is a classic lost-update race.

Solutions include:

* **Mutexes** (`sync.Mutex` in Go, `pthread_mutex_t` in C) — only one thread holds the lock at a time.
* **Channels** (Go) — threads communicate by sending values instead of sharing memory. "Do not communicate by sharing memory; share memory by communicating."
* **Atomic operations** — hardware-level compare-and-swap instructions for simple counters.
* **Immutability** — if shared data never changes, no synchronisation is needed.

Go's race detector (`go run -race`) instruments your binary at runtime and reports any detected data races — an invaluable tool during development.

## Code example

```go
package main

import (
  "fmt"
  "sync"
)

func worker(id int, wg *sync.WaitGroup) {
  defer wg.Done()
  fmt.Printf("Worker %d starting\n", id)
  // simulate work
  fmt.Printf("Worker %d done\n", id)
}

func main() {
  var wg sync.WaitGroup
  for i := 1; i <= 5; i++ {
    wg.Add(1)
    go worker(i, &wg) // each go keyword spawns a goroutine
  }
  wg.Wait() // block until all goroutines finish
}
```

`sync.WaitGroup` is a counter: `Add(1)` increments it, `Done()` decrements it, and `Wait()` blocks until it reaches zero. Without it, `main()` would exit before the goroutines finish.

```bash
# List all running processes
ps aux

# Show threads inside a specific process (Linux)
ps -T -p <pid>

# Check how many OS threads a Go binary is using
cat /proc/<pid>/status | grep Threads
```

## Further Reading

* [The Linux Process Model (Julia Evans)](https://jvns.ca/blog/2016/10/10/how-linux-got-its-mojo-back/) — a friendly, detailed walkthrough of Unix processes
* [Go Concurrency Patterns (Go Blog)](https://go.dev/blog/pipelines) — official guide to goroutines and channels
* [Python GIL explained (Real Python)](https://realpython.com/python-gil/) — clear explanation of why the GIL exists and its practical effects
* [Concurrency is not Parallelism (Rob Pike)](https://go.dev/blog/waza-talk) — the canonical talk distinguishing the two concepts
* [Operating Systems: Three Easy Pieces — Concurrency](https://pages.cs.wisc.edu/~remzi/OSTEP/) — free textbook with deep coverage of threads, locks, and condition variables
