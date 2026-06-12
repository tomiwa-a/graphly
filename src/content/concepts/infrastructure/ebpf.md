---
title: eBPF
slug: ebpf
summary: "Learn how eBPF executes sandboxed code inside the OS kernel, enabling low-overhead observability, custom network routing, and system monitoring."
difficulty: advanced
chapterId: infrastructure
domain: Infrastructure
estimatedMinutes: 15
prerequisites: [system-calls]
related: [observability-metrics-logs-traces, network-sockets-tcp-udp]
seo_title: "eBPF Architecture: Kernel Verification, Maps, and Hooks"
seo_description: "Explore the internals of eBPF. Learn about the kernel verifier, JIT compilation, maps, attachment points like Kprobes and XDP, and write BCC monitors."
canonical_url: "/concepts/ebpf"
citations:
  - title: "Learning eBPF: Programming the Linux Kernel for Observability and Networking"
    author: "Liz Rice"
    chapter: "Chapter 1 & 3"
    page_range: "1-54"
    external_link: "https://www.oreilly.com/library/view/learning-ebpf/9781098135119/"
  - title: "BPF Performance Tools"
    author: "Brendan Gregg"
    chapter: "Chapter 2: Technology Background"
    page_range: "31-64"
    external_link: "https://www.oreilly.com/library/view/bpf-performance-tools/9780136588245/"
code_examples:
  - language: python
    title: Syscall Execution Monitor and Latency Tracker (bcc / C Hybrid)
    code: |
      from bcc import BPF
      import time

      # 1. eBPF kernel program written in C
      ebpf_kernel_code = """
      #include <uapi/linux/ptrace.h>
      #include <linux/sched.h>

      // Define an eBPF Hash Map to share data between Kernel and User space
      // Key: Process ID (u32), Value: Start Timestamp in ns (u64)
      BPF_HASH(start_tracker, u32, u64);

      // Hook function for sys_enter_execve tracepoint
      int trace_execve_enter(void *ctx) {
          u64 ts = bpf_ktime_get_ns();
          u32 pid = bpf_get_current_pid_tgid() >> 32;

          // Record entry timestamp in the eBPF map
          start_tracker.update(&pid, &ts);
          return 0;
      }

      // Hook function for sys_exit_execve tracepoint
      int trace_execve_exit(void *ctx) {
          u64 exit_ts = bpf_ktime_get_ns();
          u32 pid = bpf_get_current_pid_tgid() >> 32;

          // Look up starting timestamp
          u64 *entry_ts = start_tracker.lookup(&pid);
          if (entry_ts != 0) {
              u64 latency = exit_ts - *entry_ts;
              // Print formatted tracing message to the kernel trace pipe
              bpf_trace_printk("Process ID %d execve latency: %lld ns\\n", pid, latency);
              start_tracker.delete(&pid);
          }
          return 0;
      }
      """

      # 2. Compile and load bytecode via bcc
      b = BPF(text=ebpf_kernel_code)

      # 3. Attach hooks to sys_enter_execve and sys_exit_execve tracepoints
      b.attach_tracepoint(tp="syscalls:sys_enter_execve", fn_name="trace_execve_enter")
      b.attach_tracepoint(tp="syscalls:sys_exit_execve", fn_name="trace_execve_exit")

      print("Tracing execve system call latency... Press Ctrl+C to stop.")

      # 4. Read events from the kernel trace pipe in user space
      while True:
          try:
              (task, pid, cpu, flags, ts, msg) = b.trace_fields()
              print(f"[{time.strftime('%H:%M:%S')}] Task: {task.decode()}, PID: {pid}, Message: {msg.decode()}")
          except KeyboardInterrupt:
              print("Detaching probes and exiting...")
              break
---

## Sandboxed Kernel Execution

The operating system kernel has absolute control over the hardware, CPU schedules, memory maps, and network routing. Traditionally, modifying kernel behavior required writing a **kernel module**. 

However, kernel modules are highly risky: a single memory error or null-pointer dereference will crash the entire operating system (triggering a kernel panic). Furthermore, kernel modules are tightly coupled to specific kernel versions, requiring constant maintenance and recompilation.

