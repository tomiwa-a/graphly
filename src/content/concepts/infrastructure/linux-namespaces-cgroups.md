---
title: Linux Namespaces & Cgroups
slug: linux-namespaces-cgroups
summary: "Under the hood of containerization: isolating processes, networks, and mount points with namespaces, and enforcing resources limits with cgroups."
difficulty: advanced
chapterId: infrastructure
domain: Infrastructure
estimatedMinutes: 15
prerequisites: [containerization, processes-threads]
related: [docker, virtual-memory]
seo_title: "Linux Namespaces & Cgroups: Container Isolation Internals"
seo_description: "Learn how Linux namespaces and cgroups power container isolation. Discover system calls, namespaces (PID, Net, Mount), cgroups limits, and veth network routing."
canonical_url: "/concepts/linux-namespaces-cgroups"
citations:
  - title: "The Linux Programming Interface"
    author: "Michael Kerrisk"
    chapter: "Chapter 53: POSIX Semaphores (for concurrency baseline) and namespaces/cgroups sections"
    page_range: "1101-1140"
    external_link: "https://man7.org/tlpi/"
  - title: "Control Groups v2"
    author: "Linux Kernel Organization"
    chapter: "Documentation/admin-guide/cgroup-v2.rst"
    page_range: "Section 1-3"
    external_link: "https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html"
code_examples:
  - language: go
    title: Creating a Container Namespace Sandbox from Scratch
    code: |
      package main

      import (
          "fmt"
          "os"
          "os/exec"
          "syscall"
      )

      // Run this code on a Linux host (or in a VM).
      // Execute with: go run main.go run <command> <args>
      func main() {
          if len(os.Args) < 2 {
              fmt.Println("Usage: go run main.go run [command] [args...]")
              os.Exit(1)
          }

          switch os.Args[1] {
          case "run":
              runParent()
          case "child":
              runChild()
          default:
              fmt.Printf("Unknown command: %s\n", os.Args[1])
              os.Exit(1)
          }
      }

      func runParent() {
          fmt.Printf("Running parent process (PID: %d)\n", os.Getpid())

          // Re-execute this binary as a child process, specifying the "child" argument
          cmd := exec.Command("/proc/self/exe", append([]string{"child"}, os.Args[2:]...)...)
          cmd.Stdin = os.Stdin
          cmd.Stdout = os.Stdout
          cmd.Stderr = os.Stderr

          // Configure namespace isolation flags
          cmd.SysProcAttr = &syscall.SysProcAttr{
              Cloneflags: syscall.CLONE_NEWUTS | // New hostnames namespace
                  syscall.CLONE_NEWPID | // New process ID space (child will be PID 1)
                  syscall.CLONE_NEWNS |  // New mount namespace
                  syscall.CLONE_NEWNET,  // New isolated loopback network
          }

          if err := cmd.Run(); err != nil {
              fmt.Printf("Error running child process: %v\n", err)
              os.Exit(1)
          }
      }

      func runChild() {
          fmt.Printf("Running child container sandbox (PID: %d)\n", os.Getpid())

          // 1. Set hostname inside the isolated UTS namespace
          if err := syscall.Sethostname([]byte("container-sandbox")); err != nil {
              fmt.Printf("Failed to set hostname: %v\n", err)
          }

          // 2. Isolate the mount namespace: mount a private /proc filesystem
          // This ensures commands like `ps` only see processes in this container
          if err := syscall.Mount("proc", "/proc", "proc", 0, ""); err != nil {
              fmt.Printf("Failed to mount /proc: %v\n", err)
          }

          // 3. Execute the target program (e.g. /bin/sh)
          userCmd := os.Args[2]
          userArgs := os.Args[3:]

          cmd := exec.Command(userCmd, userArgs...)
          cmd.Stdin = os.Stdin
          cmd.Stdout = os.Stdout
          cmd.Stderr = os.Stderr

          if err := cmd.Run(); err != nil {
              fmt.Printf("Error executing user command: %v\n", err)
          }

          // Unmount proc before exiting to clean up
          syscall.Unmount("/proc", 0)
      }
