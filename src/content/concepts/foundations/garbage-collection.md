---
title: Garbage Collection
slug: garbage-collection
summary: "Understand automatic memory management: reference counting, tracing GC, the generational hypothesis, tri-color marking, write barriers, and fragmentation."
difficulty: advanced
chapterId: foundations
domain: Foundations
estimatedMinutes: 15
prerequisites: [processes-threads, virtual-memory]
related: [caching-strategies]
seo_title: "Garbage Collection Algorithms and Internals | Graphly"
seo_description: "Explore automatic memory management: Reference Counting vs. Tracing GC, Generational Hypothesis, Tri-Color marking, Write Barriers, and memory compaction."
canonical_url: "/concepts/garbage-collection"
citations:
  - title: "The Garbage Collection Handbook: The Art of Dynamic Memory Management"
    author: "Richard Jones, Antony Hosking, and Eliot Moss"
    chapter: "Chapter 1: Introduction & Chapter 2: Mark-Sweep Garbage Collection"
    page_range: "1-44"
    external_link: "https://gchandbook.org/"
code_examples:
  - language: c
    title: A Toy VM Mark-and-Sweep Garbage Collector
    code: |
      #include <stdio.h>
      #include <stdlib.h>

      #define STACK_MAX 256
      #define INITIAL_GC_THRESHOLD 8

      typedef enum {
          OBJ_INT,
          OBJ_PAIR
      } ObjectType;

      typedef struct sObject {
          ObjectType type;
          unsigned char marked;
          struct sObject* next; /* Linked list of all allocated objects */

          union {
              int value;
              struct {
                  struct sObject* head;
                  struct sObject* tail;
              };
          };
      } Object;

      typedef struct {
          Object* stack[STACK_MAX];
          int stackSize;
          Object* firstObject; /* Head of global allocation list */
          int numObjects;
          int maxObjects;      /* GC trigger threshold */
      } VM;

      /* Allocate and initialize a clean Virtual Machine instance */
      VM* newVM() {
          VM* vm = malloc(sizeof(VM));
          vm->stackSize = 0;
          vm->firstObject = NULL;
          vm->numObjects = 0;
          vm->maxObjects = INITIAL_GC_THRESHOLD;
          return vm;
      }

      void push(VM* vm, Object* value) {
          if (vm->stackSize >= STACK_MAX) {
              fprintf(stderr, "Stack overflow!\n");
              exit(1);
          }
          vm->stack[vm->stackSize++] = value;
      }

      Object* pop(VM* vm) {
          if (vm->stackSize <= 0) {
              fprintf(stderr, "Stack underflow!\n");
              exit(1);
          }
          return vm->stack[--vm->stackSize];
      }

      /* Mark phase: recursively flag reachable objects starting from stack roots */
      void mark(Object* object) {
          if (object == NULL) return;
          if (object->marked) return; /* Prevent infinite loops on cycles */

          object->marked = 1;

          if (object->type == OBJ_PAIR) {
              mark(object->head);
              mark(object->tail);
          }
      }

      /* Walk the VM stack to find and mark all active root objects */
      void markAll(VM* vm) {
          for (int i = 0; i < vm->stackSize; i++) {
              mark(vm->stack[i]);
          }
      }

      /* Sweep phase: free unmarked blocks and reset marks for remaining objects */
      void sweep(VM* vm) {
          Object** object = &vm->firstObject;
          while (*object) {
              if (!(*object)->marked) {
                  /* Object is dead, unlink it from global registry and free memory */
                  Object* unreached = *object;
                  *object = unreached->next;
                  free(unreached);
                  vm->numObjects--;
              } else {
                  /* Object is alive, clear marked flag for the next GC run */
                  (*object)->marked = 0;
                  object = &(*object)->next;
              }
          }
      }

      /* Trigger garbage collection cycle */
      void gc(VM* vm) {
          int oldObjCount = vm->numObjects;
          markAll(vm);
          sweep(vm);

          /* Adjust trigger limit dynamically based on surviving count */
          vm->maxObjects = vm->numObjects == 0 ? INITIAL_GC_THRESHOLD : vm->numObjects * 2;
          printf("GC: Collected %d objects, %d remaining in memory.\n", oldObjCount - vm->numObjects, vm->numObjects);
      }

      /* Allocate new object node, triggering GC automatically if threshold is crossed */
      Object* newObject(VM* vm, ObjectType type) {
          if (vm->numObjects >= vm->maxObjects) {
              printf("GC threshold reached. Starting sweep...\n");
              gc(vm);
          }

          Object* object = malloc(sizeof(Object));
          object->type = type;
          object->marked = 0;

          /* Link new node to the head of the VM global allocation tracker */
          object->next = vm->firstObject;
          vm->firstObject = object;

          vm->numObjects++;
          return object;
      }

      void pushInt(VM* vm, int intValue) {
          Object* obj = newObject(vm, OBJ_INT);
          obj->value = intValue;
          push(vm, obj);
      }

      Object* pushPair(VM* vm) {
          Object* obj = newObject(vm, OBJ_PAIR);
          obj->tail = pop(vm);
          obj->head = pop(vm);
          push(vm, obj);
          return obj;
      }

      void freeVM(VM* vm) {
          vm->stackSize = 0;
          gc(vm); /* Reclaims all remaining allocated objects */
          free(vm);
      }

      int main() {
          printf("Initializing VM...\n");
          VM* vm = newVM();

          printf("Allocating objects...\n");
          for (int i = 0; i < 6; i++) {
              pushInt(vm, i);
          }
          pushPair(vm);
          pushPair(vm);

          /* Pop the root reference to simulate losing reachability to structures */
          pop(vm);

          printf("Allocating more to trigger automatic garbage collection...\n");
          for (int i = 0; i < 10; i++) {
              pushInt(vm, i);
          }

          freeVM(vm);
          return 0;
      }
