---
title: Unix I/O Multiplexing
slug: unix-io-multiplexing
summary: "Discover how epoll and kqueue enable high-concurrency servers to handle millions of connections using event-driven notification loops."
difficulty: advanced
chapterId: foundations
domain: Foundations
estimatedMinutes: 15
prerequisites: [file-descriptors, network-sockets-tcp-udp]
related: [websockets-sse, system-calls]
seo_title: "Unix I/O Multiplexing: select, poll, epoll, and kqueue Explained"
seo_description: "Learn how Unix I/O multiplexing works. Master the difference between blocking and non-blocking I/O, epoll vs select/poll, LT vs ET modes, and Reactor vs Proactor patterns."
canonical_url: "/concepts/unix-io-multiplexing"
citations:
  - title: "Unix Network Programming, Volume 1: The Sockets Networking API"
    author: "W. Richard Stevens, Bill Fenner, and Andrew M. Rudoff"
    chapter: "Chapter 6: I/O Multiplexing: The select and poll Functions"
    page_range: "151-180"
    external_link: "https://www.pearson.com/en-us/subject-catalog/p/unix-network-programming-volume-1-the-sockets-networking-api/P200000000305"
  - title: "The Linux Programming Interface"
    author: "Michael Kerrisk"
    chapter: "Chapter 63: Alternative I/O Models"
    page_range: "1325-1360"
    external_link: "https://man7.org/tlpi/"
