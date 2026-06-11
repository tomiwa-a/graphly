---
title: Load Balancing & Service Discovery
slug: load-balancing-service-discovery
summary: "Load balancing distributes incoming traffic across multiple backend servers, working alongside service discovery registries to dynamically track available endpoints in elastic environments."
difficulty: intermediate
chapterId: reliability
domain: Reliability & Scale
estimatedMinutes: 12
prerequisites: [dns, http]
related: [kubernetes]
seo_title: "Load Balancing & Service Discovery: Layer 4 vs Layer 7"
seo_description: "Understand Layer 4 and Layer 7 load balancing algorithms, health checks, and dynamic service discovery registries like Consul."
canonical_url: "/concepts/load-balancing-service-discovery"
citations:
  - title: "Computer Networking: A Top-Down Approach"
    author: "James F. Kurose and Keith W. Ross"
    chapter: "Chapter 6: Load Balancing and Server Clusters"
    page_range: "410-435"
    external_link: "https://www.pearson.com/en-us/subject-catalog/p/computer-networking-a-top-down-approach/P200000003290/"
code_examples:
  - language: go
    title: "Layer 7 Reverse Proxy Router with Active Health Checking"
    code: |
      package main

      import (
          "context"
          "log"
          "net/http"
          "net/http/httputil"
          "net/url"
          "sync"
          "sync/atomic"
          "time"
      )

      type Backend struct {
          URL          *url.URL
          Alive        bool
          mux          sync.RWMutex
          ReverseProxy *httputil.ReverseProxy
      }

      func (b *Backend) SetAlive(alive bool) {
          b.mux.Lock()
          b.Alive = alive
          b.mux.Unlock()
      }

      func (b *Backend) IsAlive() bool {
          b.mux.RLock()
          defer b.mux.RUnlock()
          return b.Alive
      }

      type ServerPool struct {
          backends []*Backend
          current  uint64
      }

      func (s *ServerPool) AddBackend(backend *Backend) {
          s.backends = append(s.backends, backend)
      }

      func (s *ServerPool) NextIndex() int {
          return int(atomic.AddUint64(&s.current, 1) % uint64(len(s.backends)))
      }

      func (s *ServerPool) GetNextPeer() *Backend {
          n := len(s.backends)
          for i := 0; i < n; i++ {
              idx := s.NextIndex()
              if s.backends[idx].IsAlive() {
                  return s.backends[idx]
              }
          }
          return nil
      }

      func (s *ServerPool) HealthCheck() {
          for _, b := range s.backends {
              status := b.isAlive()
              b.SetAlive(status)
              if !status {
                  log.Printf("Backend %s is DOWN", b.URL.String())
              }
          }
      }

      func (b *Backend) isAlive() bool {
          client := http.Client{
              Timeout: 2 * time.Second,
          }
          resp, err := client.Get(b.URL.String() + "/health")
          if err != nil {
              return false
          }
          defer resp.Body.Close()
          return resp.StatusCode == http.StatusOK
      }

      func main() {
          serverPool := &ServerPool{}

          targets := []string{
              "http://localhost:8081",
              "http://localhost:8082",
              "http://localhost:8083",
          }

          for _, target := range targets {
              targetURL, _ := url.Parse(target)
              proxy := httputil.NewSingleHostReverseProxy(targetURL)
              
              backend := &Backend{
                  URL:          targetURL,
                  Alive:        true,
                  ReverseProxy: proxy,
              }
              serverPool.AddBackend(backend)
          }

          go func() {
              ticker := time.NewTicker(10 * time.Second)
              for range ticker.C {
                  serverPool.HealthCheck()
              }
          }()

          frontendHandler := func(w http.ResponseWriter, r *http.Request) {
              peer := serverPool.GetNextPeer()
              if peer != nil {
                  peer.ReverseProxy.ServeHTTP(w, r)
                  return
              }
              http.Error(w, "Service Unavailable", http.StatusServiceUnavailable)
          }

          server := http.Server{
              Addr:    ":8080",
              Handler: http.HandlerFunc(frontendHandler),
          }

          log.Fatal(server.ListenAndServe())
      }