---

## Manual vs Automatic Memory Management

Programs store data in dynamic memory (the heap). Managing this memory involves allocating blocks when data is created and releasing them when the data is no longer needed.

In languages with manual memory management (such as C and C++), engineers must explicitly request heap space using calls like `malloc()` and free it using `free()`. This approach offers high performance, but it is highly error-prone:
* **Memory Leaks**: Occur when data is no longer used but `free()` is never called, causing the application to gradually exhaust system memory.
* **Dangling Pointers**: Occur when memory is freed while a pointer still references its address. Dereferencing this pointer triggers undefined behavior or segmentation faults.
* **Double Free**: Occurs when code attempts to deallocate the same pointer address twice, corrupting the memory allocator's internal metadata.

**Garbage collection** (GC) is the automatic management of dynamic memory. The runtime environment includes a background system that automatically detects and reclaims heap blocks that are no longer accessible by the application, resolving these safety risks.

---

## Reference Counting Mechanics

The most direct approach to automatic memory management is **Reference Counting**. Every object on the heap is allocated with an implicit metadata counter tracking how many references point directly to it.

The mechanics follow simple updates:
* When a reference to an object is copied, its counter is incremented.
* When a reference falls out of scope or is reassigned, its counter is decremented.
* If the counter drops to `0`, the object is immediately deallocated, and the counters of any other objects it referenced are decremented in turn.

This model is similar to tracking mugs in a shared office. If you write a tally mark on a board whenever someone takes a mug to their desk, you know exactly when the last person brings a mug back. Once the active user count is `0`, the mug can be washed and returned to the cupboard immediately.

### Pros and Cons
* **Pros**: Reclaims memory instantly when it is no longer needed. This prevents large memory build-ups and avoids the long, unpredictable pauses associated with other garbage collection models.
* **Cons**: Modifying counters on every reference update adds significant execution overhead, particularly in multi-threaded environments where counters must be updated using slow, atomic hardware operations.
* **The Cyclic Reference Problem**: Reference counting cannot resolve cyclic dependencies. If Object A points to Object B, and Object B points to Object A, their reference counts will never drop to `0`, even if both become completely disconnected from the rest of the application. This causes a memory leak that must be solved using weak references or auxiliary tracing sweeps.

---

## Tracing Garbage Collection: Mark-Sweep-Compact

Instead of tracking every reference update in real time, **tracing garbage collection** operates periodically. The garbage collector runs at designated intervals, tracing object reference paths starting from application entry points (roots).

This approach can be compared to a professional cleaning service. Instead of running to the dumpster with every single piece of trash the moment it is created, you place discardable items in bins. The cleaning service arrives once a week, walks through the rooms you actually use (roots), labels items in those rooms as "keep" (marking), and then empties the wastebaskets containing everything else (sweeping).

