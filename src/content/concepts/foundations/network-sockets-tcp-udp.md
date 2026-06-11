---
title: "Network Sockets: TCP & UDP"
slug: network-sockets-tcp-udp
summary: "Understand the operating system network stack, socket API system calls, TCP transmission controls, connection queues, UDP semantics, and event-driven I/O multiplexing."
difficulty: intermediate
chapterId: foundations
domain: Foundations
estimatedMinutes: 15
prerequisites: [file-descriptors]
related: [http, processes-threads]
seo_title: "Network Sockets: TCP & UDP Explained | Graphly"
seo_description: "Explore the OS network stack, socket lifecycle system calls, TCP state transitions, connection queues, UDP datagrams, and I/O multiplexing with epoll."
canonical_url: "/concepts/network-sockets-tcp-udp"
citations:
  - title: "Unix Network Programming, Volume 1: The Sockets Networking API"
    author: "W. Richard Stevens, Bill Fenner, and Andrew M. Rudoff"
    chapter: "Chapter 3: Sockets Introduction & Chapter 4: Elementary TCP Sockets"
    page_range: "79-120"
    external_link: "https://www.pearson.com/en-us/subject-catalog/p/unix-network-programming-volume-1-the-sockets-networking-api/P200000000315"
code_examples:
  - language: c
    title: Non-blocking TCP Echo Server with epoll
    code: |
      #include <stdio.h>
      #include <stdlib.h>
      #include <string.h>
      #include <unistd.h>
      #include <fcntl.h>
      #include <errno.h>
      #include <sys/socket.h>
      #include <netinet/in.h>
      #include <sys/epoll.h>

      #define MAX_EVENTS 64
      #define PORT 8080
      #define BUFFER_SIZE 1024

      /* Set socket descriptor to non-blocking mode */
      int make_socket_non_blocking(int sfd) {
          int flags = fcntl(sfd, F_GETFL, 0);
          if (flags == -1) {
              perror("fcntl F_GETFL");
              return -1;
          }
          flags |= O_NONBLOCK;
          if (fcntl(sfd, F_SETFL, flags) == -1) {
              perror("fcntl F_SETFL");
              return -1;
          }
          return 0;
      }

      int main() {
          int listen_fd, epoll_fd;
          struct sockaddr_in address;
          int opt = 1;

          /* 1. Create a raw TCP socket */
          listen_fd = socket(AF_INET, SOCK_STREAM, 0);
          if (listen_fd == -1) {
              perror("socket creation failed");
              exit(EXIT_FAILURE);
          }

          /* 2. Enable SO_REUSEADDR socket option to reuse port immediately */
          if (setsockopt(listen_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) == -1) {
              perror("setsockopt SO_REUSEADDR failed");
              close(listen_fd);
              exit(EXIT_FAILURE);
          }

          memset(&address, 0, sizeof(address));
          address.sin_family = AF_INET;
          address.sin_addr.s_addr = INADDR_ANY;
          address.sin_port = htons(PORT);

          /* 3. Bind socket to target address and port */
          if (bind(listen_fd, (struct sockaddr *)&address, sizeof(address)) == -1) {
              perror("bind failed");
              close(listen_fd);
              exit(EXIT_FAILURE);
          }

          /* 4. Configure socket as non-blocking */
          if (make_socket_non_blocking(listen_fd) == -1) {
              close(listen_fd);
              exit(EXIT_FAILURE);
          }

          /* 5. Listen for incoming connections (SYN backlog capacity: 128) */
          if (listen(listen_fd, 128) == -1) {
              perror("listen failed");
              close(listen_fd);
              exit(EXIT_FAILURE);
          }

          /* 6. Initialize epoll instance */
          epoll_fd = epoll_create1(0);
          if (epoll_fd == -1) {
              perror("epoll_create1 failed");
              close(listen_fd);
              exit(EXIT_FAILURE);
          }

          struct epoll_event event;
          struct epoll_event events[MAX_EVENTS];

          event.data.fd = listen_fd;
          event.events = EPOLLIN | EPOLLET; /* Edge-triggered read monitor */

          /* 7. Register listen socket with epoll */
          if (epoll_ctl(epoll_fd, EPOLL_CTL_ADD, listen_fd, &event) == -1) {
              perror("epoll_ctl add listen_fd failed");
              close(listen_fd);
              close(epoll_fd);
              exit(EXIT_FAILURE);
          }

          /* 8. Execute high-performance event loop */
          while (1) {
              int n = epoll_wait(epoll_fd, events, MAX_EVENTS, -1);
              for (int i = 0; i < n; i++) {
                  if ((events[i].events & EPOLLERR) ||
                      (events[i].events & EPOLLHUP) ||
                      (!(events[i].events & EPOLLIN))) {
                      /* Handle error or socket disconnection */
                      fprintf(stderr, "epoll error on fd %d\n", events[i].data.fd);
                      close(events[i].data.fd);
                      continue;
                  }

                  if (listen_fd == events[i].data.fd) {
                      /* Handle new incoming connection requests */
                      while (1) {
                          struct sockaddr in_addr;
                          socklen_t in_len = sizeof(in_addr);
                          int infd = accept(listen_fd, &in_addr, &in_len);
                          if (infd == -1) {
                              if ((errno == EAGAIN) || (errno == EWOULDBLOCK)) {
                                  /* All connections in backlog accepted */
                                  break;
                              }
                              perror("accept failed");
                              break;
                          }

                          if (make_socket_non_blocking(infd) == -1) {
                              close(infd);
                              continue;
                          }

                          event.data.fd = infd;
                          event.events = EPOLLIN | EPOLLET; /* Edge-triggered read monitoring */
                          if (epoll_ctl(epoll_fd, EPOLL_CTL_ADD, infd, &event) == -1) {
                              perror("epoll_ctl add client fd failed");
                              close(infd);
                          }
                      }
                  } else {
                      /* Process data ready to read on existing connection */
                      int client_fd = events[i].data.fd;
                      char buf[BUFFER_SIZE];
                      int close_conn = 0;

                      while (1) {
                          ssize_t count = read(client_fd, buf, sizeof(buf));
                          if (count == -1) {
                              if (errno != EAGAIN && errno != EWOULDBLOCK) {
                                  perror("read error");
                                  close_conn = 1;
                              }
                              break;
                          } else if (count == 0) {
                              /* EOF, client closed connection */
                              close_conn = 1;
                              break;
                          }

                          /* Echo the read bytes back to the client socket */
                          ssize_t written = write(client_fd, buf, count);
                          if (written == -1) {
                              perror("write error");
                              close_conn = 1;
                              break;
                          }
                      }

                      if (close_conn) {
                          close(client_fd);
                      }
                  }
              }
          }
          close(listen_fd);
          close(epoll_fd);
          return 0;
      }
