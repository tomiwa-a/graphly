---
title: HTTP/3
slug: http3
summary: "Understand HTTP/3 and the QUIC transport layer, addressing head-of-line blocking, connection migration, and unified handshakes."
difficulty: advanced
chapterId: foundations
domain: Foundations
estimatedMinutes: 15
prerequisites: [network-sockets-tcp-udp, tls-handshake, http]
related: [websockets-sse]
seo_title: "HTTP/3 and QUIC Protocol: Architecture and Performance Guide"
seo_description: "Deep dive into HTTP/3 and the QUIC transport layer. Learn about head-of-line blocking mitigation, connection migration, and TLS 1.3 integration."
canonical_url: "/concepts/http3"
citations:
  - title: "QUIC: A UDP-Based Multiplexed and Secure Transport"
    author: "Jana Iyengar & Martin Thomson"
    chapter: "RFC 9000"
    external_link: "https://datatracker.ietf.org/doc/html/rfc9000"
  - title: "Hypertext Transfer Protocol Version 3 (HTTP/3)"
    author: "Mike Bishop"
    chapter: "RFC 9114"
    external_link: "https://datatracker.ietf.org/doc/html/rfc9114"
code_examples:
  - language: go
    title: High-Performance HTTP/3 Multiplexed Server
    code: |
      package main

      import (
      	"crypto/tls"
      	"fmt"
      	"io"
      	"log"
      	"net/http"

      	"github.com/quic-go/quic-go"
      	"github.com/quic-go/quic-go/http3"
      )

      func main() {
      	// Configure TLS certificate with HTTP/3 ALPN parameter
      	tlsConfig := &tls.Config{
      		NextProtos: []string{"h3"},
      	}

      	mux := http.NewServeMux()
      	mux.HandleFunc("/stream-data", func(w http.ResponseWriter, r *http.Request) {
      		// Log connection migration info by checking remote address
      		log.Printf("Received request from client %s using %s", r.RemoteAddr, r.Proto)

      		// Access the underlying QUIC connection metadata if using quic-go context
      		// This shows how we track Connection IDs across IP handoffs
      		if conn, ok := r.Context().Value(http3.ServerContextKey).(quic.Connection); ok {
      			log.Printf("QUIC Connection ID: %s", conn.RemoteAddr().String())
      		}

      		// Advertise HTTP/3 support via Alternative Services header
      		w.Header().Set("Alt-Svc", `h3=":443"; max=2592000`)
      		w.Header().Set("Content-Type", "application/octet-stream")

      		// Leverage HTTP/2 & HTTP/3 stream flushing to stream binary frames
      		flusher, ok := w.(http.Flusher)
      		if !ok {
      			http.Error(w, "Streaming not supported", http.StatusInternalServerError)
      			return
      		}

      		for i := 1; i <= 5; i++ {
      			payload := fmt.Sprintf("Frame-%d: Payload data over isolated QUIC stream\n", i)
      			_, err := io.WriteString(w, payload)
      			if err != nil {
      				return
      			}
      			flusher.Flush() // Pushes the chunk immediately without waiting
      		}
      	})

      	server := http3.Server{
      		Addr:      ":443",
      		Handler:   mux,
      		TLSConfig: tlsConfig,
      	}

      	log.Printf("Starting HTTP/3 (QUIC) multiplexed server on UDP port :443...")
      	// ListenAndServeTLS launches the server over UDP
      	err := server.ListenAndServeTLS("server.crt", "server.key")
      	if err != nil {
      		log.Fatalf("Server exited with error: %v", err)
      	}
      }
---

## The Concept

HTTP/3 represents a fundamental transition in how internet applications communicate. For decades, web communication relied on **TCP** (Transmission Control Protocol) to manage data reliability, ordering, and flow control. However, as web applications evolved to load hundreds of assets concurrently, the constraints of TCP became a primary performance bottleneck. 

HTTP/3 breaks free from these limitations by replacing TCP with **QUIC** (Quick UDP Internet Connections), a new transport layer protocol built on top of **UDP** (User Datagram Protocol). QUIC re-implements reliability, congestion control, and connection handshake logic in user space, resolving legacy architectural bottlenecks while incorporating modern cryptographic security by default.

