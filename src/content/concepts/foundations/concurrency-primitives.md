---
title: Concurrency Primitives
slug: concurrency-primitives
summary: "Dive deep into threads, race conditions, mutual exclusion, semaphores, condition variables, hardware atomics, deadlocks, and the mechanics of Linux futexes."
difficulty: intermediate
chapterId: foundations
domain: Foundations
estimatedMinutes: 12
prerequisites: [processes-threads]
related: [virtual-memory]
seo_title: "Concurrency Primitives: Locks, Atomics, and Futexes | Graphly"
seo_description: "Learn how modern OS kernels and CPU architectures manage shared memory access using mutexes, semaphores, spinlocks, condition variables, and CAS."
canonical_url: "/concepts/concurrency-primitives"
citations:
  - title: "Operating Systems: Three Easy Pieces"
    author: "Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau"
    chapter: "Chapter 28: Locks, Chapter 30: Condition Variables, & Chapter 31: Semaphores"
    page_range: "301-345"
    external_link: "https://pages.cs.wisc.edu/~remzi/OSTEP/"
code_examples:
  - language: c
    title: Lock-Free Stack (Treiber Stack) using C11 Atomics
    code: |
      #include <stdatomic.h>
      #include <stdlib.h>
      #include <stdbool.h>

      struct Node {
          int data;
          struct Node* next;
      };

      struct Stack {
          _Atomic(struct Node*) head;
      };

      /* Initialize the atomic head pointer */
      void init_stack(struct Stack* stack) {
          atomic_init(&stack->head, NULL);
      }

      /* Thread-safe, lock-free push operation using atomic CAS loop */
      void push(struct Stack* stack, int val) {
          struct Node* new_node = malloc(sizeof(struct Node));
          new_node->data = val;

          struct Node* old_head = atomic_load(&stack->head);
          do {
              new_node->next = old_head;
              /*
               * Compares the current head with old_head:
               * If they match, head is updated to new_node and returns true.
               * If they differ, old_head is updated to the actual current head and returns false,
               * causing the loop to retry with the updated reference.
               */
          } while (!atomic_compare_exchange_weak(&stack->head, &old_head, new_node));
      }

      /* Thread-safe, lock-free pop operation */
      bool pop(struct Stack* stack, int* val) {
          struct Node* old_head = atomic_load(&stack->head);
          struct Node* new_head;

          do {
              if (old_head == NULL) {
                  return false; /* Stack is empty */
              }
              new_head = old_head->next;
          } while (!atomic_compare_exchange_weak(&stack->head, &old_head, new_head));

          *val = old_head->data;
          
          /*
           * WARNING on Memory Reclamation:
           * Direct free() in high-performance C applications can lead to the ABA problem.
           * If Thread 1 reads old_head (A), then pauses, and Thread 2 pops A, pops B,
           * frees both, and pushes A back (reusing the same address), when Thread 1 resumes,
           * its CAS will succeed but new_head (B) will point to a corrupted, freed memory address.
           * In production, use Hazard Pointers or Epoch-Based Reclamation.
           */
          free(old_head);
          return true;
      }
---

## Race Conditions and Critical Sections

In a shared-memory system, multiple execution contexts (threads) run concurrently, sharing access to the same memory space. If two or more threads attempt to read and write to the same memory location at the same time without synchronization, the outcome depends on the exact scheduling order of the threads. This bug is a **race condition**.

A specific subclass of this is a **data race**, which occurs when two threads access the same memory location concurrently, at least one of these accesses is a write, and the threads do not use any mutual exclusion locks.

To understand why race conditions happen, consider a simple counter increment:
`counter = counter + 1`

At the machine level, this statement requires three distinct instructions:
1. **Read**: Copy the value from the memory address of `counter` into a CPU register.
2. **Modify**: Add `1` to the value inside that register.
3. **Write**: Copy the value from the register back to the memory address of `counter`.

If Thread A and Thread B try to run this line at the same time, the operating system's scheduler might pause Thread A immediately after the Read instruction. Thread B then runs, executing all three instructions and updating `counter` from `10` to `11`. When Thread A resumes, its register still holds the stale value of `10`. It adds `1` to write `11` back to memory, overwriting Thread B's update. The final value is `11` instead of the expected `12`.

A block of code that accesses shared writeable resources and must be executed atomically is a **critical section**. Concurrency primitives are software and hardware tools used to protect these critical sections.

---

## Mutexes vs Semaphores

The two most common software primitives for controlling access to critical sections are mutexes and semaphores.

### Mutexes: Strict Mutual Exclusion
A **mutex** (mutual exclusion lock) is a binary lock designed to protect a single critical section. It enforces an ownership invariant: the thread that acquires the lock is the only thread allowed to release it. A mutex has two states: locked and unlocked. If a thread attempts to acquire a locked mutex, it is blocked (put to sleep by the operating system) until the owner thread releases the lock.