---

## The Need for Load Balancing

In modern systems, a single server cannot scale infinitely. When CPU, memory, or network bandwidth boundaries are hit, systems must scale out horizontally by adding more servers.

To act as a unified service, a horizontal cluster requires a coordinator to distribute client requests across the pool of available servers. This is the role of the **load balancer**. A load balancer distributes incoming network traffic, prevents server overload, and isolates client applications from backend infrastructure failures.

## Layer 4 vs Layer 7 Load Balancing

Load balancers operate at different levels of the OSI network stack, yielding distinct capabilities and performance characteristics:

### Layer 4 (Transport Layer)
Layer 4 load balancers route traffic based on packet headers without looking inside the application payload. They look only at transport protocols (TCP or UDP) and address details (source/destination IP addresses and ports).
* **No TCP Termination**: The load balancer does not terminate the TCP connection, it simply redirects packets using network address translation (NAT). The TCP connection is established directly between the client and the backend server.
* **Pros**: Extremely fast, low CPU overhead, handles millions of concurrent connections.
* **Cons**: Cannot inspect application protocol details (like HTTP paths or headers), cannot perform cookie-based sticky sessions or path-based routing.

### Layer 7 (Application Layer)
Layer 7 load balancers route traffic based on application data, including HTTP headers, cookies, query parameters, or paths.
* **TCP Termination**: The load balancer terminates the incoming client TCP connection, reads the HTTP payload, selects a backend server, and establishes a separate TCP connection to forward the request.
* **Pros**: Highly flexible, supports path-based routing (e.g. routing `/api/users` to Service A and `/api/products` to Service B), supports SSL termination, headers inspection, and smart rate-limiting.
* **Cons**: Higher CPU and memory consumption per connection due to TCP termination and payload parsing.

## Diagram: Layer 4 vs Layer 7 Traffic Routing

The following diagram illustrates how Layer 4 and Layer 7 load balancers process and route connections to backend servers:

<svg viewBox="0 0 580 280" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="24" font-family="sans-serif" font-size="14" fill="#88c0d0" text-anchor="middle" font-weight="bold">Layer 4 vs Layer 7 Load Balancing</text>
  <text x="30" y="70" font-family="sans-serif" font-size="11" fill="#88c0d0" font-weight="bold">Layer 4 (Transport / TCP)</text>
  <rect x="30" y="80" width="80" height="40" rx="4" fill="#2e3440" stroke="#81a1c1"/>
  <text x="70" y="105" font-family="sans-serif" font-size="10" fill="#eceff4" text-anchor="middle">Client TCP</text>
  <path d="M 110 100 L 200 100" stroke="#eceff4" stroke-width="1.5" marker-end="url(#arrow)"/>
  <rect x="200" y="80" width="120" height="40" rx="4" fill="#3b4252" stroke="#ebcb8b"/>
  <text x="260" y="98" font-family="sans-serif" font-size="10" fill="#eceff4" text-anchor="middle" font-weight="bold">L4 Load Balancer</text>
  <text x="260" y="110" font-family="sans-serif" font-size="8" fill="#ebcb8b" text-anchor="middle">No TCP Termination</text>
  <path d="M 320 100 L 440 85" stroke="#a3be8c" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="30" y="165" font-family="sans-serif" font-size="11" fill="#a3be8c" font-weight="bold">Layer 7 (Application / HTTP)</text>
  <rect x="30" y="175" width="80" height="40" rx="4" fill="#2e3440" stroke="#81a1c1"/>
  <text x="70" y="200" font-family="sans-serif" font-size="10" fill="#eceff4" text-anchor="middle">Client HTTP</text>
  <path d="M 110 195 L 200 195" stroke="#eceff4" stroke-width="1.5" marker-end="url(#arrow)"/>
  <rect x="200" y="175" width="120" height="40" rx="4" fill="#3b4252" stroke="#a3be8c"/>
  <text x="260" y="193" font-family="sans-serif" font-size="10" fill="#eceff4" text-anchor="middle" font-weight="bold">L7 Load Balancer</text>
  <text x="260" y="205" font-family="sans-serif" font-size="8" fill="#a3be8c" text-anchor="middle">Terminates TCP &amp; Reads Path</text>
  <path d="M 320 195 L 440 215" stroke="#a3be8c" stroke-width="1.5" marker-end="url(#arrow)"/>
  <rect x="440" y="60" width="110" height="40" rx="4" fill="#2e3440" stroke="#81a1c1"/>
  <text x="495" y="85" font-family="sans-serif" font-size="10" fill="#eceff4" text-anchor="middle">Backend Server A</text>
  <rect x="440" y="195" width="110" height="40" rx="4" fill="#2e3440" stroke="#81a1c1"/>
  <text x="495" y="220" font-family="sans-serif" font-size="10" fill="#eceff4" text-anchor="middle">Backend Server B</text>
  <defs>
    <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#81a1c1"/>
    </marker>
  </defs>
