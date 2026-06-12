---
title: Forward Proxy vs Reverse Proxy
slug: proxy-vs-reverse-proxy
summary: "Understand the roles of forward and reverse proxies, examining connection splicing, header injection, security shielding, and traffic routing."
difficulty: beginner
chapterId: infrastructure
domain: Infrastructure
estimatedMinutes: 10
prerequisites: [http, network-sockets-tcp-udp]
related: [load-balancing-service-discovery, api-gateways]
seo_title: "Forward Proxy vs Reverse Proxy: Network Architecture and Routing"
seo_description: "Learn the core differences between forward and reverse proxies. Understand how connection splicing, X-Forwarded-For headers, and subnet isolation secure networks."
canonical_url: "/concepts/proxy-vs-reverse-proxy"
citations:
  - title: "Hypertext Transfer Protocol -- HTTP/1.1"
    author: "Roy Thomas Fielding, et al."
    chapter: "Section 1.3: Terminology (Proxies, Gateways, and Tunnels)"
    external_link: "https://datatracker.ietf.org/doc/html/rfc2616"
code_examples:
  - language: go
    title: Hand-Crafted TCP Forward Proxy and HTTP Reverse Proxy with Header Injection
    code: |
      package main

      import (
      	"io"
      	"log"
      	"net"
      	"net/http"
      	"net/http/httputil"
      	"net/url"
      )

      // ==========================================
      // 1. RAW TCP FORWARD PROXY IMPLEMENTATION
      // ==========================================
      // tcpForwardProxy listens locally and pipes raw bytes to a target server.
      // Used by clients inside a private network to reach external targets.
      func startTCPForwardProxy(localPort, targetAddr string) {
      	listener, err := net.Listen("tcp", ":"+localPort)
      	if err != nil {
      		log.Fatalf("Forward Proxy failed to listen: %v", err)
      	}
      	defer listener.Close()

      	log.Printf("TCP Forward Proxy listening on :%s, forwarding to %s\n", localPort, targetAddr)

      	for {
      		clientConn, err := listener.Accept()
      		if err != nil {
      			log.Printf("Failed to accept client connection: %v", err)
      			continue
      		}

      		// Connect to the external target server on behalf of the client
      		targetConn, err := net.Dial("tcp", targetAddr)
      		if err != nil {
      			log.Printf("Failed to connect to target server: %v", err)
      			clientConn.Close()
      			continue
      		}

      		// Splice connections: copy data bi-directionally in background routines
      		go func(c, t net.Conn) {
      			defer c.Close()
      			defer t.Close()
      			io.Copy(t, c) // Pipe client request to target
      		}(clientConn, targetConn)

      		go func(c, t net.Conn) {
      			defer c.Close()
      			defer t.Close()
      			io.Copy(c, t) // Pipe target response to client
      		}(clientConn, targetConn)
      	}
      }

      // ==========================================
      // 2. HTTP REVERSE PROXY WITH HEADER INJECTION
      // ==========================================
      // startReverseProxy runs an HTTP reverse proxy acting as ingress for backend microservices.
      func startReverseProxy(listenPort, targetURLStr string) {
      	target, err := url.Parse(targetURLStr)
      	if err != nil {
      		log.Fatalf("Invalid backend URL: %v", err)
      	}

      	// Create standard library reverse proxy utility
      	proxy := httputil.NewSingleHostReverseProxy(target)

      	// Modify default director to inject upstream tracking headers
      	originalDirector := proxy.Director
      	proxy.Director = func(req *http.Request) {
      		originalDirector(req)

      		// Extract client IP address from network connection
      		clientIP, _, err := net.SplitHostPort(req.RemoteAddr)
      		if err == nil {
      			// Append Client IP to X-Forwarded-For header chain
      			existingXFF := req.Header.Get("X-Forwarded-For")
      			if existingXFF != "" {
      				req.Header.Set("X-Forwarded-For", existingXFF+", "+clientIP)
      			} else {
      				req.Header.Set("X-Forwarded-For", clientIP)
      			}

      			// Set standard X-Real-IP header to track direct ingress connection
      			req.Header.Set("X-Real-IP", clientIP)
      		}

      		// Inject authentication or tracing tokens dynamically
      		req.Header.Set("X-Proxy-Ingress", "ReverseProxy-Go-Gateway")
      	}

      	log.Printf("HTTP Reverse Proxy listening on :%s, ingress for %s\n", listenPort, targetURLStr)
      	log.Fatal(http.ListenAndServe(":"+listenPort, proxy))
      }

      func main() {
      	// Run raw TCP Forward Proxy in background (e.g. forward local port 8080 to a web target)
      	go startTCPForwardProxy("8080", "127.0.0.1:9090")

      	// Run HTTP Reverse Proxy synchronously (e.g. gateway on 8000 sending to target service 9090)
      	startReverseProxy("8000", "http://127.0.0.1:9090")
      }