Tracing GC uses three primary phases:
1. **Mark Phase**: The collector starts at root references (such as CPU registers, active stack frames, and global variables) and traverses the object graph. Every reachable object is flagged as "live".
2. **Sweep Phase**: The collector scans the entire heap space. The memory blocks of any objects not flagged as "live" are unlinked and returned to the allocator's free list.
3. **Compact Phase**: The collector relocates surviving live objects to a contiguous section of the heap. This resolves memory fragmentation, allowing the allocator to use simple bump-allocation for future requests.

---

## The Generational Hypothesis

Tracing the entire heap on every garbage collection cycle is inefficient, especially as the application's memory footprints grow. To optimize this, modern garbage collectors rely on the **generational hypothesis**: most objects die young.

In real-world applications, the majority of allocated objects are short-lived (such as temporary variables used inside a loop or request-scoped variables in a web handler). Objects that survive several collection cycles tend to remain active for a long time.

To leverage this, the heap is divided into distinct generations:
* **Ephemeral Space** (Young Generation): Contains newly allocated objects. This space is subdivided into the **Eden** space and two **Survivor** spaces. Most collection runs (minor GCs) only scan this young space. Surviving objects are copied between the survivor spaces before being promoted.
* **Tenured Space** (Old Generation): Stores objects that have survived multiple minor GC cycles. This space is scanned less frequently during major GCs (or full GCs), reducing execution pauses.

---

## Tri-Color Marking and Write Barriers

To perform garbage collection concurrently alongside active application threads, modern runtimes use the **tri-color marking** abstraction. Objects on the heap are categorized into three logical colors:

* **White**: Unvisited objects. These are candidates for deletion.
* **Grey**: Visited objects whose immediate child references have not yet been evaluated. These are queued for processing.
* **Black**: Visited objects whose child references have been fully evaluated. These are confirmed live and will not be swept.

The collection loop proceeds by popping a grey object from the queue, marking its white child references as grey, and marking the parent object as black. This loop runs until no grey objects remain in the queue.

### The Concurrent Invalidation Problem and Write Barriers
If the collector runs concurrently with application threads, the application might modify references during the sweep. For example, if a thread updates a black object to point to a white object, and deletes the only reference to that white object from any remaining grey objects, the collector will never visit the white object. The white object remains white, and the collector will delete it, causing a critical memory corruption bug.

To prevent this, concurrent collectors enforce a **write barrier**. This hook intercepts runtime reference modifications. If the application attempts to point a black object to a white object, the write barrier intercepts the update and promotes the white object to grey, ensuring it is scanned and preserved.

<svg viewBox="0 0 580 340" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="24" fill="#88c0d0" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Tri-Color Marking and Write Barrier Action</text>
  <rect x="20" y="50" width="80" height="30" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1.5"/>
  <text x="60" y="68" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">Root References</text>
  <rect x="140" y="50" width="80" height="30" rx="4" fill="#2e3440" stroke="#eceff4" stroke-width="1.5"/>
  <text x="180" y="68" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">Black (Live)</text>
  <rect x="260" y="50" width="80" height="30" rx="4" fill="#3b4252" stroke="#ebcb8b" stroke-width="1.5"/>
  <text x="300" y="68" fill="#ebcb8b" font-family="sans-serif" font-size="10" text-anchor="middle">Grey (Visited)</text>
  <rect x="380" y="50" width="80" height="30" rx="4" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="420" y="68" fill="#81a1c1" font-family="sans-serif" font-size="10" text-anchor="middle">White (Unvisited)</text>
  <line x1="60" y1="80" x2="60" y2="150" stroke="#81a1c1" stroke-width="1.5" marker-end="url(#arr4)"/>
  <line x1="180" y1="80" x2="180" y2="150" stroke="#81a1c1" stroke-width="1.5" marker-end="url(#arr4)"/>
  <line x1="300" y1="80" x2="300" y2="150" stroke="#81a1c1" stroke-width="1.5" marker-end="url(#arr4)"/>
  <line x1="420" y1="80" x2="420" y2="150" stroke="#81a1c1" stroke-width="1.5" marker-end="url(#arr4)"/>
  <circle cx="60" cy="170" r="16" fill="#2e3440" stroke="#eceff4" stroke-width="2"/>
  <text x="60" y="173" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Root</text>
  <circle cx="180" cy="170" r="16" fill="#2e3440" stroke="#eceff4" stroke-width="2"/>
  <text x="180" y="173" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Obj A</text>
  <circle cx="300" cy="170" r="16" fill="#3b4252" stroke="#ebcb8b" stroke-width="2"/>
  <text x="300" y="173" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle">Obj B</text>
  <circle cx="420" cy="170" r="16" fill="#2e3440" stroke="#4c566a" stroke-width="1.5"/>
  <text x="420" y="173" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Obj C</text>
  <circle cx="500" cy="170" r="16" fill="#2e3440" stroke="#bf616a" stroke-width="1.5"/>
  <text x="500" y="173" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle">Obj D</text>
  <line x1="76" y1="170" x2="164" y2="170" stroke="#eceff4" stroke-width="1.5" marker-end="url(#arr4)"/>
  <line x1="196" y1="170" x2="284" y2="170" stroke="#ebcb8b" stroke-width="1.5" marker-end="url(#arr4)"/>
  <line x1="316" y1="170" x2="404" y2="170" stroke="#81a1c1" stroke-width="1.5" marker-end="url(#arr4)"/>
  <path d="M 180 186 C 180 230, 420 230, 420 186" stroke="#bf616a" stroke-width="1.5" fill="none" marker-end="url(#arr4)"/>
  <rect x="240" y="240" width="120" height="34" rx="4" fill="#3b4252" stroke="#bf616a" stroke-width="1"/>
  <text x="300" y="253" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">WRITE BARRIER</text>
  <text x="300" y="266" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">Promotes Obj C to Grey</text>
  <line x1="300" y1="230" x2="300" y2="210" stroke="#bf616a" stroke-width="1"/>
  <defs>
    <marker id="arr4" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#81a1c1"/>
    </marker>
  </defs>
  <rect x="20" y="295" width="540" height="30" rx="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="290" y="313" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Black objects point only to Grey or Black. The Write Barrier intercepts updates pointing to White objects.</text>