### Semaphores: Counting and Signaling
A **semaphore** is a synchronization variable containing a non-negative integer counter. Unlike a mutex, a semaphore does not have an owner thread. Any thread can signal a semaphore to modify its state. It exposes two operations:
* `wait()` (traditionally called P): Decrements the counter. If the counter is already `0`, the executing thread blocks until the counter rises above `0`.
* `signal()` (traditionally called V): Increments the counter. If any threads are blocked waiting, one of them is woken up.

Semaphores are classified into two types:
* **Binary Semaphore**: The counter is initialized to `1`. It behaves similarly to a mutex but lacks ownership constraints, meaning Thread A can lock it and Thread B can unlock it.
* **Counting Semaphore**: The counter is initialized to an arbitrary value `N`. This is used to throttle access to a finite pool of `N` identical resources, such as a database connection pool.

---

## Spinlocks and Sleep-Based Waiting

When a thread attempts to acquire a lock that is already held, it has two strategies: spin or sleep.

A **spinlock** uses busy-waiting. The thread enters a tight loop, checking the lock status repeatedly:

```c
while (lock_is_held(l)) {
    // Busy-wait, burning CPU cycles
}
```

* **Pros**: No context-switching overhead. The thread never goes to sleep, so it can immediately execute the critical section once the lock is released.
* **Cons**: Consumes 100% of a CPU core while waiting, wasting energy and starving other threads of processing time.

Conversely, a **sleep-based lock** transitions the blocked thread to a sleeping state, allowing the OS scheduler to run other threads on that CPU core.

* **Pros**: Zero CPU overhead while waiting.
* **Cons**: Going to sleep and waking up requires two full kernel context switches, which can take several microseconds.

As a general rule, spinlocks are used in kernels and low-level drivers where critical sections are extremely brief (less than the time of a context switch). Sleep-based locks are preferred in user-space applications where critical sections might involve disk I/O, network requests, or long computations.

---

## Condition Variables

Protecting critical sections is not the only concurrency problem, threads often need to wait for a specific state change in shared data. A thread could continuously check a variable in a loop, but this busy-waiting burns CPU cycles.

A **condition variable** is a signaling primitive that allows a thread to suspend execution until a shared condition is met. It is always paired with a mutex.

The wait sequence follows a strict pattern:
1. Lock the mutex.
2. Check the condition variable inside a `while` loop (not an `if` statement).
3. If the condition is false, call `wait()`. This atomically releases the mutex and puts the thread to sleep.
4. When another thread modifies the condition, it calls `signal()` (waking up one thread) or `broadcast()` (waking up all waiting threads).
5. The waiting thread wakes up and automatically re-acquires the mutex before returning from `wait()`.

Checking the condition in a `while` loop is mandatory to handle **spurious wakeups**, which occur when a thread wakes up without an explicit signal, or when another thread alters the state between the signal and the wakeup.

---

## Hardware Atomics and Lock-Free Programming

At the lowest level, all software locks rely on hardware-supported atomic CPU instructions. An instruction is **atomic** if it is executed as a single, indivisible unit of work by the CPU cache coherence controller, preventing other cores from seeing intermediate states.

Common atomic operations include:
* **Test-And-Set (TAS)**: Writes a value to a memory location and returns its old value in a single CPU clock cycle.
* **Compare-And-Swap (CAS)**: Accepts three parameters: a memory address, an expected old value, and a new value. The CPU updates the memory location to the new value if and only if the current value matches the expected old value.
* **Memory Barriers** (Fences): Instructions that force the CPU and compiler to preserve memory operation ordering, preventing hardware-level optimizations from reordering reads and writes across the barrier.

These hardware operations allow the creation of lock-free data structures. A data structure is **lock-free** if at least one thread is guaranteed to make progress in a finite number of steps, eliminating the risk of thread starvation or priority inversions.

---

## Deadlocks and Prevention Invariants

A **deadlock** occurs when two or more threads are unable to make progress because each is waiting for a lock held by another thread.

For a deadlock to occur, four conditions (known as the **Coffman conditions**) must hold simultaneously:
1. **Mutual Exclusion**: At least one resource must be held in a non-shareable mode.
2. **Hold and Wait**: A thread holding allocated resources can request additional resources without releasing its current holdings.
3. **No Preemption**: Resources cannot be forcibly taken from a thread, they must be released voluntarily.
4. **Circular Wait**: Thread 1 holds Lock A and waits for Lock B, while Thread 2 holds Lock B and waits for Lock A.

Breaking any one of these conditions prevents deadlocks. The most common prevention strategy is to enforce a strict **lock ordering** rule: all threads must acquire locks in the same predefined order (e.g., always lock A before lock B).