---

## The Concept

In network routing, traffic rarely flows directly from a user's machine to a raw database or application server process. Instead, intermediate systems manage, inspect, and route packets along the path. These intermediaries are known as **proxies**. 

While both forward and reverse proxies sit between clients and servers, they serve opposite masters and reside on different sides of the network boundary:
* A **Forward Proxy** represents the client. It intercepts outgoing requests from private client machines to the public internet, masking client identity and filtering outbound content.
* A **Reverse Proxy** represents the server. It intercepts incoming public traffic, shielding internal server topologies, distributing loads, and handling transport encryption.

<svg viewBox="0 0 580 280" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;"><text x="290" y="20" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Forward Proxy vs Reverse Proxy Architecture</text><line x1="20" y1="140" x2="560" y2="140" stroke="#4c566a" stroke-dasharray="4" stroke-width="1"/><text x="30" y="45" fill="#88c0d0" font-family="sans-serif" font-size="9" font-weight="bold">Forward Proxy (Acts on behalf of Clients)</text><rect x="25" y="65" width="60" height="40" rx="4" fill="#2e3440" stroke="#81a1c1" stroke-width="1"/><text x="55" y="85" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">Clients</text><text x="55" y="95" fill="#81a1c1" font-family="sans-serif" font-size="7" text-anchor="middle">(Private Net)</text><path d="M 85 85 L 140 85" stroke="#ebcb8b" stroke-width="1" fill="none" marker-end="url(#arrow-yel)"/><rect x="150" y="65" width="80" height="40" rx="4" fill="#3b4252" stroke="#ebcb8b" stroke-width="1"/><text x="190" y="85" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">Forward Proxy</text><text x="190" y="95" fill="#81a1c1" font-family="sans-serif" font-size="7" text-anchor="middle">(Shields Clients)</text><path d="M 230 85 L 290 85" stroke="#88c0d0" stroke-width="1" fill="none" marker-end="url(#arrow-blue)"/><rect x="300" y="65" width="70" height="40" rx="4" fill="#2e3440" stroke="#81a1c1" stroke-width="1"/><text x="335" y="90" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">Internet</text><path d="M 370 85 L 435 85" stroke="#a3be8c" stroke-width="1" fill="none" marker-end="url(#arrow-green)"/><rect x="445" y="65" width="80" height="40" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1"/><text x="485" y="85" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">Web Server</text><text x="485" y="95" fill="#81a1c1" font-family="sans-serif" font-size="7" text-anchor="middle">(Public Target)</text><text x="30" y="165" fill="#88c0d0" font-family="sans-serif" font-size="9" font-weight="bold">Reverse Proxy (Acts on behalf of Servers)</text><rect x="25" y="190" width="70" height="40" rx="4" fill="#2e3440" stroke="#81a1c1" stroke-width="1"/><text x="60" y="215" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">Internet Client</text><path d="M 95 210 L 140 210" stroke="#88c0d0" stroke-width="1" fill="none" marker-end="url(#arrow-blue)"/><rect x="150" y="190" width="80" height="40" rx="4" fill="#3b4252" stroke="#ebcb8b" stroke-width="1"/><text x="190" y="210" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">Reverse Proxy</text><text x="190" y="220" fill="#81a1c1" font-family="sans-serif" font-size="7" text-anchor="middle">(Shields Servers)</text><path d="M 230 210 L 290 210" stroke="#ebcb8b" stroke-width="1" fill="none" marker-end="url(#arrow-yel)"/><rect x="300" y="180" width="230" height="65" rx="6" fill="#2e3440" stroke="#eceff4" stroke-width="1" stroke-dasharray="2"/><text x="415" y="195" fill="#eceff4" font-family="sans-serif" font-size="8" font-weight="bold" text-anchor="middle">Private Server Network</text><rect x="310" y="202" width="60" height="30" rx="3" fill="#3b4252" stroke="#a3be8c" stroke-width="1"/><text x="340" y="220" fill="#eceff4" font-family="sans-serif" font-size="7" text-anchor="middle">App Srv 1</text><rect x="385" y="202" width="60" height="30" rx="3" fill="#3b4252" stroke="#a3be8c" stroke-width="1"/><text x="415" y="220" fill="#eceff4" font-family="sans-serif" font-size="7" text-anchor="middle">App Srv 2</text><rect x="460" y="202" width="60" height="30" rx="3" fill="#3b4252" stroke="#a3be8c" stroke-width="1"/><text x="490" y="220" fill="#eceff4" font-family="sans-serif" font-size="7" text-anchor="middle">Database</text><defs><marker id="arrow-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#88c0d0"/></marker><marker id="arrow-yel" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#ebcb8b"/></marker><marker id="arrow-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#a3be8c"/></marker></defs></svg>