---

## User Space vs Kernel Space Network Buffers

A **network socket** is the fundamental operating system abstraction that exposes network hardware interface queues to user-space software. When your application sends or receives data over the network, it does not interact directly with the physical network interface card (NIC). Instead, it reads from and writes to intermediate buffers allocated in kernel memory.

This split can be compared to a mailbox system in a large office building. Tenants (user-space applications) do not fetch letters from the mail carrier's truck. The building mail clerk (the operating system kernel) retrieves letters, sorts them, and places them into individual pigeonholes (kernel socket buffers). Tenants only access their own designated pigeonhole to grab their mail.

When an application calls `write()` or `send()` on a socket:
* The data is copied from user-space memory blocks into the kernel's transmit buffer (`tx_buf`).
* The kernel's TCP/IP stack segments the buffered data, wraps it in protocol headers, and passes it to the device driver for physical transmission.
* The `write()` syscall returns as soon as the data is copied to the kernel buffer, not when the data actually crosses the physical wire.

Conversely, when data packets arrive at the physical NIC:
* The driver moves the data to kernel-space receive buffers (`rx_buf`) using direct memory access (DMA).
* The kernel parses headers and identifies the target socket.
* When the user application calls `read()` or `recv()`, the kernel copies the data from the kernel's receive buffer into the application's user-space memory buffer.

