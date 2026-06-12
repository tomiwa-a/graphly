---
title: mmap & Page Cache
slug: mmap-page-cache
summary: "Learn how the operating system caches physical disk blocks in RAM and uses memory mapping to optimize file I/O operations."
difficulty: advanced
chapterId: foundations
domain: Foundations
estimatedMinutes: 15
prerequisites: [virtual-memory, file-descriptors]
related: [system-calls]
seo_title: "mmap and Page Cache: Zero-Copy File I/O Optimization"
seo_description: "Explore the internal architecture of mmap and the OS Page Cache. Learn how page faults, pdflush, MAP_SHARED, O_DIRECT, and madvise optimize high-performance storage engines."
canonical_url: "/concepts/mmap-page-cache"
citations:
  - title: "The Linux Programming Interface"
    author: "Michael Kerrisk"
    chapter: "Chapter 13: File I/O Buffering, Chapter 49: Memory Mappings"
    page_range: "243-264, 1017-1056"
    external_link: "https://man7.org/tlpi/"
  - title: "Linux System Programming"
    author: "Robert Love"
    chapter: "Chapter 4: Advanced File I/O"
    page_range: "111-140"
    external_link: "https://www.oreilly.com/library/view/linux-system-programming/9781449341527/"
code_examples:
  - language: c
    title: "High-Performance File Search using memory-mapped I/O (mmap)"
    code: |
      #define _GNU_SOURCE
      #include <stdio.h>
      #include <stdlib.h>
      #include <string.h>
      #include <fcntl.h>
      #include <unistd.h>
      #include <sys/mman.h>
      #include <sys/stat.h>

      int main(int argc, char *argv[]) {
          if (argc < 3) {
              fprintf(stderr, "Usage: %s <filename> <search_string>\n", argv[0]);
              exit(EXIT_FAILURE);
          }

          const char *filename = argv[1];
          const char *search_str = argv[2];
          size_t search_len = strlen(search_str);

          int fd = open(filename, O_RDONLY);
          if (fd == -1) { perror("open"); exit(EXIT_FAILURE); }

          struct stat sb;
          if (fstat(fd, &sb) == -1) { perror("fstat"); close(fd); exit(EXIT_FAILURE); }
          size_t file_size = sb.st_size;

          if (file_size == 0) {
              printf("File is empty.\n");
              close(fd);
              return 0;
          }

          // Map the file into the process's virtual memory address space
          char *mapped_data = mmap(NULL, file_size, PROT_READ, MAP_SHARED, fd, 0);
          if (mapped_data == MAP_FAILED) {
              perror("mmap"); close(fd); exit(EXIT_FAILURE);
          }

          // Declare advice to guide the kernel's read-ahead paging engine
          madvise(mapped_data, file_size, MADV_SEQUENTIAL);
          madvise(mapped_data, file_size, MADV_WILLNEED);

          // Perform in-memory search across mapped data pointer offsets
          size_t match_count = 0;
          for (size_t i = 0; i <= file_size - search_len; i++) {
              if (memcmp(&mapped_data[i], search_str, search_len) == 0) {
                  match_count++;
                  printf("Match found at offset %zu\n", i);
              }
          }

          printf("Total matches: %zu\n", match_count);

          // Clean up resources
          if (munmap(mapped_data, file_size) == -1) { perror("munmap"); }
          close(fd);
          return 0;
      }
---

## The Operating System Page Cache

To reconcile the performance gap between fast physical RAM and slow storage devices, the operating system kernel implements a caching layer called the **Page Cache**. 

When an application requests a file write or read operation:

* The kernel does not execute a round-trip operation directly to physical storage.
* Instead, it organizes system memory (RAM) into fixed-size segments called **pages** (usually 4 KB).
* The kernel copies requested data sectors from disk blocks into these memory pages, fulfilling future queries from memory.

By serving I/O requests from cache pages, the system avoids hardware latency. If the requested data block is found in RAM, it results in a **cache hit**. If the data must be loaded from storage, it is a **cache miss**, requiring the calling thread to wait while the sector is transferred.

---

## Direct Memory Mapping via mmap

The traditional way to interact with files is through system calls like `read()` and `write()`. These functions require the application to manage data buffers in user space, which can introduce performance overhead.

The **`mmap()`** system call provides an alternative. Instead of copying data, it projects a file descriptor's blocks directly into the process's virtual address space.

