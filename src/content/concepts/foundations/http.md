---
title: HTTP
slug: http
summary: "The protocol powering every web interaction: methods, status codes, headers, and the full request/response lifecycle."
difficulty: beginner
chapterId: foundations
domain: Foundations
estimatedMinutes: 12
prerequisites: []
related: [idempotency, caching-strategies, grpc]
seo_title: "HTTP Protocol: Methods, Status Codes, and Request Lifecycle"
seo_description: "Learn the HTTP protocol that powers all web communication — methods, status codes, headers, and request/response lifecycle for backend engineers."
canonical_url: "/concepts/http"
citations:
  - title: "HTTP: The Definitive Guide"
    author: "David Gourley & Brian Totty"
    chapter: "Chapter 1: HTTP Overview"
    page_range: "3-28"
    external_link: "https://www.oreilly.com/library/view/http-the-definitive/1565925092/"
code_examples:
  - language: go
    title: HTTP server handlers
    code: |
      func main() {
          http.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {
              switch r.Method {
              case http.MethodGet:
                  w.Header().Set("Content-Type", "application/json")
                  json.NewEncoder(w).Encode(users)
              case http.MethodPost:
                  var u User
                  json.NewDecoder(r.Body).Decode(&u)
                  users = append(users, u)
                  w.WriteHeader(http.StatusCreated)
                  json.NewEncoder(w).Encode(u)
              default:
                  w.WriteHeader(http.StatusMethodNotAllowed)
              }
          })
          http.ListenAndServe(":8080", nil)
      }
  - language: typescript
    title: Fetch with error handling
    code: |
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Alice", email: "alice@example.com" }),
      });

      if (res.status === 409) throw new Error("User already exists");
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const user = await res.json();
---

## The Request/Response Cycle

HTTP is a **stateless request/response protocol**. A client sends a request; the server sends back a response. That's the whole model. No persistent connection state, no memory of previous requests unless the application explicitly stores it (e.g. in a session cookie or JWT).

Every HTTP interaction has the same shape:

<svg viewBox="0 0 580 200" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="22" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">HTTP Request / Response Lifecycle</text>
  <!-- Client -->
  <rect x="20" y="40" width="120" height="50" rx="6" fill="#2e3440" stroke="#88c0d0" stroke-width="2"/>
  <text x="80" y="62" fill="#eceff4" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">Client</text>
  <text x="80" y="78" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Browser / App / CLI</text>
  <!-- Server -->
  <rect x="440" y="40" width="120" height="50" rx="6" fill="#2e3440" stroke="#a3be8c" stroke-width="2"/>
  <text x="500" y="62" fill="#eceff4" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">Server</text>
  <text x="500" y="78" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">API / Web server</text>
  <!-- Request arrow -->
  <path d="M 140 58 L 440 58" stroke="#88c0d0" stroke-width="2" fill="none" marker-end="url(#ar1)"/>
  <defs>
    <marker id="ar1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#88c0d0"/>
    </marker>
  </defs>
  <text x="290" y="50" fill="#88c0d0" font-family="sans-serif" font-size="10" text-anchor="middle">Request</text>
  <text x="290" y="40" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">GET /users/42  Headers: Authorization: Bearer ...</text>
  <!-- Response arrow -->
  <path d="M 440 72 L 140 72" stroke="#a3be8c" stroke-width="2" fill="none" marker-end="url(#ar2)"/>
  <defs>
    <marker id="ar2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#a3be8c"/>
    </marker>
  </defs>
  <text x="290" y="88" fill="#a3be8c" font-family="sans-serif" font-size="10" text-anchor="middle">Response</text>
  <text x="290" y="100" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">200 OK  Content-Type: application/json  Body: {"id":42,...}</text>
  <!-- Steps -->
  <text x="20" y="145" fill="#d8dee9" font-family="sans-serif" font-size="10" font-weight="bold">Request contains:</text>
  <text x="20" y="160" fill="#81a1c1" font-family="sans-serif" font-size="9">Method (GET/POST/...) + Path (/users/42) + Headers + optional Body</text>
  <text x="20" y="178" fill="#d8dee9" font-family="sans-serif" font-size="10" font-weight="bold">Response contains:</text>
  <text x="20" y="193" fill="#81a1c1" font-family="sans-serif" font-size="9">Status code (200/404/500...) + Headers + optional Body</text>