---

## Namespaces: Controlling What a Process Can See

Unlike virtual machines, which run on virtualized hardware, containers are standard processes running directly on the host machine's kernel. To keep containers from seeing and interfering with each other, the Linux kernel uses **namespaces**.

Namespaces wrap global system resources in an abstraction layer, making it appear to processes inside the namespace that they have their own isolated instance of the resource. There are six primary namespaces:

* **PID (Process ID)**: Isolates the process ID space. A process inside a new PID namespace becomes PID 1 (the init process) and cannot see or signal processes running in the host's default namespace.
* **Net (Network)**: Isolates network devices, IP routing tables, port bindings, and firewall rules. Each namespace starts with a private loopback interface (`lo`).
* **Mount**: Isolates the system mount table. A mount namespace allows processes to mount and unmount filesystems without affecting the host or other namespaces.
* **IPC (Inter-Process Communication)**: Isolates message queues, semaphores, and shared memory segments, preventing processes in different containers from communicating via memory.
* **UTS (UNIX Timesharing System)**: Isolates hostnames and domain names. This allows each container to have its own hostname (e.g. `api-server-1`).
* **User**: Isolates user and group ID mappings. This allows a process to have root privileges (UID 0) inside its container while mapped to a non-privileged user (e.g. UID 10001) on the host.

---

## Control Groups: Controlling What a Process Can Use

While namespaces isolate *what* a process can see, **Control Groups (cgroups)** limit *how much* system resources a process can consume. Without cgroups, a compromised or poorly written container could consume all host memory or CPU time, starving other services (the noisy neighbor problem).

Modern Linux kernels support cgroups v2, which organizes resource allocation hierarchies under `/sys/fs/cgroup/`. Cgroups enforce limits on:

* **CPU**: Limits the maximum CPU share or cores a container can use (e.g. `cpu.max` setting a container to a maximum of 2 cores).
* **Memory**: Enforces a memory usage ceiling (e.g. `memory.max`). If a container exceeds its memory limit, the kernel's **Out-Of-Memory (OOM) killer** steps in and terminates the container process.
* **I/O**: Enforces read and write bandwidth limits on block storage devices (e.g. limiting disk writes to 50MB/s).
* **Process Counts**: Limits the total number of child processes a container can spawn (e.g. `pids.max`), preventing **fork bombs** from crashing the host kernel.

<svg viewBox="0 0 580 340" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="22" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Linux Kernel Container Sandbox Boundary</text>
  <rect x="20" y="50" width="540" height="260" rx="6" fill="#2e3440" stroke="#4c566a" stroke-dasharray="3"/>
  <text x="40" y="68" fill="#81a1c1" font-family="sans-serif" font-size="10" font-weight="bold">Host Operating System</text>
  <rect x="40" y="90" width="230" height="200" rx="5" fill="#3b4252" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="55" y="108" fill="#a3be8c" font-family="sans-serif" font-size="10" font-weight="bold">Namespace Sandbox (What it Sees)</text>
  <rect x="60" y="125" width="190" height="30" rx="3" fill="#2e3440" stroke="#88c0d0"/>
  <text x="70" y="143" fill="#eceff4" font-family="sans-serif" font-size="9">PID Namespace (PID 1 inside)</text>
  <rect x="60" y="165" width="190" height="30" rx="3" fill="#2e3440" stroke="#88c0d0"/>
  <text x="70" y="183" fill="#eceff4" font-family="sans-serif" font-size="9">Net Namespace (Isolated IP / ports)</text>
  <rect x="60" y="205" width="190" height="30" rx="3" fill="#2e3440" stroke="#88c0d0"/>
  <text x="70" y="223" fill="#eceff4" font-family="sans-serif" font-size="9">Mount Namespace (Isolated root /)</text>
  <rect x="300" y="90" width="240" height="200" rx="5" fill="#3b4252" stroke="#bf616a" stroke-width="1.5"/>
  <text x="315" y="108" fill="#bf616a" font-family="sans-serif" font-size="10" font-weight="bold">Cgroups Constraints (What it Uses)</text>
  <rect x="320" y="125" width="200" height="30" rx="3" fill="#2e3440" stroke="#88c0d0"/>
  <text x="330" y="143" fill="#eceff4" font-family="sans-serif" font-size="9">CPU Max Limit (e.g. 2 Cores)</text>
  <rect x="320" y="165" width="200" height="40" rx="3" fill="#2e3440" stroke="#bf616a" stroke-width="1.5"/>
  <text x="330" y="181" fill="#eceff4" font-family="sans-serif" font-size="9" font-weight="bold">Memory Max Limit (e.g. 512MB)</text>
  <text x="330" y="195" fill="#bf616a" font-family="sans-serif" font-size="8">Exceeding triggers OOM Killer!</text>
  <rect x="320" y="215" width="200" height="30" rx="3" fill="#2e3440" stroke="#88c0d0"/>
  <text x="330" y="233" fill="#eceff4" font-family="sans-serif" font-size="9">Block I/O Bandwidth (e.g. 50MB/s)</text>