```
                  ┌─────────────────────────────────────┐
                  │      Virtual Address Space          │
                  │  0x7fff12000 -> [Mapped File Page]  │
                  └──────────────────┬──────────────────┘
                                     │
                        (Direct Address Translation)
                                     ▼
                  ┌─────────────────────────────────────┐
                  │      Physical RAM Page Cache        │
                  │   [ Data Buffer in Memory ]         │
                  └──────────────────┬──────────────────┘
                                     │
                            (Flushed by Kernel)
                                     ▼
                  ┌─────────────────────────────────────┐
                  │         Physical Disk Blocks        │
                  │   [ File Saved on SSD/HDD ]         │
                  └─────────────────────────────────────┘
```

When you call `mmap()`, the kernel updates the process page tables to point to the file blocks, returning a memory pointer to the mapping's starting address. 

The application can then read and write file data using standard memory pointer offsets, such as:

```c
char data = mapped_pointer[offset];
```

The kernel manages the address translations behind the scenes, ensuring the physical pages are loaded and synchronized.

---

## Synchronization Logic: Flusher Threads and msync

When an application writes to a memory-mapped file, it modifies the data page in RAM. The kernel flags this modified page as a **dirty page**.

These modified blocks are not immediately written to disk. The operating system uses an asynchronous flush mechanism:

* **Kernel Flusher Threads**: Background routines (such as `pdflush`, `flush`, or `kswapd` in Linux) monitor dirty pages.
* **Dirty Page Limits**: When dirty pages exceed a configurable percentage of system memory, or when they remain modified longer than a timeout limit (often 30 seconds), these threads write the changes back to storage.

To enforce synchronization and ensure updates are safely committed to disk, applications can call:

```c
int msync(void *addr, size_t length, int flags);
```

The `flags` parameter controls the synchronization behavior:

* `MS_ASYNC`: Schedules the writeback but returns immediately.
* `MS_SYNC`: Blocks the calling thread until the dirty pages are written to disk.

---

## The Double-Buffering Overhead

Using standard file I/O operations like `read()` can introduce memory overhead due to a phenomenon called **double-buffering**.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 340" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="24" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Memory Access Models: Standard I/O vs. Memory Mapped I/O</text>
  <line x1="290" y1="50" x2="290" y2="310" stroke="#4c566a" stroke-dasharray="3,3" stroke-width="1.5"/>
  <text x="145" y="55" fill="#eceff4" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Standard I/O (read/write)</text>
  <text x="435" y="55" fill="#a3be8c" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Memory Mapped I/O (mmap)</text>
  <rect x="35" y="80" width="220" height="40" rx="4" fill="#2e3440" stroke="#81a1c1" stroke-width="1"/>
  <text x="145" y="104" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">User Space Buffer (Process Heap)</text>
  <rect x="35" y="165" width="220" height="40" rx="4" fill="#3b4252" stroke="#ebcb8b" stroke-width="1"/>
  <text x="145" y="189" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">Kernel Page Cache (RAM)</text>
  <rect x="35" y="250" width="220" height="40" rx="4" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="145" y="274" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">Physical Storage (SSD/Disk)</text>
  <path d="M 145 250 L 145 205" stroke="#ebcb8b" stroke-width="1.5" fill="none"/>
  <polygon points="145,205 142,212 148,212" fill="#ebcb8b"/>
  <text x="150" y="232" fill="#ebcb8b" font-family="sans-serif" font-size="8">1. Disk DMA Copy</text>
  <path d="M 145 165 L 145 120" stroke="#bf616a" stroke-width="1.5" fill="none"/>
  <polygon points="145,120 142,127 148,127" fill="#bf616a"/>
  <text x="150" y="147" fill="#bf616a" font-family="sans-serif" font-size="8">2. CPU Memory Copy</text>
  <rect x="325" y="80" width="220" height="40" rx="4" fill="#2e3440" stroke="#88c0d0" stroke-width="1"/>
  <text x="435" y="104" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">Virtual Address Space (Page Table)</text>
  <rect x="325" y="165" width="220" height="40" rx="4" fill="#3b4252" stroke="#ebcb8b" stroke-width="1"/>
  <text x="435" y="189" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">Kernel Page Cache (Shared RAM)</text>
  <rect x="325" y="250" width="220" height="40" rx="4" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="435" y="274" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">Physical Storage (SSD/Disk)</text>
  <path d="M 435 250 L 435 205" stroke="#ebcb8b" stroke-width="1.5" fill="none"/>
  <polygon points="435,205 432,212 438,212" fill="#ebcb8b"/>
  <text x="440" y="232" fill="#ebcb8b" font-family="sans-serif" font-size="8">1. Disk DMA Copy</text>
  <path d="M 435 120 L 435 165" stroke="#a3be8c" stroke-width="1.5" stroke-dasharray="3,2" fill="none"/>
  <polygon points="435,165 432,158 438,158" fill="#a3be8c"/>
  <text x="440" y="147" fill="#a3be8c" font-family="sans-serif" font-size="8">Direct Memory Pointer (Zero-Copy)</text>