</svg>

## Load Balancing Routing Algorithms

Load balancers distribute connections based on configured routing policies:
* **Round Robin**: Routes requests sequentially down the list of servers. Simple but assumes all backend servers have equal capacity.
* **Weighted Round Robin**: Assigns a weight metric to each server based on hardware capacity, routing a proportionally higher volume of requests to stronger machines.
* **Least Connections**: Tracks active concurrent connections and routes new requests to the backend server with the lowest connection load.
* **Consistent Hashing**: Hashes request attributes (like client IP or session cookie ID) to map queries to specific servers on a hash ring. Ensures users stick to the same server (sticky sessions) while keeping partitions uniform.

## Health Checking and Target Resiliency

To prevent black-holing traffic (sending requests to a dead server), load balancers actively monitor target health:
* **Active Health Checking**: The load balancer periodically sends a request (e.g. an HTTP `GET /health` request) to backend servers. If a server fails several checks consecutively, it is removed from the active routing pool.
* **Passive Health Checking**: The load balancer intercepts real application traffic. If connection timeouts or `5xx` errors spike on a server during standard operations, the balancer circuit-breaks traffic to that instance.

## Dynamic Service Discovery and Registries

In cloud-native or containerized environments, IP addresses are ephemeral, containers spin up and shut down on demand, and server numbers scale dynamically based on demand. A static list of IPs in a load balancer configuration will quickly break.

To solve this, architectures use **Service Discovery**. This system is comprised of:
* **Service Registry**: A centralized, highly available database (like Consul, ZooKeeper, or Eureka) tracking the state and IP coordinates of all running service instances.
* **Registration**: When a backend container starts, it registers its IP address, port, and health check path with the service registry.
* **Discovery**: When a client (or load balancer) wants to call a service, it queries the registry to obtain a list of currently active IP addresses.

### DNS-based Service Discovery
Some infrastructures use DNS SRV records for discovery. However, standard DNS has limitations in elastic environments due to client-side DNS caching and TTL delays. If a container dies, clients might continue attempting to query the old IP until the TTL expires, whereas dedicated registries push instant configuration updates to load balancers.

## Advanced L4 Routing: NAT, DSR, and VIPs

High-performance Layer 4 load balancers use specialized network routing paths to maximize throughput:
* **Network Address Translation (NAT)**: The load balancer modifies the destination IP of incoming packets to match the selected backend server. The backend response is routed back through the load balancer, which translates the source IP back to the Virtual IP (VIP) of the balancer.
* **Direct Server Return (DSR)**: The load balancer only routes incoming request packets, modifying the destination MAC address to target a backend server while leaving the VIP destination IP intact. The backend server is configured to accept traffic on the VIP and replies directly to the client, bypassing the load balancer entirely. This is highly efficient since incoming requests are typically small (KB) while responses are large (MB).

## Further Reading

* [Nginx Load Balancing Guide](https://docs.nginx.com/nginx/admin-guide/load-balancer/)
* [HAProxy Architecture Overview](https://www.haproxy.com/blog/introduction-to-haproxy/)
* [Consul Service Discovery Guide](https://developer.hashicorp.com/consul/docs/discovery)