</svg>

---

## HTTP Methods

Each method has a defined semantic meaning. Using the wrong one breaks caching, breaks idempotency, and confuses clients.

| Method | Meaning | Idempotent | Has body |
|--------|---------|-----------|---------|
| `GET` | Retrieve a resource | Yes | No |
| `POST` | Create a resource or trigger an action | No | Yes |
| `PUT` | Replace a resource entirely | Yes | Yes |
| `PATCH` | Partially update a resource | No | Yes |
| `DELETE` | Remove a resource | Yes | No |
| `HEAD` | Same as GET, but response body omitted | Yes | No |
| `OPTIONS` | Describe communication options (used in CORS preflight) | Yes | No |

**Idempotent** means calling the same request multiple times produces the same result. `GET /users/42` is idempotent: you can call it 100 times and nothing changes. `POST /orders` is not: each call creates a new order.

---

## Status Codes

Status codes tell the client what happened. They are grouped into five classes:

| Range | Class | Common examples |
|-------|-------|----------------|
| `1xx` | Informational | `100 Continue`, `101 Switching Protocols` |
| `2xx` | Success | `200 OK`, `201 Created`, `204 No Content` |
| `3xx` | Redirection | `301 Moved Permanently`, `304 Not Modified` |
| `4xx` | Client error | `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `429 Too Many Requests` |
| `5xx` | Server error | `500 Internal Server Error`, `502 Bad Gateway`, `503 Service Unavailable` |

The most common mistake: returning `200 OK` with an error message in the body. A client should be able to detect success or failure from the status code alone, without parsing the body.

---

## Headers

Headers carry metadata about the request or response. Key ones every backend engineer should know:

**Request headers:**
* `Authorization: Bearer <token>` — carries authentication credentials
* `Content-Type: application/json` — tells the server what format the body is in
* `Accept: application/json` — tells the server what format the client can handle
* `Cache-Control: no-cache` — controls caching behaviour

**Response headers:**
* `Content-Type: application/json` — describes the response body format
* `Cache-Control: max-age=3600` — tells clients and proxies how long to cache this response
* `ETag: "abc123"` — a fingerprint of the response, used for conditional requests
* `Location: /users/42` — returned with `201 Created`, points to the new resource
* `Retry-After: 60` — returned with `429`, tells the client when to retry

---

## HTTP/1.1 vs HTTP/2 vs HTTP/3

| Feature | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---------|---------|--------|--------|
| Transport | TCP | TCP | QUIC (UDP-based) |
| Multiplexing | No (one request per connection at a time) | Yes (many requests on one connection) | Yes |
| Header compression | No | HPACK | QPACK |
| Head-of-line blocking | Yes | Partial (TCP-level) | No |
| Typical use | Legacy systems | Current standard | Emerging (CDNs, mobile) |

HTTP/1.1's biggest problem: **head-of-line blocking**. A slow response blocks all subsequent requests on the same connection. HTTP/2 solves this with multiplexing. In production, always prefer HTTP/2 or HTTP/3 if your infrastructure supports it.

---

## HTTPS and TLS

`HTTPS` is HTTP with TLS (Transport Layer Security) encryption layered underneath. The TLS handshake happens before any HTTP bytes are sent:

1. Client sends a `ClientHello` with supported TLS versions and cipher suites
2. Server responds with its certificate (containing its public key)
3. Client verifies the certificate against a trusted Certificate Authority
4. Both sides derive a shared session key using asymmetric cryptography
5. All subsequent HTTP traffic is encrypted with that session key

In production: always use HTTPS. Never transmit credentials or sensitive data over plain HTTP. Use `Strict-Transport-Security` headers to prevent downgrade attacks.

---

## Further Reading

- [HTTP on MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview) — the most complete and readable HTTP reference available
- [HTTP/2 explained](https://http2-explained.haxx.se/) — Daniel Stenberg's free book on HTTP/2
- [How HTTPS works (cartoon)](https://howhttps.works/) — the clearest visual explanation of TLS handshakes
- [HTTP status codes reference](https://httpstatuses.com/) — every status code with usage notes