</svg>

In the standard model:
1. The kernel performs a direct memory access copy to read the file blocks from disk into the Page Cache.
2. The `read()` call copies that data from the Page Cache into the application's user space buffer.

This copies the same data twice and duplicates it in memory. 

By contrast, memory mapping uses a **zero-copy** model. Because the process's page tables point directly to the Page Cache pages, accessing the pointer reads the cache memory directly. This avoids the second copy step, reducing CPU and memory overhead.

---

## Page Faults and Demand Paging

When an application calls `mmap()`, the operating system does not immediately load the file contents into RAM. Instead, it uses **demand paging**.

The OS configures the virtual memory mapping but marks the pages as *not present* in the hardware page tables. The file data is loaded only when the process attempts to read or write to that specific memory address range:

1. **The Trap**: The CPU's Memory Management Unit (MMU) intercepts the access attempt and generates a **page fault** exception, halting the thread.
2. **Page Check**: The OS kernel handles the page fault and determines which file block maps to that virtual address.
3. **Hard Page Fault**: If the requested page is not in RAM, the kernel performs disk I/O to load the file block into a physical memory page.
4. **Soft Page Fault**: If the page is already in RAM (cached by another process), the kernel skips the disk read and updates the page table to point to it.
5. **Resume**: The kernel updates the page table flags, and the CPU resumes executing the process instruction.

To prevent memory exhaustion, the kernel runs page eviction algorithms (like Least Recently Used or Least Frequently Used) to swap inactive pages out and free up RAM.

---

## Shared vs. Private Mappings

When calling `mmap()`, you must specify a mapping type flag that controls how edits are shared:

* **`MAP_SHARED`**: Edits made to the mapped memory pointer are shared with other processes mapping the same file. The updates are directly written to the kernel's Page Cache, making them visible to other processes and eventually flushed to disk.
* **`MAP_PRIVATE`**: Writes to this region use a **copy-on-write** mechanism. When the process modifies a page, the kernel makes a private copy of it in RAM. The edits are visible only to the writing process and are never written back to the underlying file.

---

## Advisory Declarations via madvise

Applications can optimize memory-mapped I/O performance by declaring their expected access patterns using the **`madvise()`** system call:

```c
int madvise(void *addr, size_t length, int advice);
```

This call guides the kernel's prefetching and caching decisions:

* `MADV_SEQUENTIAL`: Tells the kernel to prefetch upcoming pages, optimizing sequential reads.
* `MADV_RANDOM`: Disables read-ahead optimizations, preventing the kernel from wasting disk I/O on pages that might not be accessed.
* `MADV_WILLNEED`: Instructs the kernel to begin loading the mapped page range into memory immediately, reducing page fault latency during runtime.

---

## Bypassing the Cache with O_DIRECT

While the Page Cache improves performance for most workloads, it can introduce overhead for storage engines like databases that manage their own application-level caching.

To bypass the Page Cache, applications can open files using the **`O_DIRECT`** flag:

```c
int fd = open("database.db", O_RDWR | O_DIRECT);
```

When executing writes or reads on a file opened with `O_DIRECT`, data is transferred directly between physical disk blocks and the application's user space buffer, bypassing the kernel's Page Cache. 

This gives database engines precise control over memory layouts and write timing, though it requires all user buffers and transfers to align with the physical block boundaries of the storage device.

---

## Further Reading

* [The Linux Programming Interface](https://man7.org/tlpi/) — Chapter 13 covers I/O buffering; Chapter 49 details memory mapping flags and architecture.
* [Linux System Programming](https://www.oreilly.com/library/view/linux-system-programming/9781449341527/) — Chapter 4 provides practical guidelines on memory-mapped file search engines.
* [What Every Programmer Should Know About Memory](https://people.freebsd.org/~lstewart/articles/cpumemory.pdf) — Ulrich Drepper's guide to hardware layouts and caching.
* [Linux Kernel Page Cache Documentation](https://www.kernel.org/doc/html/latest/admin-guide/sysctl/vm.html) — Explains virtual memory management parameters like dirty page ratios.