<svg viewBox="0 0 580 250" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="20" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Head-of-Line Blocking: HTTP/2 (TCP) vs HTTP/3 (QUIC/UDP)</text>
  <text x="20" y="50" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold">HTTP/2 over TCP (Single Shared Queue)</text>
  <rect x="20" y="60" width="80" height="30" rx="4" fill="#bf616a" stroke="#bf616a" stroke-width="1"/>
  <text x="60" y="78" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Packet Loss (S1)</text>
  <rect x="110" y="60" width="80" height="30" rx="4" fill="#2e3440" stroke="#81a1c1" stroke-width="1"/>
  <text x="150" y="78" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Stream 2 Packet</text>
  <rect x="200" y="60" width="80" height="30" rx="4" fill="#2e3440" stroke="#81a1c1" stroke-width="1"/>
  <text x="240" y="78" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Stream 3 Packet</text>
  <path d="M 290 75 L 340 75" stroke="#bf616a" stroke-width="1.5" stroke-dasharray="3 3" fill="none" marker-end="url(#arrow-red)"/>
  <rect x="350" y="60" width="210" height="30" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="455" y="78" fill="#ebcb8b" font-family="sans-serif" font-size="10" text-anchor="middle">QUEUE STALLED (Waiting for S1 retransmit)</text>
  <text x="20" y="130" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold">HTTP/3 over QUIC (Isolated Streams)</text>
  <rect x="20" y="140" width="80" height="30" rx="4" fill="#bf616a" stroke="#bf616a" stroke-width="1"/>
  <text x="60" y="158" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Packet Loss (S1)</text>
  <path d="M 110 155 L 140 155" stroke="#bf616a" stroke-width="1.5" stroke-dasharray="3 3" fill="none" marker-end="url(#arrow-red)"/>
  <rect x="150" y="140" width="100" height="30" rx="4" fill="#3b4252" stroke="#bf616a" stroke-width="1"/>
  <text x="200" y="158" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">S1 Blocked</text>
  <rect x="270" y="135" width="80" height="22" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1"/>
  <text x="310" y="149" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Stream 2 Packet</text>
  <path d="M 360 146 L 410 146" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#arrow-green)"/>
  <rect x="420" y="135" width="140" height="22" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1"/>
  <text x="490" y="149" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">S2 Processed (No Delay)</text>
  <rect x="270" y="175" width="80" height="22" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1"/>
  <text x="310" y="189" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Stream 3 Packet</text>
  <path d="M 360 186 L 410 186" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#arrow-green)"/>
  <rect x="420" y="175" width="140" height="22" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1"/>
  <text x="490" y="189" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">S3 Processed (No Delay)</text>
  <defs>
    <marker id="arrow-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#bf616a"/>
    </marker>
    <marker id="arrow-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#a3be8c"/>
    </marker>
  </defs>
</svg>

---

## Practical Analogy

Consider a logistics depot delivering three separate customer orders (representing application data streams) to their destinations:

* **HTTP/2 (TCP)** is like packing all three orders onto a single large flatbed truck. The truck drives along a highway (a single TCP connection). If a single tire punctures (packet loss), the entire truck must pull over to the side of the road. Even if the packages for Customer 2 and Customer 3 are fully intact, they cannot be delivered until the tire is repaired (retransmission of the lost packet).
* **HTTP/3 (QUIC)** is like loading the three orders into three separate delivery vans. The vans travel along the highway concurrently. If the van carrying Customer 1's order breaks down, the vans carrying Customer 2 and Customer 3's orders continue their journeys unimpeded. They arrive and deliver their cargo on schedule, isolated from the failure affecting Customer 1.

---

## The Head-of-Line Blocking Problem

HTTP/2 introduced multiplexing, allowing multiple request and response streams to be interleaved over a single TCP connection. However, because TCP treats the entire connection as a single, ordered byte stream, it is unaware of these logical divisions. 

If a TCP segment is lost in transit, the receiving operating system kernel must buffer all subsequent segments in its TCP receive queue. It cannot pass these successful segments to the user space application until the missing segment is retransmitted and received. This condition, known as transport layer **head-of-line (HoL) blocking**, causes latency spikes and throughput degradation on networks with high packet loss, such as mobile networks or congested Wi-Fi.

HTTP/3 resolves this issue by delegating multiplexing to the transport layer. QUIC understands the concept of independent **streams** natively. When a packet containing data for Stream 1 is lost, QUIC pauses only Stream 1. Packets for Stream 2 and Stream 3 continue to be processed and dispatched to user space immediately.

---

## QUIC Transport Mechanics

QUIC runs directly over UDP, bypassing the operating system kernel's TCP stack. This shift offers several critical advantages:

* **Custom Flow Control**: Flow control is managed at both the connection level and individual stream level. Stream limits prevent a single fast stream from consuming the entire receive buffer, while connection limits govern overall memory consumption.
* **User-Space Implementation**: Because QUIC runs on top of UDP, its implementation is housed in user space rather than the operating system kernel. This architecture allows rapid optimization, security updates, and protocol evolution without requiring OS upgrades.
* **Active Congestion Control**: QUIC defines a pluggable congestion control interface, supporting algorithms like BBR (Bottleneck Bandwidth and Round-trip propagation time) and CUBIC natively in user space.

---

## Connection Stability and Migration

In traditional networks, a TCP connection is bound to a unique four-tuple: source IP, source port, destination IP, and destination port. If a client switches from a Wi-Fi network to cellular data, their source IP address changes. This change invalidates the four-tuple, forcing the operating system to terminate the TCP connection and establish a new one, causing application delays.

QUIC replaces four-tuple bindings with a 64-bit **Connection ID** (CID). The CID is independent of the network routing layer. When a client changes IP addresses:
1. The client sends a packet containing the existing Connection ID from its new IP address.
2. The server authenticates the client using cryptographic tokens associated with the CID.
3. The connection is migrated seamlessly to the new IP-port path without requiring a renegotiated handshake. This mechanism is known as **Connection Migration**.

---

## Consolidated Handshakes

Establishing an HTTPS connection over TCP requires multiple network round trips:
1. **TCP Handshake** (1 RTT): Exchanges SYN and ACK packets to establish transport ordering.
2. **TLS Handshake** (1 to 2 RTTs): Negotiates cryptographic parameters and exchanges certificates.

HTTP/3 consolidates transport and security configurations into a single unified handshake. Because QUIC integrates TLS 1.3 directly into its transport design, the handshake requires only 1 RTT:

```
Client                                      Server
  |                                           |
  |--- ClientHello + TransportParameters ---->|  (1 RTT: Unified Handshake)
  |<-- EncryptedExtensions + Cert + Finished -|
  |                                           |
  |====== Encrypted HTTP/3 Application Data ===|
```

On subsequent connections, QUIC supports **0-RTT resumption**. The client uses previously cached session parameters to encrypt and transmit HTTP/3 requests in the very first packet, eliminating initial round-trip latency.

---

## QPACK Header Compression

HTTP/2 uses **HPACK** to compress headers, maintaining a synchronized state table of headers on both the client and server. However, HPACK requires strict ordering of header blocks. If a packet containing header updates is lost, the receiver cannot decompress subsequent headers on other streams, reintroducing head-of-line blocking.

HTTP/3 utilizes **QPACK** (RFC 9204), which allows out-of-order header decompression. QPACK splits its design into:
* **Static Table**: A predefined list of 98 common header fields.
* **Dynamic Table**: A stateful table constructed from headers exchanged during the connection.
* **Encoder and Decoder Streams**: Dedicated unidirectional streams used to update and acknowledge dynamic table states. 

If a header refers to a dynamic table index that the decoder has not yet processed, only that specific request stream is blocked. Other streams that reference the static table or already synchronized dynamic indexes are processed immediately.

---

## Network Deployment Challenges

Despite its advantages, deploying HTTP/3 introduces infrastructure hurdles:

* **UDP Port Blocking**: Many enterprise firewalls and ISPs block UDP port 443, assuming it is malicious traffic or DNS abuse. 
* **Fallback Mechanisms**: To handle UDP blocking, web servers utilize the `Alt-Svc` (Alternative Services) response header to advertise HTTP/3 support:
  ```http
  Alt-Svc: h3=":443"; max=2592000
  ```
  A browser initial request connects via TCP (HTTP/2 or HTTP/1.1). Upon reading the `Alt-Svc` header, the browser attempts to upgrade subsequent connections to HTTP/3. If the UDP attempt fails or times out, it gracefully falls back to TCP.

---

## Further Reading

* [RFC 9000: QUIC: A UDP-Based Multiplexed and Secure Transport](https://datatracker.ietf.org/doc/html/rfc9000) — The foundational QUIC protocol specification.
* [RFC 9114: Hypertext Transfer Protocol Version 3 (HTTP/3)](https://datatracker.ietf.org/doc/html/rfc9114) — The official HTTP/3 standard mapping semantics to QUIC.
* [RFC 9204: QPACK: Header Compression for HTTP/3](https://datatracker.ietf.org/doc/html/rfc9204) — Architectural details of the QPACK compression mechanism.