</svg>

---

## Mitigation of Heap Fragmentation

As objects of varying sizes are allocated and deallocated over time, the heap memory space becomes fragmented. A fragmented heap has plenty of total free memory, but that memory is split into tiny, non-contiguous gaps. If the application attempts to allocate a new object that is larger than any of the individual gaps, the allocation fails, triggering an Out-Of-Memory (OOM) error.

Runtimes mitigate fragmentation using three strategies:
* **Free Lists**: The allocator maintains lists of free memory blocks categorized by size. When an allocation request is made, the allocator checks the free list to find a block that matches the requested size.
* **Compaction Phase**: The garbage collector physically copies surviving objects to a contiguous region of the heap, consolidating all free space into a single block. This requires updating all pointer references throughout the application.
* **Bump Allocators**: If compaction is used, new memory can be allocated using a single pointer (the "bump" pointer). To allocate space, the allocator checks if the gap between the pointer and the end of the heap is large enough, allocates the memory, and increments (bumps) the pointer, executing in `O(1)` time.

---

## Real-World GC Architectures

Modern languages use garbage collectors that are optimized for their specific runtime environments and trade-offs:

* **Go**: Go uses a concurrent, tri-color mark-and-sweep collector. It is optimized for low latency, aiming for Stop-The-World (STW) pauses of less than one millisecond. Go relies heavily on compiler escape analysis to allocate variables on the stack rather than the heap whenever possible, reducing overall GC pressure.
* **Java (G1 / ZGC)**: The Java Virtual Machine (JVM) supports several garbage collectors. The **Garbage-First** (G1) collector divides the heap into regions and focuses sweeps on the regions containing the most dead objects. The newer **ZGC** is a scalable, low-latency collector designed to handle multi-terabyte heaps with STW pauses that do not exceed 10 milliseconds, using load barriers to track object relocations.
* **V8 (JavaScript)**: Google's V8 engine uses a generational collector. The young generation is managed by a **Scavenger** algorithm that copies live objects between survivor spaces, while the old generation is managed by a mark-sweep-compact collector.

---

## Further Reading

* [The Garbage Collection Handbook: The Art of Dynamic Memory Management](https://gchandbook.org/) — The definitive guide to garbage collection history and algorithms.
* [Go's Garbage Collector Guide](https://tip.golang.org/doc/gc-guide) — Detailed explanation of Go's concurrent collector design and tuning knobs.
* [An Introduction to ZGC](https://wiki.openjdk.org/display/zgc/Main) — Architectural overview of Java's low-latency, scalable garbage collector.
* [V8 Garbage Collection Internals](https://v8.dev/blog/trash-talk) — A technical write-up detailing how the V8 engine manages memory.