---

## Linux Futexes

In modern operating systems, mutexes are implemented using a hybrid approach that combines fast user-space execution with kernel-level thread scheduling. On Linux, this is handled by **futexes** (fast userspace mutexes).

A futex uses an atomic integer in user-space memory to track lock state:
* **Uncontended Case**: A thread attempts to acquire the lock using an atomic CAS operation. If the lock is free, the user-space state is updated immediately in a few CPU cycles, without making a system call.
* **Contended Case**: If the atomic CAS fails (indicating another thread holds the lock), the thread makes a `futex()` system call with the `FUTEX_WAIT` flag. The kernel receives this call, verifies that the lock state is still contended, transitions the calling thread to a sleeping state, and moves it to a wait queue.

When the lock owner releases the lock, it checks if there are blocked threads. If so, it calls the `futex()` system call with the `FUTEX_WAKE` flag, instructing the kernel to move the sleeping thread back to the scheduler's run queue.

This hybrid model ensures that applications only pay the performance cost of a system call when lock contention occurs.

<svg viewBox="0 0 580 340" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="24" fill="#88c0d0" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Mutex Contention (Futex) vs. Lock-Free CAS Loop</text>
  <rect x="20" y="45" width="250" height="230" rx="6" fill="#2e3440" stroke="#bf616a" stroke-width="1.5"/>
  <text x="145" y="65" fill="#bf616a" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">CASE 1: Mutex Contention (Sleep/Wake)</text>
  <rect x="30" y="80" width="230" height="24" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="145" y="95" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Thread A locks Mutex (User Space)</text>
  <rect x="30" y="115" width="230" height="34" rx="4" fill="#3b4252" stroke="#bf616a" stroke-width="1"/>
  <text x="145" y="128" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Thread B tries lock, fails CAS</text>
  <text x="145" y="142" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle">Calls futex(FUTEX_WAIT) -> Syscall</text>
  <path d="M 145 150 L 145 180" stroke="#bf616a" stroke-width="1.5" marker-end="url(#arr2)"/>
  <rect x="30" y="185" width="230" height="34" rx="4" fill="#2e3440" stroke="#bf616a" stroke-width="1"/>
  <text x="145" y="198" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Kernel-space context switch</text>
  <text x="145" y="210" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle">Thread B put to sleep in Wait Queue</text>
  <rect x="30" y="240" width="230" height="24" rx="4" fill="#3b4252" stroke="#a3be8c" stroke-width="1"/>
  <text x="145" y="255" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Thread A unlocks -> futex(FUTEX_WAKE)</text>
  <rect x="310" y="45" width="250" height="230" rx="6" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="435" y="65" fill="#a3be8c" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">CASE 2: Lock-Free CAS (Spin / Retry)</text>
  <rect x="320" y="80" width="230" height="24" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="435" y="95" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Thread A writes Val = Y via CAS</text>
  <rect x="320" y="115" width="230" height="34" rx="4" fill="#3b4252" stroke="#ebcb8b" stroke-width="1"/>
  <text x="435" y="128" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Thread B tries atomic CAS(X, Z)</text>
  <text x="435" y="142" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle">FAILS (current value is now Y)</text>
  <path d="M 435 150 L 435 180" stroke="#ebcb8b" stroke-width="1.5" marker-end="url(#arr2)"/>
  <rect x="320" y="185" width="230" height="34" rx="4" fill="#3b4252" stroke="#a3be8c" stroke-width="1"/>
  <text x="435" y="198" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">User-space loop retries immediately</text>
  <text x="435" y="210" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Tries CAS(Y, Z) -> SUCCESS</text>
  <rect x="320" y="240" width="230" height="24" rx="4" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="435" y="255" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Zero kernel context switches</text>
  <defs>
    <marker id="arr2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#81a1c1"/>
    </marker>
  </defs>
  <rect x="20" y="295" width="540" height="30" rx="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="290" y="313" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">Mutex blocks contended threads via the OS scheduler; Lock-Free loops spin and retry in User Space.</text>
</svg>

---

## Further Reading

* [Operating Systems: Three Easy Pieces](https://pages.cs.wisc.edu/~remzi/OSTEP/) — Accessible textbook chapters explaining locks, condition variables, and semaphores.
* [The Futex Manual Page](https://man7.org/linux/man-pages/man2/futex.2.html) — Linux kernel API documentation for the low-level `futex()` system call.
* [Non-blocking Algorithms and the ABA Problem](https://en.wikipedia.org/wiki/ABA_problem) — Comprehensive explanation of atomic memory reclamation challenges.
* [A Futex Guide](https://www.akkadia.org/drepper/futex.pdf) — Ulrich Drepper's deep-dive design documentation on futexes.