</svg>

---

## Root Filesystem Isolation: chroot and pivot_root

To isolate what files a process can access, a container runtime must change the root directory of the container process. This is done using two key system calls:

* **`chroot`**: Replaces the root directory of the calling process. For example, `chroot /var/lib/container/rootfs` changes the root directory to that folder, blocking access to host directories above it. However, `chroot` is insecure and processes can escape it.
* **`pivot_root`**: Replaces the root filesystem of the current mount namespace. It moves the host's old root filesystem to a subdirectory and mounts a new root filesystem as `/`. Unlike `chroot`, `pivot_root` changes the mount tables in the kernel, making it impossible for containerized processes to access host filesystem mounts.

By calling `pivot_root`, a runtime ensures that the container starts with a completely clean, isolated directory structure based on its container image.

---

## Virtual Ethernet (veth) Pairs and Network Routing

Because each container gets its own isolated network namespace, they cannot communicate with each other or the host out of the box. To solve this, runtimes use virtual ethernet pairs:

A **`veth` pair** acts as a virtual network cable. One end of the cable is placed inside the container's network namespace (renamed to `eth0`), and the other end is bound to a virtual bridge interface (like `docker0`) on the host.

When the container sends packets to `eth0`, they travel down the virtual cable and emerge on the host's network bridge. The host OS routing tables and netfilter rules (iptables) then forward these packets to the physical network card or redirect them to another container's veth interface, enabling communication.

---

## Container Runtime Architecture

To coordinate namespaces and cgroups, the container ecosystem uses a standard layered architecture governed by the **Open Container Initiative (OCI)**:

* **Low-Level Runtimes (e.g. `runc`)**: The actual program that configures namespaces, cgroups, mounts, and runs the container command. It is short-lived; once the container process starts, `runc` exits.
* **High-Level Runtimes (e.g. `containerd`, `CRI-O`)**: Long-running daemons that manage container lifecycles. They pull images from registries, manage storage overlays, monitor container statuses, and expose APIs to orchestrators like Kubernetes.

This separation of concerns ensures that the core container isolation logic remains simple and standard across different orchestration frameworks.

---

## Further Reading

* [The Linux Programming Interface](https://man7.org/tlpi/) — Michael Kerrisk's authoritative book on Linux systems programming, detailing namespaces and system calls.
* [Control Groups v2 Linux Documentation](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html) — The official Linux kernel guide on managing resource allocations under cgroups v2.
* [Docker and namespaces (Red Hat Blog)](https://www.redhat.com/en/blog/7-linux-namespaces) — A practical exploration of how namespaces isolate processes on host systems.
