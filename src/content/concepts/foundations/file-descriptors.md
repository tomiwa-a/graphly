---
title: File Descriptors
slug: file-descriptors
summary: "Learn how Unix represents every I/O resource as a file descriptor, why servers run out of them, and how event loops watch thousands at once."
difficulty: intermediate
chapterId: foundations
domain: Foundations
estimatedMinutes: 10
prerequisites: [processes-threads]
related: [virtual-memory]
seo_title: "File Descriptors Explained | Graphly"
seo_description: "Understand Unix file descriptors: how stdin/stdout/stderr work, why high-traffic servers exhaust fd limits, how epoll enables I/O multiplexing, and how to diagnose fd leaks."
canonical_url: "/concepts/file-descriptors"
code_examples:
  - language: bash
    title: Inspecting file descriptors
    code: |
      # Check the fd limit for the current shell
      ulimit -n

      # Raise the soft limit to 65536 for the current session
      ulimit -n 65536

      # List all open fds for a running process
      lsof -p <pid>

      # Browse fd symlinks directly on Linux
      ls -la /proc/<pid>/fd/

      # Count open fds for a process
      ls /proc/<pid>/fd | wc -l
  - language: go
    title: Always close resources to avoid fd leaks
    code: |
      package main

      import (
        "fmt"
        "os"
      )

      func readConfig(path string) ([]byte, error) {
        f, err := os.Open(path)
        if err != nil {
          return nil, err
        }
        defer f.Close() // fd is freed when the function returns

        buf := make([]byte, 4096)
        n, err := f.Read(buf)
        if err != nil {
          return nil, err
        }
        return buf[:n], nil
      }

      func main() {
        data, err := readConfig("/etc/hostname")
        if err != nil {
          fmt.Fprintln(os.Stderr, err)
          os.Exit(1)
        }
        fmt.Printf("hostname: %s\n", data)
      }
---

## Everything in Unix is a file

One of Unix's most elegant design decisions is that almost every I/O resource looks the same from a program's perspective: regular files, directories, network sockets, pipes, terminals, device drivers, and even inter-process communication channels all share the same read/write interface.

This is the **"everything is a file"** philosophy. Your program does not need special APIs for network sockets vs disk files — in both cases it calls `read()` and `write()` with an integer handle. That integer handle is a **file descriptor** (fd).

## What is a file descriptor?

A **file descriptor** is a small non-negative integer that is an index into a per-process table maintained by the kernel. When you open a file, connect a socket, or create a pipe, the kernel:

1. Creates (or reuses) a kernel-level file description object tracking the resource, its offset, and its flags.
2. Adds a pointer to that object in the process's open file table.
3. Returns the index of that slot to the process — that index is the file descriptor.

fd `0`, `1`, and `2` are always pre-opened by the OS for every process:

* `0` — **stdin**: the standard input stream (usually your keyboard or a pipe).
* `1` — **stdout**: the standard output stream (usually the terminal).
* `2` — **stderr**: the standard error stream (also usually the terminal, but separate from stdout).

Every subsequent resource gets the next available integer: `3`, `4`, `5`, and so on.