code_examples:
  - language: c
    title: "Edge-Triggered epoll Event Loop with Non-blocking Sockets"
    code: |
      #define _GNU_SOURCE
      #include <stdio.h>
      #include <stdlib.h>
      #include <string.h>
      #include <sys/socket.h>
      #include <sys/epoll.h>
      #include <netinet/in.h>
      #include <fcntl.h>
      #include <unistd.h>
      #include <errno.h>

      #define MAX_EVENTS 64
      #define PORT 8080
      #define BUFFER_SIZE 512

      int make_socket_non_blocking(int sfd) {
          int flags = fcntl(sfd, F_GETFL, 0);
          if (flags == -1) return -1;
          flags |= O_NONBLOCK;
          if (fcntl(sfd, F_SETFL, flags) == -1) return -1;
          return 0;
      }

      int main() {
          int sfd = socket(AF_INET, SOCK_STREAM, 0);
          if (sfd == -1) { perror("socket"); exit(EXIT_FAILURE); }

          int opt = 1;
          setsockopt(sfd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

          struct sockaddr_in address;
          memset(&address, 0, sizeof(address));
          address.sin_family = AF_INET;
          address.sin_addr.s_addr = INADDR_ANY;
          address.sin_port = htons(PORT);

          if (bind(sfd, (struct sockaddr *)&address, sizeof(address)) == -1) {
              perror("bind"); exit(EXIT_FAILURE);
          }

          if (make_socket_non_blocking(sfd) == -1) {
              perror("non-blocking"); exit(EXIT_FAILURE);
          }

          if (listen(sfd, SOMAXCONN) == -1) {
              perror("listen"); exit(EXIT_FAILURE);
          }

          int epfd = epoll_create1(0);
          if (epfd == -1) { perror("epoll_create1"); exit(EXIT_FAILURE); }

          struct epoll_event event;
          event.data.fd = sfd;
          event.events = EPOLLIN | EPOLLET; // Edge-Triggered
          if (epoll_ctl(epfd, EPOLL_CTL_ADD, sfd, &event) == -1) {
              perror("epoll_ctl"); exit(EXIT_FAILURE);
          }

          struct epoll_event events[MAX_EVENTS];
          printf("Server listening on port %d...\n", PORT);

          while (1) {
              int n = epoll_wait(epfd, events, MAX_EVENTS, -1);
              for (int i = 0; i < n; i++) {
                  if ((events[i].events & EPOLLERR) || (events[i].events & EPOLLHUP) || (!(events[i].events & EPOLLIN))) {
                      fprintf(stderr, "epoll error on fd %d\n", events[i].data.fd);
                      close(events[i].data.fd);
                      continue;
                  }

                  if (events[i].data.fd == sfd) {
                      // Accept loop for incoming connections (ET requires loop until EAGAIN)
                      while (1) {
                          struct sockaddr in_addr;
                          socklen_t in_len = sizeof(in_addr);
                          int infd = accept(sfd, &in_addr, &in_len);
                          if (infd == -1) {
                              if ((errno == EAGAIN) || (errno == EWOULDBLOCK)) {
                                  break; // Processed all pending connections
                              } else {
                                  perror("accept"); break;
                              }
                          }
                          if (make_socket_non_blocking(infd) == -1) {
                              close(infd); break;
                          }
                          event.data.fd = infd;
                          event.events = EPOLLIN | EPOLLET | EPOLLRDHUP;
                          if (epoll_ctl(epfd, EPOLL_CTL_ADD, infd, &event) == -1) {
                              perror("epoll_ctl_add"); close(infd);
                          }
                      }
                  } else {
                      // Handle data from client
                      int done = 0;
                      int client_fd = events[i].data.fd;
                      while (1) {
                          char buf[BUFFER_SIZE];
                          ssize_t count = read(client_fd, buf, sizeof(buf));
                          if (count == -1) {
                              if (errno != EAGAIN) {
                                  perror("read error"); done = 1;
                              }
                              break; // EAGAIN means no more data to read for now
                          } else if (count == 0) {
                              done = 1; // End of file (client closed connection)
                              break;
                          }
                          // Process received data bytes
                          write(STDOUT_FILENO, buf, count);
                      }
                      if (done) {
                          printf("Closed connection on descriptor %d\n", client_fd);
                          close(client_fd);
                      }
                  }
              }
          }
          close(sfd);
          return 0;
      }
---

## The Evolution of I/O Handling

To appreciate the necessity of modern input/output multiplexing, consider how operating systems historically managed network connections. When a program reads from a network socket, it makes a request to the kernel. If no data has arrived from the network, the calling thread can either wait or immediately return an error. This split defines the two primary categories of input/output:

* **Blocking I/O**: The thread that calls `read()` or `write()` is put to sleep by the kernel. The thread yields its CPU execution time and remains suspended until data is copied into the kernel network buffer. This model is simple to program but scales poorly, demanding one dedicated thread per active socket connection. 
* **Non-blocking I/O**: The calling thread configures the socket file descriptor to return immediately when an I/O operation cannot be completed. The socket returns a specific error code, such as `EAGAIN` or `EWOULDBLOCK`, instead of putting the thread to sleep.

While non-blocking sockets prevent threads from freezing, managing hundreds of them introduces a polling problem. If a user application continuously loops over all open sockets in user space, asking each socket if data has arrived, it wastes CPU cycles on redundant system calls. 

This challenge led to the creation of **I/O multiplexing**: a model where the kernel provides a single system call that blocks a single thread, monitoring many file descriptors at once and waking the thread only when at least one descriptor is ready for operations.

---

## The Bottlenecks of select and poll

The earliest Unix attempts to multiplex file descriptors resulted in the `select()` and `poll()` system calls. Both mechanisms require the user process to supply a list of file descriptors it wishes to monitor.

* `select()`: Uses a fixed-size bit array (called `fd_set`) representing file descriptor numbers. The maximum size of this array is hardcoded in the kernel, historically limited to `FD_SETSIZE` (usually 1,024).
* `poll()`: Avoids the hardcoded array limit by using a dynamically sized array of structures (`struct pollfd`). 

Despite their historical utility, both system calls suffer from severe architectural limitations that restrict their scalability in modern, high-throughput systems:

1. **O(N) User-Kernel Copying**: Every time `select()` or `poll()` is invoked, the user program must construct and copy the entire array of monitored descriptors from user space to kernel space. The kernel processes the interest list, updates status fields, and copies the entire array back to user space.
2. **O(N) Kernel Scanning**: Inside the kernel, the CPU must iterate through every single registered file descriptor to verify its readiness state.
3. **O(N) User-Space Filtering**: Once the system call returns, it does not specify which file descriptors are active. It only returns the count of ready descriptors. The user application must run its own loop over the entire descriptor set to search for active channels.

As the number of concurrent connections increases, the CPU spends the majority of its execution time iterating through inactive connections, degrading performance and increasing latency.

---

## Event-Driven Notifications with epoll and kqueue

To overcome the performance limits of `select()` and `poll()`, modern operating systems introduced event-driven subsystems: `epoll` in Linux and `kqueue` in BSD/macOS. These systems decouple the registration of interest from the actual waiting phase, achieving `O(1)` time complexity relative to the size of the monitored set.

Instead of copying the interest list on every invocation, these interfaces establish a persistent state container inside the kernel. The application registers its interest once, and updates the container only when connections open or close.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 380" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="24" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Unix I/O Multiplexing: The epoll Architecture</text>
  <line x1="20" y1="130" x2="560" y2="130" stroke="#4c566a" stroke-dasharray="4,4" stroke-width="1.5"/>
  <text x="30" y="120" fill="#81a1c1" font-family="sans-serif" font-size="10" font-weight="bold">USER SPACE</text>
  <text x="30" y="145" fill="#81a1c1" font-family="sans-serif" font-size="10" font-weight="bold">KERNEL SPACE</text>
  <rect x="50" y="45" width="480" height="65" rx="6" fill="#2e3440" stroke="#88c0d0" stroke-width="1.5"/>
  <text x="70" y="65" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold">User Application Event Loop</text>
  <text x="70" y="82" fill="#d8dee9" font-family="sans-serif" font-size="10">1. epoll_ctl(epfd, EPOLL_CTL_ADD, fd, &amp;ev)  ·  2. ready_count = epoll_wait(epfd, events, ...)</text>
  <text x="70" y="98" fill="#81a1c1" font-family="sans-serif" font-size="9">Registers FDs to monitor, then blocks efficiently until events arrive</text>
  <rect x="50" y="170" width="220" height="180" rx="8" fill="#2e3440" stroke="#88c0d0" stroke-width="1.5"/>
  <text x="160" y="190" fill="#88c0d0" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Interest List (Red-Black Tree)</text>
  <text x="160" y="205" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">O(log N) Search, Insert, Delete</text>
  <circle cx="160" cy="235" r="14" fill="#bf616a" stroke="#d8dee9" stroke-width="1"/>
  <text x="160" y="239" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">FD 4</text>
  <circle cx="120" cy="275" r="14" fill="#2e3440" stroke="#d8dee9" stroke-width="1"/>
  <text x="120" y="279" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">FD 3</text>
  <circle cx="200" cy="275" r="14" fill="#bf616a" stroke="#d8dee9" stroke-width="1"/>
  <text x="200" y="279" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">FD 6</text>
  <circle cx="230" cy="315" r="14" fill="#2e3440" stroke="#d8dee9" stroke-width="1"/>
  <text x="230" y="319" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">FD 7</text>
  <line x1="150" y1="245" x2="130" y2="265" stroke="#d8dee9" stroke-width="1"/>
  <line x1="170" y1="245" x2="190" y2="265" stroke="#d8dee9" stroke-width="1"/>
  <line x1="210" y1="285" x2="220" y2="305" stroke="#d8dee9" stroke-width="1"/>
  <rect x="310" y="170" width="220" height="100" rx="8" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="420" y="190" fill="#a3be8c" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Ready List (Doubly Linked List)</text>
  <text x="420" y="205" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">O(1) Retrievable Events</text>
  <rect x="330" y="225" width="50" height="25" rx="3" fill="#3b4252" stroke="#a3be8c" stroke-width="1"/>
  <text x="355" y="241" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">FD 4</text>
  <rect x="460" y="225" width="50" height="25" rx="3" fill="#3b4252" stroke="#a3be8c" stroke-width="1"/>
  <text x="485" y="241" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">FD 6</text>
  <path d="M 385 233 L 455 233 M 455 242 L 385 242" stroke="#a3be8c" stroke-width="1.2" fill="none"/>
  <polygon points="455,233 450,230 450,236" fill="#a3be8c"/>
  <polygon points="385,242 390,239 390,245" fill="#a3be8c"/>
  <path d="M 160 110 L 160 162" stroke="#88c0d0" stroke-width="1.5" fill="none"/>
  <polygon points="160,165 157,158 163,158" fill="#88c0d0"/>
  <text x="175" y="145" fill="#88c0d0" font-family="sans-serif" font-size="9">epoll_ctl ADD/DEL</text>
  <path d="M 420 162 L 420 118" stroke="#a3be8c" stroke-width="1.5" fill="none"/>
  <polygon points="420,113 417,120 423,120" fill="#a3be8c"/>
  <text x="430" y="145" fill="#a3be8c" font-family="sans-serif" font-size="9">epoll_wait delivers</text>
  <rect x="310" y="290" width="220" height="60" rx="6" fill="#2e3440" stroke="#ebcb8b" stroke-width="1"/>
  <text x="420" y="308" fill="#ebcb8b" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Network Card / Hardware Interrupt</text>
  <text x="420" y="322" fill="#d8dee9" font-family="sans-serif" font-size="9" text-anchor="middle">Packet arrival triggers IRQ callback</text>
  <text x="420" y="335" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Kernel driver pushes associated FD into Ready List</text>
  <path d="M 420 290 L 420 275" stroke="#ebcb8b" stroke-width="1.2" stroke-dasharray="2,2" fill="none"/>
  <polygon points="420,272 417,277 423,277" fill="#ebcb8b"/>
</svg>

Under the hood, Linux `epoll` manages the tracked set with two primary data structures:

* **Red-Black Tree (Interest List)**: When an application adds, modifies, or removes a file descriptor using `epoll_ctl()`, the kernel updates a red-black tree keyed by the descriptor's numeric ID. This structure enables stable `O(log N)` search, insertion, and deletion times, helping the kernel scale to millions of active sockets.
* **Doubly Linked List (Ready List)**: When I/O occurs on a monitored socket, the hardware device driver fires an interrupt. The kernel's network stack processes the incoming bytes and triggers a callback routine. This callback retrieves the corresponding node from the interest tree and appends it to a doubly linked list of "ready" descriptors.

When the application invokes `epoll_wait()`, the system call does not search the entire tree. Instead, it checks the ready list. If the list is empty, the calling thread is put to sleep. If the list contains elements, the kernel copies only the active descriptors into the application's buffer. The system call returns immediately, completing in `O(1)` time regardless of the size of the monitored interest list.

---

## Level-Triggered vs Edge-Triggered Modes

The `epoll` system operates in one of two event-delivery modes, which determine when and how the kernel notifies the application:

### Level-Triggered (LT) Mode
This is the default mode, resembling the classic behavior of `poll()`. In Level-Triggered mode, the kernel treats the ready list as a state representation. If a file descriptor contains unread data, the kernel will continue to report it as "ready" every time `epoll_wait()` is called. 

While LT mode is forgiving of programming omissions, it carries performance overhead. If your application reads only a portion of the incoming network buffer during one event loop iteration, the next call to `epoll_wait()` will immediately wake the thread again.

### Edge-Triggered (ET) Mode
In Edge-Triggered mode, the kernel notifies the application only when a state *transition* occurs on the descriptor, such as when new data arrives at the network interface. If the application does not consume all the data from the system's buffer, the kernel will not notify the application again for that event, even if data remains in the queue.

To prevent silent stalls, edge-triggered engines must adhere to two implementation rules:
1. **Non-blocking FDs**: All monitored file descriptors must be configured as non-blocking.
2. **Exhaustive Read Loops**: When notified of an input event, the application must read from the socket in a loop until the system call returns `-1` with `errno` set to `EAGAIN` or `EWOULDBLOCK`. This ensures the kernel's internal buffer is empty before the thread goes back to sleep.

---

## Concurrency Patterns: Reactor vs Proactor

Engineers utilize two architectural patterns to orchestrate high-performance network events: the Reactor pattern and the Proactor pattern.

```
                  ┌────────────────────────────────────────┐
                  │                Reactor                 │
                  │  * Synchronous Event Loop              │
                  │  * Notifies when socket is READY       │
                  │  * Handler performs the actual read()  │
                  └────────────────────────────────────────┘

                  ┌────────────────────────────────────────┐
                  │                Proactor                │
                  │  * Asynchronous Completion Loop        │
                  │  * Notifies when read is COMPLETE      │
                  │  * Kernel performs read() into buffer  │
                  └────────────────────────────────────────┘
```

The **Reactor** pattern uses synchronous demultiplexing. The event loop blocks on `epoll_wait()` or `kqueue()`. When a socket becomes ready, the loop dispatches the active descriptor to an application-level handler. The handler then performs the synchronous `read()` or `write()` operation. Systems like Node.js, NGINX, and Netty are built on the Reactor model.

The **Proactor** pattern uses asynchronous completion. The application initiates an I/O operation and registers a callback, passing a user-space memory buffer directly to the OS. The kernel performs the read or write operation in the background, writing directly to the application's memory buffer. Once the copy completes, the kernel notifies the application's event loop that the task is done. The Proactor pattern is natively supported on Windows via I/O Completion Ports (IOCP) and is increasingly popular on Linux via the modern `io_uring` interface.

---

## Practical System Limits

As you scale connection densities toward hundreds of thousands of concurrent sockets, you will hit configuration limits. 

The first limit is the **Process-Level Descriptor Limit**. Operating systems enforce a boundary on the number of file descriptors a single process can open. This boundary is controlled by the shell limit configuration `ulimit -n`. The second is the **System-Wide Descriptor Limit**, which determines the maximum number of file descriptors allowed across the entire operating system, configurable via `sysctl fs.file-max`.

If your application exceeds these boundaries, socket creation system calls like `accept()` or `socket()` will fail, returning `EMFILE` or `ENFILE` errors. 

Furthermore, if the rate of incoming events exceeds the application's capacity to process them, the CPU will spend more time switching contexts and running kernel interrupt handlers than executing application code. This state is known as context-switching thrashing, and it can be mitigated by grouping connections into event loops pinned to dedicated CPU cores.

---

## Further Reading

* [The Linux Programming Interface](https://man7.org/tlpi/) — Chapter 63 covers epoll in deep technical detail.
* [Unix Network Programming, Volume 1](https://www.pearson.com/en-us/subject-catalog/p/unix-network-programming-volume-1-the-sockets-networking-api/P200000000305) — Chapters 6 and 14 offer a comprehensive look at historical I/O models.
* [io_uring Documentation](https://kernel.dk/io_uring.pdf) — Read Jens Axboe's original PDF design papers on the evolution of asynchronous I/O in Linux.
* [kqueue: An generic and scalable event notification facility](https://www.freebsd.org/cgi/man.cgi?query=kqueue) — The FreeBSD man page documenting kqueue's filter and event mechanics.