If the application is slower at calling `read()` than the rate of incoming network traffic, the kernel receive buffer fills up. When it becomes completely full, TCP flow control mechanisms trigger, forcing the sender to throttle transmission rates.

---

## Socket API System Calls

Interacting with sockets requires a sequence of POSIX system calls. Each call moves the socket through a specific lifecycle, configuring either a passive listener (server) or an active initiator (client).

The process begins with the `socket()` syscall, which requests the operating system to allocate file descriptor resources. The kernel returns an integer representing the socket. Next, the server binds this socket to an IP address and port number using `bind()`, identifying it on the system. It then enters a passive listening state via `listen()`, enabling the kernel to accept incoming connection requests.

To establish the connection, the client issues `connect()`, which triggers the TCP handshake. The server accepts this connection via `accept()`, returning a new, dedicated socket file descriptor for that specific client connection while the initial listening socket remains free to accept additional incoming requests.

<svg viewBox="0 0 580 640" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="24" fill="#88c0d0" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">TCP Socket System Calls and State Transitions</text>
  <rect x="30" y="45" width="220" height="30" rx="4" fill="#2e3440" stroke="#88c0d0" stroke-width="1"/>
  <text x="140" y="64" fill="#eceff4" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">SERVER SOCKET</text>
  <rect x="330" y="45" width="220" height="30" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1"/>
  <text x="440" y="64" fill="#eceff4" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">CLIENT SOCKET</text>
  <rect x="40" y="90" width="200" height="24" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="140" y="106" fill="#d8dee9" font-family="sans-serif" font-size="10" text-anchor="middle">socket() -> Allocate FD</text>
  <rect x="40" y="125" width="200" height="24" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="140" y="141" fill="#d8dee9" font-family="sans-serif" font-size="10" text-anchor="middle">bind() -> Assign Address/Port</text>
  <rect x="40" y="160" width="200" height="24" rx="4" fill="#3b4252" stroke="#ebcb8b" stroke-width="1"/>
  <text x="140" y="176" fill="#ebcb8b" font-family="sans-serif" font-size="10" text-anchor="middle">listen() -> Enter LISTEN State</text>
  <rect x="340" y="160" width="200" height="24" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="440" y="176" fill="#d8dee9" font-family="sans-serif" font-size="10" text-anchor="middle">socket() -> Allocate FD</text>
  <line x1="440" y1="184" x2="440" y2="200" stroke="#81a1c1" stroke-width="1.5"/>
  <rect x="340" y="200" width="200" height="24" rx="4" fill="#3b4252" stroke="#88c0d0" stroke-width="1"/>
  <text x="440" y="216" fill="#88c0d0" font-family="sans-serif" font-size="10" text-anchor="middle">connect() -> Initiate Handshake</text>
  <path d="M 440 224 L 140 270" stroke="#ebcb8b" stroke-width="1.5" stroke-dasharray="4" fill="none" marker-end="url(#arr)"/>
  <text x="310" y="240" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle" transform="rotate(-9, 310, 240)">SYN</text>
  <rect x="40" y="260" width="200" height="24" rx="4" fill="#3b4252" stroke="#81a1c1" stroke-width="1"/>
  <text x="140" y="276" fill="#81a1c1" font-family="sans-serif" font-size="10" text-anchor="middle">accept() -> SYN Queue (SYN_RCVD)</text>
  <path d="M 140 284 L 440 310" stroke="#a3be8c" stroke-width="1.5" stroke-dasharray="4" fill="none" marker-end="url(#arr)"/>
  <text x="290" y="293" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle" transform="rotate(5, 290, 293)">SYN-ACK</text>
  <rect x="340" y="300" width="200" height="24" rx="4" fill="#3b4252" stroke="#a3be8c" stroke-width="1"/>
  <text x="440" y="316" fill="#a3be8c" font-family="sans-serif" font-size="10" text-anchor="middle">ESTABLISHED State</text>
  <path d="M 440 324 L 140 350" stroke="#a3be8c" stroke-width="1.5" stroke-dasharray="4" fill="none" marker-end="url(#arr)"/>
  <text x="290" y="333" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle" transform="rotate(-5, 290, 333)">ACK</text>
  <rect x="40" y="340" width="200" height="24" rx="4" fill="#3b4252" stroke="#a3be8c" stroke-width="1"/>
  <text x="140" y="356" fill="#a3be8c" font-family="sans-serif" font-size="10" text-anchor="middle">Accept Queue -> accept() returns</text>
  <line x1="140" y1="364" x2="140" y2="385" stroke="#81a1c1" stroke-width="1.5"/>
  <line x1="440" y1="324" x2="440" y2="385" stroke="#81a1c1" stroke-width="1.5"/>
  <rect x="40" y="385" width="200" height="24" rx="4" fill="#3b4252" stroke="#eceff4" stroke-width="1"/>
  <text x="140" y="401" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">read() from socket buffer</text>
  <rect x="340" y="385" width="200" height="24" rx="4" fill="#3b4252" stroke="#eceff4" stroke-width="1"/>
  <text x="440" y="401" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">write() to socket buffer</text>
  <path d="M 440 409 L 140 435" stroke="#eceff4" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="290" y="420" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle" transform="rotate(-5, 290, 420)">Data Payload</text>
  <rect x="40" y="440" width="200" height="24" rx="4" fill="#3b4252" stroke="#bf616a" stroke-width="1"/>
  <text x="140" y="456" fill="#bf616a" font-family="sans-serif" font-size="10" text-anchor="middle">read() returns 0 (EOF)</text>
  <rect x="340" y="440" width="200" height="24" rx="4" fill="#3b4252" stroke="#bf616a" stroke-width="1"/>
  <text x="440" y="456" fill="#bf616a" font-family="sans-serif" font-size="10" text-anchor="middle">close() -> Send FIN</text>
  <path d="M 440 464 L 140 490" stroke="#bf616a" stroke-width="1.5" stroke-dasharray="4" fill="none" marker-end="url(#arr)"/>
  <text x="290" y="475" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle" transform="rotate(-5, 290, 475)">FIN</text>
  <rect x="40" y="495" width="200" height="24" rx="4" fill="#3b4252" stroke="#bf616a" stroke-width="1"/>
  <text x="140" y="511" fill="#bf616a" font-family="sans-serif" font-size="10" text-anchor="middle">close() -> Send ACK, transition</text>
  <path d="M 140 519 L 440 545" stroke="#bf616a" stroke-width="1.5" stroke-dasharray="4" fill="none" marker-end="url(#arr)"/>
  <text x="290" y="530" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle" transform="rotate(5, 290, 530)">ACK</text>
  <rect x="340" y="550" width="200" height="24" rx="4" fill="#3b4252" stroke="#ebcb8b" stroke-width="1"/>
  <text x="440" y="566" fill="#ebcb8b" font-family="sans-serif" font-size="10" text-anchor="middle">TIME_WAIT state (2 * MSL)</text>
  <line x1="140" y1="90" x2="140" y2="125" stroke="#81a1c1" stroke-width="1.5"/>
  <line x1="140" y1="149" x2="140" y2="160" stroke="#81a1c1" stroke-width="1.5"/>
  <line x1="140" y1="184" x2="140" y2="260" stroke="#81a1c1" stroke-width="1.5"/>
  <line x1="140" y1="409" x2="140" y2="440" stroke="#81a1c1" stroke-width="1.5"/>
  <line x1="440" y1="409" x2="440" y2="440" stroke="#81a1c1" stroke-width="1.5"/>
  <line x1="440" y1="464" x2="440" y2="550" stroke="#81a1c1" stroke-width="1.5"/>
  <line x1="140" y1="464" x2="140" y2="495" stroke="#81a1c1" stroke-width="1.5"/>
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#81a1c1"/>
    </marker>
  </defs>
  <rect x="30" y="590" width="520" height="30" rx="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="290" y="608" fill="#d8dee9" font-family="sans-serif" font-size="10" text-anchor="middle">The OS uses two connection queues in the background: the SYN backlog and the Accept backlog.</text>
