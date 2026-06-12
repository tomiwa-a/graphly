---
title: API Gateways
slug: api-gateways
summary: "Understand the API Gateway pattern as the central ingress point for microservices, handling routing, auth, rate limiting, and protocol translation."
difficulty: intermediate
chapterId: api-design
domain: API Design
estimatedMinutes: 12
prerequisites: [load-balancing-service-discovery, http]
related: [rate-limiting, circuit-breakers]
seo_title: "API Gateways: Architectural Patterns, Ingress, and Routing"
seo_description: "Deep dive into API Gateways for microservices. Learn about reverse proxying, TLS termination, middleware chains, dynamic reloading, and protocol mapping."
canonical_url: "/concepts/api-gateways"
citations:
  - title: "Microservices Patterns"
    author: "Chris Richardson"
    chapter: "Chapter 8: External API Patterns: Designing an API Gateway"
    external_link: "https://microservices.io/book"
code_examples:
  - language: go
    title: Micro-API Gateway with JWT Validation, Rate Limiting, and Dynamic Routing
    code: |
      package main

      import (
      	"crypto/rsa"
      	"encoding/base64"
      	"encoding/json"
      	"errors"
      	"fmt"
      	"log"
      	"net/http"
      	"net/http/httputil"
      	"net/url"
      	"strings"
      	"sync"
      	"time"
      )

      // TokenBucket represents a local thread-safe rate limiter
      type TokenBucket struct {
      	mu           sync.Mutex
      	tokens       float64
      	capacity     float64
      	refillRate   float64 // tokens per second
      	lastRefilled time.Time
      }

      func NewTokenBucket(capacity, refillRate float64) *TokenBucket {
      	return &TokenBucket{
      		tokens:       capacity,
      		capacity:     capacity,
      		refillRate:   refillRate,
      		lastRefilled: time.Now(),
      	}
      }

      func (tb *TokenBucket) Allow() bool {
      	tb.mu.Lock()
      	defer tb.mu.Unlock()

      	now := time.Now()
      	elapsed := now.Sub(tb.lastRefilled).Seconds()
      	tb.lastRefilled = now

      	tb.tokens = tb.tokens + elapsed*tb.refillRate
      	if tb.tokens > tb.capacity {
      		tb.tokens = tb.capacity
      	}

      	if tb.tokens >= 1.0 {
      		tb.tokens -= 1.0
      		return true
      	}
      	return false
      }

      // Router configures path-based proxy rules
      type GatewayRoute struct {
      	PathPrefix string
      	TargetURL  *url.URL
      	Proxy      *httputil.ReverseProxy
      }

      type Gateway struct {
      	routes      []GatewayRoute
      	rateLimiter *TokenBucket
      	publicKey   *rsa.PublicKey // Asymmetric public key for RS256 JWT validation
      }

      type Claims struct {
      	UserID string `json:"sub"`
      	Exp    int64  `json:"exp"`
      }

      // VerifyJWT extracts user ID from a mock RS256 token signature
      func (gw *Gateway) VerifyJWT(authHeader string) (string, error) {
      	if !strings.HasPrefix(authHeader, "Bearer ") {
      		return "", errors.New("missing or invalid authorization header")
      	}
      	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
      	parts := strings.Split(tokenString, ".")
      	if len(parts) != 3 {
      		return "", errors.New("invalid token format")
      	}

      	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
      	if err != nil {
      		return "", err
      	}

      	var claims Claims
      	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
      		return "", err
      	}

      	if time.Now().Unix() > claims.Exp {
      		return "", errors.New("token has expired")
      	}

      	return claims.UserID, nil
      }

      func (gw *Gateway) ServeHTTP(w http.ResponseWriter, r *http.Request) {
      	// 1. Rate Limiting Check
      	if !gw.rateLimiter.Allow() {
      		w.Header().Set("Retry-After", "5")
      		http.Error(w, "Rate limit exceeded. Please try again later.", http.StatusTooManyRequests)
      		return
      	}

      	// 2. Client Authentication Validation
      	userID, err := gw.VerifyJWT(r.Header.Get("Authorization"))
      	if err != nil {
      		http.Error(w, fmt.Sprintf("Unauthorized: %v", err), http.StatusUnauthorized)
      		return
      	}

      	// 3. Dynamic Route Matching & Reverse Proxying
      	for _, route := range gw.routes {
      		if strings.HasPrefix(r.URL.Path, route.PathPrefix) {
      			// Inject identified metadata for downstream microservices
      			r.Header.Set("X-User-Id", userID)
      			
      			// Dynamic Path rewrite if necessary (e.g. stripping prefix)
      			r.URL.Path = strings.TrimPrefix(r.URL.Path, route.PathPrefix)
      			if !strings.HasPrefix(r.URL.Path, "/") {
      				r.URL.Path = "/" + r.URL.Path
      			}

      			// Forward request to internal target
      			route.Proxy.ServeHTTP(w, r)
      			return
      		}
      	}

      	http.Error(w, "Route not found", http.StatusNotFound)
      }

      func main() {
      	userURL, _ := url.Parse("http://localhost:8081")
      	orderURL, _ := url.Parse("http://localhost:8082")

      	userProxy := httputil.NewSingleHostReverseProxy(userURL)
      	orderProxy := httputil.NewSingleHostReverseProxy(orderURL)

      	gateway := &Gateway{
      		rateLimiter: NewTokenBucket(100.0, 10.0), // Cap 100 requests, refills 10/sec
      		routes: []GatewayRoute{
      			{PathPrefix: "/api/v1/users", TargetURL: userURL, Proxy: userProxy},
      			{PathPrefix: "/api/v1/orders", TargetURL: orderURL, Proxy: orderProxy},
      		},
      	}

      	log.Printf("Starting Micro-API Gateway on :8000...")
      	log.Fatal(http.ListenAndServe(":8000", gateway))
      }