---

## Practical Analogy

The difference between proxies can be mapped to corporate communication and incoming mail handling:

* A **Forward Proxy** is like a **corporate legal representative**. When employees want to communicate with external organizations, they do not write to them directly. They send their requests to the legal rep. The representative strips out the employee's personal contact details, puts the message on company letterhead, sends it on their behalf, receives the response, and hands it back. The outside world only knows they spoke to the company legal representative, not the specific employee.
* A **Reverse Proxy** is like a **company mailroom desk** at the front office. When customers write to the company, they address their envelopes to the main corporate headquarters address. They do not know which internal clerk, office cubicle, or department will process the letter. The mailroom desk receives the packet, unboxes it, routes it to the specific accounting or shipping clerk internally, receives their reply, and sends it back to the customer under the corporate return address.

---

## Forward Proxies Explained

A **Forward Proxy** (often called just a "proxy") sits in front of one or more client machines on a private local network. When a client makes a request to a public destination server (e.g. `google.com`), the request is routed through the proxy.

### Primary Functions
* **Obscuring Client Identity**: The target web server sees the request originating from the forward proxy's IP address rather than the client's private IP, masking client details.
* **Content Filtering**: Organizations use forward proxies to restrict employees from accessing unauthorized websites.
* **Caching**: The proxy can cache frequently downloaded files locally, allowing subsequent users to fetch them without utilizing external WAN bandwidth.

---

## Reverse Proxies Explained

A **Reverse Proxy** sits in front of one or more backend servers (e.g. databases, microservices, file systems). It acts as the gateway for all external internet requests directed at the application.

When a client queries the application, they target the reverse proxy's public IP address. The proxy evaluates the path, terminates TLS encryption, and routes the request to the appropriate internal server.

### Primary Functions
* **Load Balancing**: The proxy distributes incoming request loads across a pool of duplicate backend servers (such as Nginx balancing traffic across multiple Go app instances).
* **TLS/SSL Termination**: The proxy performs the computationally expensive cryptographic decryption, allowing backend services to communicate in plain HTTP or RPC inside the secure subnet.
* **Security Shielding**: The reverse proxy hides the physical IP addresses, operating systems, and network details of the actual app servers, preventing attackers from targeting them directly.

---

## TCP/IP Connection Splicing

A proxy is not a router that merely forwards network packets at the IP layer. Instead, it operates by **connection splicing**:

1. **Termination**: When a client initiates a request, the proxy accepts and terminates the incoming TCP handshake. It establishes a complete TCP connection socket with the client.
2. **Evaluation**: The proxy reads the payload (e.g., parsing HTTP headers or application data).
3. **Upstream Creation**: The proxy initiates a secondary, completely independent TCP connection to the destination upstream server.
4. **Data Piping**: The proxy reads bytes from the client socket buffer and writes them to the target upstream socket buffer, copying returns bi-directionally.

This connection isolation provides robust stability. If a client has a slow, flaky mobile connection, the proxy handles the slow packet transmission buffers, while maintaining a lightning-fast, persistent TCP connection pool to the internal backend servers.

---

## Header Transformations and Metadata Injection

Because a reverse proxy terminates the client's connection and initiates a new one, the backend application server sees the request as coming from the proxy's internal IP address, not the client's public IP. To prevent losing client context, proxies inject metadata headers into the upstream request:

* `X-Forwarded-For`: A comma-separated chain tracking the path of IP addresses the request passed through (e.g. `client-ip, proxy1-ip, proxy2-ip`).
* `X-Real-IP`: Represents the immediate physical IP of the client that established the socket connection with the ingress proxy.
* `X-Forwarded-Proto`: Indicates the protocol the client used to connect (e.g. `https`), allowing backends to redirect unsafe `http` calls.

---

## Security Isolation and Network Ingress

In modern cloud infrastructures, backend servers are placed in a **Private Subnet** (a network partition with no public IP routing table). These database and application servers are physically unreachable from the public internet. 

The reverse proxy is placed on the network edge inside a **Public Subnet** (acting as the Bastion or Ingress point) and is assigned a public IP. By restricting ingress access to the reverse proxy, developers ensure that all incoming requests are authenticated, rate-limited, and logged before they can touch internal business systems.

---

## Further Reading

* [RFC 2616: Hypertext Transfer Protocol -- HTTP/1.1](https://datatracker.ietf.org/doc/html/rfc2616) — The seminal IETF specification defining proxies, gateways, and connection behaviors.
* [Nginx Reverse Proxy Documentation](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/) — Detailed setup guide on building, forwarding, and optimizing Nginx reverse proxy routing.
* [Envoy Proxy Architecture Guide](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/arch_overview) — Foundations of high-performance modern L4 and L7 network proxies used in microservice platforms.