</svg>

---

## TCP Transmission Controls and Connection Queues

To provide reliable delivery over an unreliable physical medium, TCP enforces three core mechanisms: flow control, congestion control, and connection lifecycle queues.

### The Handshake and Connection Backlogs
When a server socket transitions to the listening state, the kernel initializes two distinct backlogs:
* **SYN Backlog** (Incomplete Connection Queue): Stores connection requests that have sent a `SYN` packet and received a `SYN-ACK`, but have not yet replied with the final `ACK`. Sockets here are in the `SYN_RCVD` state.
* **Accept Queue** (Complete Connection Queue): Stores fully established connections that have completed the three-way handshake and are in the `ESTABLISHED` state. When the application calls `accept()`, a connection is popped from this queue.

If a high-traffic server does not call `accept()` fast enough, the Accept Queue fills up. If the queue overflows, the kernel's default behavior is to ignore subsequent incoming `ACK` packets, causing the client to think the packet was lost and attempt to retransmit.

### Flow Control: The Sliding Window
To prevent a fast sender from overwhelming a slow receiver, TCP uses a **sliding window** mechanism. During packet exchanges, both sides advertise their remaining receive buffer capacity using the `window` field in the TCP header. 

The sender must never allow its unacknowledged bytes to exceed this advertised window size. If the receiver's window shrinks to zero, the sender stops transmitting data. The sender then periodically transmits single-byte probe packets to check if the window has reopened.

