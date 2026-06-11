---
title: Processes vs. Threads
slug: processes-threads
summary: "How operating systems isolate memory and execute tasks concurrently using processes and threads."
difficulty: beginner
chapterId: foundations
domain: Foundations
estimatedMinutes: 10
prerequisites: []
related: [virtual-memory]
seo_title: "Processes vs Threads: Concurrent Execution for Backend Engineers"
seo_description: "Learn the difference between operating system processes and threads, their memory models, context switching, and real-world analogies."
canonical_url: "/concepts/processes-threads"
code_examples:
  - language: Go
    title: Goroutines as lightweight threads
    code: |
      package main
      import (
          "fmt"
          "sync"
      )

      func worker(id int, wg *sync.WaitGroup) {
          defer wg.Done()
          fmt.Printf("Worker %d starting\n", id)
      }

      func main() {
          var wg sync.WaitGroup
          for i := 1; i <= 3; i++ {
              wg.Add(1)
              go worker(i, &wg) // concurrency in threads/goroutines
          }
          wg.Wait()
      }
  - language: TypeScript
    title: Spawning workers in Node.js
    code: |
      import { Worker, isMainThread, workerData } from 'worker_threads';

      if (isMainThread) {
        // Spawn a separate thread sharing the engine context
        const worker = new Worker(__filename, { workerData: 'Hello Thread!' });
        worker.on('message', (msg) => console.log(`Received: ${msg}`));
      } else {
        console.log(`Thread received: ${workerData}`);
      }
---

## The Concept

Operating systems schedule and execute your code using two fundamental units of concurrency:

* **Process**: A container representing a running instance of a program. It is completely isolated from other processes, possessing its own virtual memory space, file descriptor tables, and security context.
* **Thread**: A sequence of execution steps scheduled by the operating system kernel *inside* a process. A single process can spawn thousands of threads.

---

## Practical Analogy

Think of your system as a large business district:

* A **Process** is a **Factory Building**. It has its own private address space (the factory floor), private storage rooms, and utility connections. Because they are completely separate, if one factory catches fire (crashes), the adjacent factories continue operating without issues.
* A **Thread** is a **Worker** inside that factory. All workers share the same factory floor, tools, raw materials, and files. They can coordinate instantly because they don't have to walk out of the building. However, if a worker makes a catastrophic error (like throwing a Null Pointer), it can ruin the entire factory (crash the process).

---

## Why it matters in Backend Systems

1. **Isolation & Security**: Web servers run user requests inside threads or isolated processes. For instance, PHP-FPM spawns separate processes for requests to isolate faults. Node.js and Go use concurrent threads/coroutines.
2. **Context Switching**: The CPU switches between running tasks. Switching between processes is slow because it requires changing page tables (address spaces). Switching between threads in the same process is much faster because they share memory.
3. **Data Sharing**: Threads share global memory, which makes concurrency fast but introduces race conditions. We must use locks, mutexes, or channels to coordinate thread access.