```
Traditional Kernel Module:
[Code] ---> [Loaded directly into Kernel Space] === (Crash in Code = Kernel Panic!)

eBPF Sandboxed Code:
[Code] ---> [Verifier Checks Safety] ---> [JIT compiler] ---> [Executed in Sandbox]
```

**eBPF** (Extended Berkeley Packet Filter) solves this problem by providing a secure, sandboxed virtual machine inside the kernel. It allows developers to run custom bytecode at helper hook points in the kernel without restarting the server or loading unstable modules. 

The eBPF runtime ensures that programs cannot crash the system, read invalid memory, or execute infinite loops, providing a safe bridge between user space applications and kernel-level performance.

---

## The eBPF Virtual Machine

The eBPF VM runs as a software-defined execution engine directly within the operating system kernel:

* **Registers**: Features eleven 64-bit registers: `R0` (return value register), `R1` to `R5` (argument registers), `R6` to `R9` (callee-saved registers), and `R10` (a read-only frame pointer to access the stack).
* **Stack Space**: Provides a small 512-byte stack frame. For larger storage allocations, programs must utilize external structures called eBPF Maps.
* **Helper Functions**: eBPF bytecode is restricted from calling arbitrary kernel routines. Instead, it interacts with the OS via restricted helper functions (e.g., retrieving the current PID via `bpf_get_current_pid_tgid()`).

---

## The Kernel Verification Engine

Before an eBPF program can be loaded, it must pass through the **Verifier**. The verifier performs static analysis to ensure execution safety before the code is compiled to native instructions:

1. **Control Flow Analysis**: The verifier constructs a Directed Acyclic Graph (DAG) of all possible execution branches. It rejects any programs containing infinite loops or unreachable states.
2. **Memory Safety**: Checks every read and write instruction to ensure the program only accesses memory on the stack or within validated maps. Pointers must be checked for NULL before dereferencing.
3. **Complexity Bounds**: Limits the number of instructions checked (historically 1 million instructions) to ensure verification terminates quickly.

Once verified, the **JIT (Just-In-Time) Compiler** translates the generic eBPF bytecode into native x86-64 or ARM assembly instructions, allowing the program to execute at native kernel speeds.

---

## Attachment Points and Hooks

eBPF programs are event-driven. They compile, register with the kernel, and wait for specific events to trigger execution at designated attachment points:

* **Kprobes & Kretprobes**: Dynamic probes attached to the entry (`kprobe`) or return (`kretprobe`) of any kernel function. 
* **Uprobes & Uretprobes**: User-space equivalent of kprobes. They hook functions within user-space applications (e.g. tracking when a Go HTTP server calls a database driver).
* **Tracepoints**: Static trace structures compiled directly into the kernel source by kernel developers. They are more stable than kprobes, which can change between kernel versions.
* **XDP (eXpress Data Path)**: A high-performance hook located directly in the network driver layer, immediately after packet reception. XDP allows eBPF programs to inspect, modify, or drop packets before they are parsed by the kernel's TCP/IP stack.

---

## eBPF Maps: Sharing Data

Because eBPF programs run in sandboxed kernel memory, they cannot write directly to user-space memory. To share state, they use **eBPF Maps**:

<svg viewBox="0 0 580 340" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="25" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">eBPF Lifecycle and Map Communication</text>
  <line x1="20" y1="140" x2="560" y2="140" stroke="#4c566a" stroke-width="1.5" stroke-dasharray="4,4"/>
  <text x="35" y="130" fill="#81a1c1" font-family="sans-serif" font-size="10" font-weight="bold">USER SPACE</text>
  <text x="35" y="160" fill="#81a1c1" font-family="sans-serif" font-size="10" font-weight="bold">KERNEL SPACE</text>
  <rect x="40" y="55" width="110" height="50" rx="6" fill="#2e3440" stroke="#88c0d0" stroke-width="1.5"/>
  <text x="95" y="77" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">BCC / Loader App</text>
  <text x="95" y="90" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Compiles &amp; Loads</text>
  <rect x="430" y="55" width="110" height="50" rx="6" fill="#2e3440" stroke="#88c0d0" stroke-width="1.5"/>
  <text x="485" y="77" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Metrics App</text>
  <text x="485" y="90" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Reads Telemetry</text>
  <rect x="40" y="180" width="110" height="45" rx="4" fill="#3b4252" stroke="#ebcb8b" stroke-width="1.2"/>
  <text x="95" y="200" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Verifier</text>
  <text x="95" y="212" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">Safety Check</text>
  <rect x="185" y="180" width="110" height="45" rx="4" fill="#3b4252" stroke="#88c0d0" stroke-width="1.2"/>
  <text x="240" y="200" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">JIT Compiler</text>
  <text x="240" y="212" fill="#88c0d0" font-family="sans-serif" font-size="8" text-anchor="middle">Native Bytecode</text>
  <rect x="185" y="265" width="110" height="45" rx="4" fill="#3b4252" stroke="#a3be8c" stroke-width="1.2"/>
  <text x="240" y="285" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Kernel Hook</text>
  <text x="240" y="297" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">e.g. sys_enter</text>
  <rect x="430" y="180" width="110" height="130" rx="6" fill="#3b4252" stroke="#eceff4" stroke-width="1.5"/>
  <text x="485" y="205" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">eBPF Maps</text>
  <text x="485" y="220" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">(Hash Tables / Arrays)</text>
  <rect x="440" y="240" width="90" height="20" rx="3" fill="#2e3440"/>
  <text x="485" y="253" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">PID: 4125 -> ts</text>
  <rect x="440" y="270" width="90" height="20" rx="3" fill="#2e3440"/>
  <text x="485" y="283" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">PID: 5510 -> ts</text>
  <path d="M 95 105 L 95 180" stroke="#88c0d0" stroke-width="1.5" fill="none" marker-end="url(#arrow_ebpf)"/>
  <defs>
    <marker id="arrow_ebpf" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#88c0d0"/>
    </marker>
  </defs>
  <text x="135" y="130" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">sys_bpf()</text>
  <path d="M 150 202 L 185 202" stroke="#88c0d0" stroke-width="1.5" fill="none" marker-end="url(#arrow_ebpf)"/>
  <path d="M 240 225 L 240 265" stroke="#88c0d0" stroke-width="1.5" fill="none" marker-end="url(#arrow_ebpf)"/>
  <path d="M 295 287 L 430 287" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#arrow_ebpf)"/>
  <text x="360" y="280" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">Write entry stats</text>
  <path d="M 485 180 L 485 105" stroke="#88c0d0" stroke-width="1.5" fill="none" marker-end="url(#arrow_ebpf)"/>
  <text x="525" y="130" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Read maps</text>
</svg>

Maps are key-value structures initialized in kernel space. They can be read or written by both eBPF kernel programs and user-space controllers. Common map formats include:

* **Hash Tables**: Dynamic key-value pairs, ideal for matching processes to state tags.
* **Ring Buffers**: High-throughput queues designed to stream structured event sequences from the kernel to user space.
* **Arrays**: Fixed-size tables, useful for accumulating counters and metrics.

---

## Observability and High-Performance Networking

eBPF has revolutionized backend systems engineering by changing how observability and networking are implemented:

### Low-Overhead Observability

Traditional monitoring agents poll log files or intercept system calls by wrapping user commands. This introduces significant CPU overhead. eBPF hooks directly into kernel tracepoints, aggregating system statistics (such as execution times or disk latency distributions) inside local kernel maps. The user-space metrics collector only reads from these maps periodically, minimizing context-switching overhead.

### High-Performance Networking (XDP)

In traditional networking, every packet travels up the network driver, through the IP routing tables, through firewalls (like iptables), and up to the TCP socket buffer. 

Using eBPF with XDP, you can drop DDoS packets or route incoming queries at the network card driver level. This bypasses the TCP/IP stack entirely, enabling servers to process millions of packets per second with minimal CPU load.

---

## Further Reading

* [eBPF Document Portal](https://ebpf.io/) — Foundational resources, code directories, and community projects using eBPF
* [Learning eBPF](https://www.oreilly.com/library/view/learning-ebpf/9781098135119/) — Liz Rice's textbook explaining raw eBPF assembly, BCC, and Go-BPF loaders
* [Linux Kernel BPF Documentation](https://www.kernel.org/doc/html/latest/bpf/) — Official specifications of the eBPF VM, register rules, and verifier safety structures