### Congestion Control
While flow control manages receiver capacity, congestion control prevents the network infrastructure from dropping packets due to intermediate queue overflows. TCP monitors packet loss to dynamically scale its transmission rate using key stages:
* **Slow Start**: When a connection starts, TCP sets its congestion window (`cwnd`) to a low initial value (typically 10 segments). It doubles the window size with every round-trip time (RTT) where packets are successfully acknowledged, scaling exponentially.
* **Congestion Avoidance**: Once `cwnd` hits a threshold (`ssthresh`), the window expansion transitions to a linear growth pattern (adding one segment per RTT).
* **Fast Recovery**: If a packet drop is detected via duplicate ACKs, TCP decreases `ssthresh` and drops `cwnd` to avoid total packet stall, recovering without resorting to a full slow start sequence.

### Connection State Transitions
TCP connections undergo a strict sequence of state changes during termination. When a thread calls `close()` on a socket:
* It sends a `FIN` packet and enters the `FIN_WAIT_1` state.
* The remote peer responds with an `ACK`, transitioning the local socket to `FIN_WAIT_2`, while the remote peer enters `CLOSE_WAIT`.
* The remote peer calls `close()`, sending its own `FIN` and transitioning to `LAST_ACK`.
* The local socket receives this `FIN` and responds with an `ACK`, entering the `TIME_WAIT` state.

A socket remains in the **TIME_WAIT** state for double the Maximum Segment Lifetime (typically 2 * MSL, or 1 to 4 minutes). This duration ensures that any delayed packets still traveling through the network are fully discarded rather than corrupting a new socket reassigned to the same address and port combination. It also ensures that the final `ACK` is successfully delivered, preventing the remote peer from retransmitting its final `FIN`.

---

## UDP Datagram Semantics

Unlike TCP, the User Datagram Protocol (UDP) is a connectionless, unreliable transport protocol. It eliminates handshakes, retransmissions, sliding windows, and congestion control algorithms.