---

## The Concept

In a microservices architecture, a single client request often requires data from multiple independent backend services. If clients connect directly to each microservice, they must manage multiple network hostnames, handle complex authentication states, and coordinate API updates across different service teams.

An **API Gateway** resolves this complexity by acting as the single, centralized ingress point for all external client requests. The gateway exposes a unified public interface, intercepts all incoming traffic, executes a sequence of validation and security policies, and routes requests to appropriate internal microservices. This design acts as a specialized reverse proxy, isolating internal service changes from the public API contract.

<svg viewBox="0 0 580 260" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="20" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">API Gateway Ingress and Middleware Execution Chain</text>
  <rect x="15" y="110" width="80" height="40" rx="4" fill="#2e3440" stroke="#88c0d0" stroke-width="1"/>
  <text x="55" y="130" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">Public Client</text>
  <text x="55" y="142" fill="#81a1c1" font-family="sans-serif" font-size="7" text-anchor="middle">HTTPS Request</text>
  <path d="M 95 130 L 125 130" stroke="#88c0d0" stroke-width="1.5" fill="none" marker-end="url(#arrow-blue)"/>
  <rect x="135" y="45" width="280" height="180" rx="6" fill="#3b4252" stroke="#d8dee9" stroke-width="1.5"/>
  <text x="275" y="62" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">API Gateway (Reverse Proxy)</text>
  <rect x="145" y="80" width="70" height="90" rx="4" fill="#2e3440" stroke="#ebcb8b" stroke-width="1"/>
  <text x="180" y="115" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">TLS</text>
  <text x="180" y="130" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Termination</text>
  <rect x="225" y="80" width="70" height="90" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1"/>
  <text x="260" y="115" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">Auth</text>
  <text x="260" y="130" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">RS256 JWT</text>
  <rect x="305" y="80" width="90" height="90" rx="4" fill="#2e3440" stroke="#bf616a" stroke-width="1"/>
  <text x="350" y="110" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">Rate Limiting</text>
  <text x="350" y="125" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Token Bucket</text>
  <text x="350" y="140" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">IP/Token Check</text>
  <rect x="145" y="180" width="250" height="35" rx="4" fill="#2e3440" stroke="#88c0d0" stroke-width="1"/>
  <text x="270" y="202" fill="#88c0d0" font-family="sans-serif" font-size="9" text-anchor="middle">Egress Routing Table Lookup &amp; Path Rewrite</text>
  <path d="M 415 130 L 445 130" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#arrow-green)"/>
  <rect x="455" y="70" width="110" height="30" rx="4" fill="#2e3440" stroke="#eceff4" stroke-width="1"/>
  <text x="510" y="88" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Service A (Users)</text>
  <rect x="455" y="115" width="110" height="30" rx="4" fill="#2e3440" stroke="#eceff4" stroke-width="1"/>
  <text x="510" y="133" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Service B (Payments)</text>
  <rect x="455" y="160" width="110" height="30" rx="4" fill="#2e3440" stroke="#eceff4" stroke-width="1"/>
  <text x="510" y="178" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Service C (Orders)</text>
  <defs>
    <marker id="arrow-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#88c0d0"/>
    </marker>
    <marker id="arrow-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#a3be8c"/>
    </marker>
  </defs>
</svg>

---

## Practical Analogy

Think of an API Gateway as the security desk and receptionist at the front entrance of a large corporate office building:

* **Direct Service Connections** are like a building without a front door. Visitors wander down random corridors, search for individual employee desks, ask for security badges, and negotiate entry routes. This model creates chaos and compromises building security.
* **An API Gateway** is like the reception desk in the front lobby. Every visitor must enter through the lobby. The receptionist terminates external access, checks the visitor's ID card (authentication), verifies they are allowed on the 4th floor (authorization), checks that they are not bringing in oversized bags (payload limits), and calls an internal escort to guide them along the correct path (reverse proxy routing).

---

## Centralized Routing and Proxying

The core function of an API Gateway is **reverse proxying**. The gateway maps incoming public HTTP request paths to internal microservice network endpoints. 

For example, a gateway matches path patterns:
* `https://api.company.com/v1/users` is forwarded internally to `http://user-service.internal:8080/users`
* `https://api.company.com/v1/orders` is forwarded internally to `http://order-service.internal:9090/orders`

This translation layer decouples external clients from the internal network topology. If the company moves the order service to a new port or splits it into separate shipping and invoice services, the gateway updates its internal routing table. The public API client contract remains completely unchanged.

---

## Cross-Cutting Responsibilities

By centering all ingress traffic in a single system, the API Gateway unifies duties that would otherwise have to be re-implemented in every microservice:

* **TLS Termination**: The gateway handles the CPU-intensive cryptographic handshake for HTTPS connections. Internal microservices then communicate over plain HTTP within the secure private virtual network, reducing latency and simplifying certificate management.
* **Authentication and Authorization**: The gateway validates incoming JWTs or OAuth tokens. It extracts the authenticated user metadata and injects it into upstream request headers (e.g. `X-User-Id`), allowing internal microservices to assume request authenticity.
* **API Versioning**: The gateway can inspect headers (e.g. `Accept: application/vnd.company.v2+json`) or path prefixes to route requests to specific legacy or modern versions of microservices.

---

## Middleware Execution Chains

When a request arrives, the gateway executes a sequence of validation and enrichment steps known as a **middleware chain**:

1. **Security Filters**: The gateway inspects payloads to block SQL injection attacks, Cross-Site Scripting (XSS), and requests exceeding payload size limits. It also injects Cross-Origin Resource Sharing (**CORS**) headers to authorize browser requests.
2. **Distributed Rate Limiting**: The gateway tracks incoming traffic volumes (typically by Client IP or token identifier) using memory stores like Redis. It drops requests exceeding allowed quotas (returning `429 Too Many Requests`) to prevent system degradation.
3. **Tracing and Logging Context**: The gateway generates a unique correlation identifier (e.g. `X-Correlation-Id`) for each request. It injects this ID into the HTTP headers forwarded to internal microservices, allowing logs across the entire microservice chain to be reconstructed during debugging.

---

## Runtime Dynamic Reloading

Because the API Gateway acts as the single point of entry for all corporate traffic, restarting the gateway to apply configuration changes introduces unacceptable downtime.

Production gateways (such as Envoy, Kong, or Nginx with Lua extensions) decouple the control plane from the data plane. The gateway exposes a configuration API that updates routing tables, rate limits, and access rules in memory. The data plane applies these configuration updates dynamically at runtime, managing active client connections without dropping packets.

---

## Protocol Mapping

In many modern microservice environments, internal services communicate using high-performance protocols like **gRPC** or **Protobuf** over HTTP/2, which are difficult for web browsers to consume directly.

An API Gateway bridges this gap by performing **protocol mapping**. The gateway receives standard REST HTTP/1.1 requests (JSON payloads) from public clients, serializes the data into Protobuf format, and forwards it as a gRPC call to internal microservices. It then translates the internal gRPC response back to JSON before returning it to the client, combining internal performance with external accessibility.

---

## High Availability and Resiliency

As the primary entry point, the API Gateway is a single point of failure. If the gateway fails, the entire application is offline.

To ensure high availability:
* **Horizontal Scalability**: API Gateways are run as stateless instances behind global Layer 4 load balancers (such as AWS ALB or Cloudflare CDN).
* **Circuit Breakers**: If a downstream microservice (e.g. the payment service) slows down, the gateway's circuit breaker trips. The gateway stops sending requests to the failing service and returns a cached response or an immediate error, preventing the gateway from exhausting its thread pool.
* **Retry and Timeout Policies**: The gateway enforces strict socket read/write timeouts on upstream connections, failing fast rather than hanging, and retrying transient network errors safely.

---

## Further Reading

* [Envoy Proxy Architecture](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/arch_overview) — A detailed look at how modern service proxies manage data and control planes.
* [Microservices Patterns: External API Patterns](https://microservices.io/patterns/apigateway.html) — Chris Richardson's overview of the API Gateway and API Gateway Backends-for-Frontends (BFF) patterns.
* [OWASP API Security Top 10 Cheat Sheet](https://owasp.org/www-project-api-security/) — Guidelines for implementing API Gateway security controls to prevent credential stuffing and resource injection.