## The fd table visualised

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 310" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <!-- Title -->
  <text x="290" y="24" font-family="sans-serif" font-size="13" fill="#88c0d0" text-anchor="middle" font-weight="bold">Process Open File Table</text>
  <!-- Process box header -->
  <rect x="20" y="34" width="160" height="230" rx="8" fill="#2e3440" stroke="#4c566a" stroke-width="1.5"/>
  <text x="100" y="54" font-family="sans-serif" font-size="12" fill="#88c0d0" text-anchor="middle" font-weight="bold">Process (pid 1234)</text>
  <!-- fd rows -->
  <rect x="30" y="62" width="140" height="28" rx="4" fill="#3b4252" stroke="#81a1c1" stroke-width="1"/>
  <text x="60" y="81" font-family="sans-serif" font-size="11" fill="#88c0d0" text-anchor="middle">fd 0</text>
  <text x="130" y="81" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">stdin</text>
  <rect x="30" y="98" width="140" height="28" rx="4" fill="#3b4252" stroke="#81a1c1" stroke-width="1"/>
  <text x="60" y="117" font-family="sans-serif" font-size="11" fill="#88c0d0" text-anchor="middle">fd 1</text>
  <text x="130" y="117" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">stdout</text>
  <rect x="30" y="134" width="140" height="28" rx="4" fill="#3b4252" stroke="#81a1c1" stroke-width="1"/>
  <text x="60" y="153" font-family="sans-serif" font-size="11" fill="#88c0d0" text-anchor="middle">fd 2</text>
  <text x="130" y="153" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">stderr</text>
  <rect x="30" y="170" width="140" height="28" rx="4" fill="#3b4252" stroke="#a3be8c" stroke-width="1"/>
  <text x="60" y="189" font-family="sans-serif" font-size="11" fill="#88c0d0" text-anchor="middle">fd 3</text>
  <text x="130" y="189" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">config.json</text>
  <rect x="30" y="206" width="140" height="28" rx="4" fill="#3b4252" stroke="#ebcb8b" stroke-width="1"/>
  <text x="60" y="225" font-family="sans-serif" font-size="11" fill="#88c0d0" text-anchor="middle">fd 4</text>
  <text x="130" y="225" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">TCP socket</text>
  <rect x="30" y="242" width="140" height="12" rx="2" fill="#4c566a"/>
  <text x="100" y="252" font-family="sans-serif" font-size="9" fill="#81a1c1" text-anchor="middle">... more fds ...</text>
  <!-- Kernel file descriptions (right side) -->
  <rect x="310" y="34" width="250" height="240" rx="8" fill="#2e3440" stroke="#4c566a" stroke-width="1.5"/>
  <text x="435" y="54" font-family="sans-serif" font-size="12" fill="#88c0d0" text-anchor="middle" font-weight="bold">Kernel File Descriptions</text>
  <!-- Kernel entries -->
  <rect x="320" y="62" width="230" height="28" rx="4" fill="#3b4252" stroke="#81a1c1" stroke-width="1"/>
  <text x="435" y="81" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">Terminal (keyboard / tty)</text>
  <rect x="320" y="98" width="230" height="28" rx="4" fill="#3b4252" stroke="#81a1c1" stroke-width="1"/>
  <text x="435" y="117" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">Terminal (display / tty)</text>
  <rect x="320" y="134" width="230" height="28" rx="4" fill="#3b4252" stroke="#81a1c1" stroke-width="1"/>
  <text x="435" y="153" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">Terminal (error / tty)</text>
  <rect x="320" y="170" width="230" height="28" rx="4" fill="#3b4252" stroke="#a3be8c" stroke-width="1"/>
  <text x="435" y="189" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">Inode: /etc/config.json (offset 0)</text>
  <rect x="320" y="206" width="230" height="28" rx="4" fill="#3b4252" stroke="#ebcb8b" stroke-width="1"/>
  <text x="435" y="225" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">Socket: 192.168.1.1:443 (TCP)</text>
  <!-- Arrows -->
  <line x1="170" y1="76" x2="318" y2="76" stroke="#81a1c1" stroke-width="1.2" marker-end="url(#arr)"/>
  <line x1="170" y1="112" x2="318" y2="112" stroke="#81a1c1" stroke-width="1.2" marker-end="url(#arr)"/>
  <line x1="170" y1="148" x2="318" y2="148" stroke="#81a1c1" stroke-width="1.2" marker-end="url(#arr)"/>
  <line x1="170" y1="184" x2="318" y2="184" stroke="#a3be8c" stroke-width="1.2" marker-end="url(#arr2)"/>
  <line x1="170" y1="220" x2="318" y2="220" stroke="#ebcb8b" stroke-width="1.2" marker-end="url(#arr3)"/>
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#81a1c1"/>
    </marker>
    <marker id="arr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#a3be8c"/>
    </marker>
    <marker id="arr3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#ebcb8b"/>
    </marker>
  </defs>
  <!-- Caption -->
  <text x="290" y="295" font-family="sans-serif" font-size="10" fill="#81a1c1" text-anchor="middle">Each fd is an index into the process table; each entry points to a kernel file description with the real resource.</text>
</svg>

## stdin, stdout, stderr, and shell redirection

Because stdout is just fd `1` pointing at the terminal, shell redirection simply swaps what fd `1` points to:

```bash
# Before: fd 1 -> terminal
echo "hello"

# After: fd 1 -> myfile.txt (kernel reopens the target and replaces the pointer)
echo "hello" > myfile.txt
```

Pipes work the same way. `ls | grep foo` creates an anonymous pipe, sets fd `1` of `ls` to the write end of the pipe, and sets fd `0` of `grep` to the read end. No temporary files involved.

When you write `2>&1` in a shell script, you are duplicating fd `2` to point at the same resource as fd `1` — so stderr and stdout both flow to the same destination.

## Why servers run out of file descriptors

Every accepted TCP connection consumes one file descriptor. A busy HTTP server handling 10,000 simultaneous connections needs at least 10,000 open fds, plus fds for config files, log files, database connections, and more.

The OS enforces a per-process fd limit. On most Linux distributions the default soft limit is **1,024**. When a process tries to open or accept beyond that limit, the syscall returns `EMFILE` — "too many open files". Applications surface this as errors like:

```
Error: EMFILE: too many open files
accept: too many open files
```

The fix is to raise the limit before the process starts:

```bash
# Check current soft and hard limits
ulimit -Sn   # soft limit (enforced)
ulimit -Hn   # hard limit (ceiling for the soft limit)

# Raise the soft limit to 65536 for this session
ulimit -n 65536

# For a system service, set in /etc/security/limits.conf:
# myapp soft nofile 65536
# myapp hard nofile 131072
```

Production systems running Nginx, Redis, or PostgreSQL routinely configure limits of 65,536 to 1,048,576.

## I/O multiplexing: watching many fds at once

The naive approach to handling many connections is to assign one thread per connection. Each thread blocks on `read()`, waiting for its connection to produce data. With 10,000 connections you would need 10,000 threads — expensive to create, and most would be asleep at any moment.

**I/O multiplexing** solves this by letting a single thread ask the kernel: "wake me up when *any* of these fds has data ready." The key syscalls are:

* `select()` — oldest, portable, but limited to 1,024 fds and slow (`O(n)` scan).
* `poll()` — removes the 1,024 limit but still `O(n)`.
* `epoll()` (Linux) / `kqueue` (macOS/BSD) — `O(1)` wakeup. The kernel maintains a set of watched fds and only returns the ones that are ready. Scales to hundreds of thousands of fds.

This is the foundation of every high-performance server:

* **Node.js** runs a single JavaScript thread backed by libuv, which uses `epoll`/`kqueue` under the hood.
* **Nginx** uses an event loop per worker process, each watching thousands of connections with `epoll`.
* **Go's** net package uses non-blocking sockets and its runtime integrates with `epoll` so goroutines block at the Go scheduler level, not the OS thread level.

The mental model: instead of one thread per sleeping connection, you have one thread watching a scoreboard. The kernel taps the thread on the shoulder only when a connection has actual work to do.

## Inspecting open file descriptors

On Linux, the `/proc` filesystem exposes every process's open fds as symbolic links:

```bash
# List all open fds for process 1234
ls -la /proc/1234/fd/

# Output looks like:
# lrwxrwxrwx 1 root root 64 Jun 11 09:00 0 -> /dev/pts/0
# lrwxrwxrwx 1 root root 64 Jun 11 09:00 1 -> /dev/pts/0
# lrwxrwxrwx 1 root root 64 Jun 11 09:00 3 -> /var/log/app.log
# lrwxrwxrwx 1 root root 64 Jun 11 09:00 4 -> socket:[12345]

# Count how many fds a process currently has open
ls /proc/1234/fd | wc -l
```

`lsof` (list open files) is the friendlier cross-platform tool:

```bash
# All open files for a process
lsof -p 1234

# Only network connections
lsof -p 1234 -i

# Find which process has a specific file open
lsof /var/log/app.log
```

## fd leaks

An **fd leak** happens when code opens a file or socket but never closes it. The fd number is never returned to the pool. Over time the count climbs until it hits the limit and every subsequent `open()` or `accept()` fails.

Common causes:

* Returning early from a function before calling `close()` — use `defer f.Close()` in Go or `try/finally` in Python/Java.
* Exception paths that skip cleanup.
* Forgetting to close the write end of a pipe after `fork()`.

```go
func readConfig(path string) ([]byte, error) {
  f, err := os.Open(path)
  if err != nil {
    return nil, err
  }
  defer f.Close() // runs when the function returns, even on error paths

  buf := make([]byte, 4096)
  n, err := f.Read(buf)
  if err != nil {
    return nil, err
  }
  return buf[:n], nil
}
```

To diagnose a leak in a running process, watch the fd count grow over time:

```bash
watch -n 1 "ls /proc/<pid>/fd | wc -l"
```

If the number climbs monotonically and never falls, you have a leak. Use `lsof -p <pid>` to see which types of resources are accumulating.

## Code example

```bash
# Check the fd limit for the current shell
ulimit -n

# Raise the soft limit to 65536 for the current session
ulimit -n 65536

# List all open fds for a running process
lsof -p <pid>

# Browse fd symlinks directly on Linux
ls -la /proc/<pid>/fd/

# Count open fds for a process
ls /proc/<pid>/fd | wc -l
```

## Further Reading

* [Everything is a file (Wikipedia)](https://en.wikipedia.org/wiki/Everything_is_a_file) — history and scope of the Unix philosophy
* [File descriptors explained (Julia Evans)](https://jvns.ca/blog/2021/01/09/reading-a-stream-of-json/) — practical illustrations of how fds work in real programs
* [How epoll works (Cindy Sridharan)](https://copyconstruct.medium.com/the-method-to-epolls-madness-d9d2d6378642) — deep dive into the Linux epoll mechanism
* [lsof manual (die.net)](https://linux.die.net/man/8/lsof) — complete reference for the `lsof` tool
* [Linux file descriptor limits (Remy Sharp)](https://remysharp.com/2012/11/21/a-node-in-production) — real-world Node.js production lessons on fd exhaustion