### Unreliable and Connectionless Delivery
A UDP socket does not establish a virtual connection with a remote peer. An application can send datagrams to different destinations using the same socket by specifying the target IP and port on every write request. Packet drops, bit corruptions, and out-of-order arrivals must be handled entirely in the application layer if needed.

### Boundary-Preserving Transmission
TCP is a byte-stream protocol, it does not preserve record boundaries. If a client writes two packets of 100 bytes each to a TCP socket, the server might read all 200 bytes in a single `read()` call, or read 50 bytes in the first call and 150 bytes in the second.

In contrast, UDP is **boundary-preserving**:
* If a sender writes a 500-byte datagram to a UDP socket, the receiver will get the exact 500-byte block in a single read operation.
* If the receiver passes a buffer smaller than the datagram size to `recv()`, the OS drops the excess bytes and returns a truncation error.

UDP is widely used in real-time media streaming, online gaming, and dns queries where low latency is critical and losing occasional packets is preferable to waiting for retransmissions.

---

## Network I/O Multiplexing and Event Loops

Handling thousands of concurrent network connections efficiently requires moving away from the naive "one thread per connection" design. In a blocking network model, calling `read()` blocks the executing thread until data arrives on the network interface. Assigning a thread to every active connection wastes system resources because most threads spend their time asleep, waiting for network data.

**I/O multiplexing** solves this by letting a single thread watch multiple file descriptors at the same time. The kernel provides system calls to notify the application when specific file descriptors are ready for read or write operations:

* `select()`: The oldest multiplexing call. It accepts a bitmask of file descriptors. It has a hardcoded limit of 1,024 descriptors and requires an `O(N)` loop to scan which descriptors are active, making it scale poorly for high numbers of connections.
* `poll()`: Replaces the bitmask with an array of structures, removing the 1,024 limit. However, it still requires the kernel and user space to scan the entire array on every check, preserving the `O(N)` performance bottleneck.
* `epoll()` (Linux) and `kqueue` (macOS/BSD): High-performance, event-driven APIs. Instead of passing an array of file descriptors on every call, the application registers descriptors with the kernel once. The kernel monitors the sockets in the background. When the application calls `epoll_wait()`, the kernel returns only the file descriptors that are actively ready for I/O in `O(1)` time.

This event-driven model is the foundation of high-throughput web servers like Nginx, Node.js, and Redis.

---

## TCP Socket Options

Applications can configure socket behavior using `setsockopt()`. Three options are critical for high-performance network engineering:

* `SO_REUSEADDR`: Instructs the kernel to bypass the standard port-release restrictions for sockets in the `TIME_WAIT` state. Enabling this option allows a restarted server process to immediately bind to its designated port, preventing startup failures during quick restarts.
* `TCP_NODELAY`: Disables Nagle's algorithm. Nagle's algorithm groups small outbound packets and delays their transmission to reduce header overhead on slow networks. Disabling this with `TCP_NODELAY` ensures that packets are dispatched immediately, which is critical for low-latency interactive connections.
* `SO_KEEPALIVE`: Configures the kernel to periodically transmit heartbeat probes on established idle connections. If a peer fails to reply within the timeout threshold, the kernel closes the connection and marks the socket as invalid, allowing servers to automatically clean up orphaned connections.

---

## Further Reading

* [Unix Network Programming, Volume 1: The Sockets Networking API](https://www.pearson.com/en-us/subject-catalog/p/unix-network-programming-volume-1-the-sockets-networking-api/P200000000315) — The definitive reference on network programming systems calls.
* [The Method to epoll's Madness](https://copyconstruct.medium.com/the-method-to-epolls-madness-d9d2d6378642) — A detailed technical look at Linux I/O multiplexing internals.
* [RFC 9293: Transmission Control Protocol (TCP)](https://datatracker.ietf.org/doc/html/rfc9293) — The official Internet Standard defining TCP specifications.
