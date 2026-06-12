---
title: REST API Design & Constraints
slug: rest-api-design
summary: "Understand the structural constraints of Representational State Transfer (REST), including statelessness, cacheability, and the uniform interface."
difficulty: beginner
chapterId: api-design
domain: API Design
estimatedMinutes: 10
prerequisites: [http]
related: [api-versioning, cors]
seo_title: "REST API Design: Fielding Constraints and Principles"
seo_description: "Learn the core constraints of REST API design — statelessness, layered systems, uniform interface, cache controls, ETags, and HATEOAS."
canonical_url: "/concepts/rest-api-design"
citations:
  - title: "Architectural Styles and the Design of Network-based Software Architectures"
    author: "Roy Thomas Fielding"
    chapter: "Chapter 5: Representational State Transfer (REST)"
    page_range: "76-107"
    external_link: "https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm"
code_examples:
  - language: python
    title: "Standard RESTful Router with ETag Cache Validation and Self-Descriptive HATEOAS responses"
    code: |
      import hashlib
      import json
      import re
      from http.server import BaseHTTPRequestHandler, HTTPServer

      # In-memory database representing item resources
      ITEMS_DB = {
          "1": {"id": "1", "name": "Mechanical Keyboard", "price": 120.00},
          "2": {"id": "2", "name": "Ergonomic Mouse", "price": 85.00},
      }

      class RESTfulHandler(BaseHTTPRequestHandler):
          def do_GET(self):
              # Regex route routing matching: /items/{id}
              match = re.match(r"^/items/([a-zA-Z0-9_-]+)$", self.path)

              if self.path == "/items" or self.path == "/items/":
                  # List representation containing hypermedia navigation links
                  response_data = {
                      "items": list(ITEMS_DB.values()),
                      "links": [
                          {"rel": "self", "href": "/items", "method": "GET"},
                          {"rel": "create", "href": "/items", "method": "POST"}
                      ]
                  }
                  self.send_json_response(200, response_data)
                  return

              elif match:
                  item_id = match.group(1)
                  item = ITEMS_DB.get(item_id)
                  if not item:
                      self.send_error_response(404, "Item Not Found", item_id)
                      return

                  # Self-descriptive representation using HATEOAS standards
                  response_data = {
                      "id": item["id"],
                      "name": item["name"],
                      "price": item["price"],
                      "links": [
                          {"rel": "self", "href": f"/items/{item_id}", "method": "GET"},
                          {"rel": "update", "href": f"/items/{item_id}", "method": "PUT"},
                          {"rel": "delete", "href": f"/items/{item_id}", "method": "DELETE"}
                      ]
                  }

                  # Serialize data to generate ETag
                  payload = json.dumps(response_data).encode("utf-8")
                  etag = f'"{hashlib.sha256(payload).hexdigest()[:16]}"'

                  # Evaluate incoming If-None-Match conditional request header
                  if_none_match = self.headers.get("If-None-Match")
                  if if_none_match == etag:
                      self.send_response(304)
                      self.send_header("ETag", etag)
                      self.send_header("Cache-Control", "public, max-age=3600")
                      self.end_headers()
                      return

                  # Return complete payload
                  self.send_response(200)
                  self.send_header("Content-Type", "application/json")
                  self.send_header("Content-Length", str(len(payload)))
                  self.send_header("ETag", etag)
                  self.send_header("Cache-Control", "public, max-age=3600")
                  self.end_headers()
                  self.wfile.write(payload)
                  return

              else:
                  self.send_error_response(404, "Endpoint Not Found", self.path)

          def send_json_response(self, status, data):
              payload = json.dumps(data).encode("utf-8")
              self.send_response(status)
              self.send_header("Content-Type", "application/json")
              self.send_header("Content-Length", str(len(payload)))
              self.end_headers()
              self.wfile.write(payload)

          def send_error_response(self, status, message, path):
              error_data = {
                  "status": status,
                  "error": message,
                  "path": path,
                  "links": [{"rel": "home", "href": "/items"}]
              }
              self.send_json_response(status, error_data)

      def run():
          server_address = ("", 8000)
          httpd = HTTPServer(server_address, RESTfulHandler)
          print("REST API Server starting on http://localhost:8000")
          try:
              httpd.serve_forever()
          except KeyboardInterrupt:
              pass
          httpd.server_close()

      if __name__ == "__main__":
          run()
---

## What is REST?

**Representational State Transfer** (REST) is an architectural style designed by Roy Fielding in 2000 to govern the design of network-based software architectures, specifically the World Wide Web. 

REST is not a protocol, a language, or a coding standard. Instead, it is a **set of six architectural constraints** that, when applied together, ensure applications scale efficiently, remain highly cacheable, and adapt to changing data representations over time.

### Real-World Analogy
Imagine walking into a fast-food restaurant. 
* The **Client-Server** model is the clear separation between you (the customer ordering) and the kitchen (cooking the food). You don't care how the kitchen cleans pots, and the kitchen doesn't care how you eat your burger.
* **Statelessness** means when you order, you must list your entire order from scratch. If you want a drink and a burger, you can't say "and a drink" in a second conversation; the cashier has no memory of you.
* **Cacheability** is like the restaurant keeping prepared burgers under a heat lamp. If a client orders one, the cashier checks the freshness label (ETag) and hands it over immediately instead of asking the kitchen to cook a new one from scratch.
* A **Layered System** means when you stand at the counter, you cannot tell if the server is cooking in the back, picking up food from a sister kitchen next door, or routing your payment to a separate bank proxy.

---

## The Six REST Constraints

To qualify as a RESTful API, a system must adhere to the following architectural constraints:

### 1. Client-Server Separation
The client (user interface) and the server (data storage, state, and business logic) are completely decoupled. This separation allows developers to update mobile apps or web frontends without modifying backend services, and scale database systems independently of user interfaces.

### 2. Statelessness
The server must not store any session state about the client in its memory. Every HTTP request must be entirely self-contained, carrying all metadata, authentication tokens, and request parameters necessary for the server to process it. If a server instance crashes, any other server instance can process the next request immediately, enabling horizontal scalability.

### 3. Cacheability
All server responses must declare whether they are cacheable. Caching information prevents clients from repeatedly fetching unchanging resources, reducing network traffic and database queries. Cache behaviors are defined using HTTP headers:

* `Cache-Control`: Configures parameters like `public`, `private` (client only), `no-cache` (must validate before serving), `no-store` (never cache), and `max-age` (validity duration in seconds).
* `ETag` (Entity Tag): A unique fingerprint (like a SHA-256 hash) of a resource representation. When a client requests the resource again, it sends the ETag in the `If-None-Match` header. If the resource hasn't changed, the server returns a bodyless `304 Not Modified` status code, saving bandwidth.
* `Last-Modified`: A timestamp indicating when the resource last changed.

### 4. Layered System
A client cannot assume it is communicating directly with the application server. The architecture may route requests through load balancers, security firewalls, caching proxies (CDNs), and gateways. These intermediaries must not alter request semantics.

### 5. Uniform Interface
This constraint is the defining characteristic of REST, establishing a standard contract between client and server. It consists of four sub-constraints:

* **Resource Identification in URIs**: Resources are nouns (e.g. `/items/42`), not verbs or actions.
* **Resource Manipulation through Representations**: The client interacts with resources via abstract representations (like JSON or XML payloads). The client can modify or delete resources if they have appropriate permissions and representation details.
* **Self-Descriptive Messages**: Every message contains enough metadata to describe how to process it. For example, the `Content-Type` header (like `application/json`) explicitly tells the parser how to decode bytes.
* **HATEOAS** (Hypermedia As the Engine of Application State): Server responses return not just raw data, but hypermedia links navigating users to related actions (e.g. including a `"rel": "update"` link in a response so the client knows how to modify the resource dynamically).

### 6. Code-on-Demand (Optional)
Servers can temporarily extend client capabilities by transmitting executable scripts (like JavaScript or WebAssembly) directly to the browser or runtime.

---

## REST Interaction and the Layered System

By combining statelessness, layered architectures, and cache validation, REST systems handle massive transaction volumes:

<svg viewBox="0 0 580 320" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="22" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Fielding REST Constraints &amp; ETag Validation</text>
  <rect x="20" y="70" width="90" height="210" rx="6" fill="#2e3440" stroke="#88c0d0" stroke-width="2"/>
  <text x="65" y="90" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Client</text>
  <text x="65" y="105" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">UI / Browser</text>
  <text x="65" y="250" fill="#a3be8c" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">Client-Server</text>
  <text x="65" y="262" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Decoupled Concerns</text>
  <line x1="150" y1="45" x2="150" y2="300" stroke="#4c566a" stroke-dasharray="3,3" stroke-width="1.5"/>
  <text x="160" y="52" fill="#81a1c1" font-family="sans-serif" font-size="9">Layered System Ingress</text>
  <rect x="180" y="70" width="100" height="40" rx="4" fill="#3b4252" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="230" y="88" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Load Balancer</text>
  <text x="230" y="100" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Traffic Gateway</text>
  <rect x="310" y="70" width="110" height="40" rx="4" fill="#3b4252" stroke="#ebcb8b" stroke-width="1.5"/>
  <text x="365" y="88" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Reverse Proxy</text>
  <text x="365" y="100" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">Cache validation</text>
  <rect x="450" y="70" width="110" height="210" rx="6" fill="#2e3440" stroke="#a3be8c" stroke-width="2"/>
  <text x="505" y="90" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Web Server</text>
  <text x="505" y="105" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">REST Application</text>
  <text x="505" y="250" fill="#ebcb8b" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">Stateless Server</text>
  <text x="505" y="262" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">No Session State</text>
  <path d="M 110 135 L 450 135" stroke="#88c0d0" stroke-width="1.2" fill="none" marker-end="url(#arr2)"/>
  <text x="280" y="128" fill="#88c0d0" font-family="monospace" font-size="8" text-anchor="middle">1. GET /items/1 (Stateless Request)</text>
  <path d="M 450 165 L 110 165" stroke="#a3be8c" stroke-width="1.2" fill="none" marker-end="url(#arr2)"/>
  <text x="280" y="158" fill="#a3be8c" font-family="monospace" font-size="8" text-anchor="middle">2. 200 OK + ETag: "a1b2c3" (Cache-Control: public)</text>
  <path d="M 110 200 L 310 200" stroke="#ebcb8b" stroke-width="1.2" fill="none" marker-end="url(#arr2)"/>
  <text x="210" y="193" fill="#ebcb8b" font-family="monospace" font-size="8" text-anchor="middle">3. GET /items/1 [If-None-Match: "a1b2c3"]</text>
  <path d="M 310 225 L 110 225" stroke="#bf616a" stroke-width="1.2" fill="none" marker-end="url(#arr2)"/>
  <text x="210" y="218" fill="#bf616a" font-family="monospace" font-size="8" text-anchor="middle">4. 304 Not Modified (Server not queried!)</text>
  <defs>
    <marker id="arr2" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
      <path d="M0,0 L0,5 L5,2.5 z" fill="#eceff4"/>
    </marker>
  </defs>
</svg>

---

## Safe vs. Idempotent HTTP Methods

In REST, HTTP methods are classified based on their side-effects on the server's resource state:

* **Safe Methods**: Do not modify server resource state. Safe methods are read-only and include `GET`, `HEAD`, and `OPTIONS`. Because they are safe, browsers and proxies can cache their responses freely.
* **Idempotent Methods**: Calling the method multiple times results in the same server state as calling it once. For example, `PUT /items/1` sets the resource's state; running it 5 times leaves the item with the exact same values. `DELETE /items/1` is also idempotent: once deleted, the item remains gone. Safe methods are also idempotent by default.
* **Non-Idempotent Methods**: Every execution can change server state. `POST /items` creates a new resource on every invocation. Calling it 5 times creates 5 separate resources. `PATCH` is generally non-idempotent because a partial update can perform relative operations (like appending string data or incrementing values).

---

## Semantic HTTP Status Codes

RESTful APIs use HTTP response status codes to communicate execution outcomes, mapping errors to their appropriate semantic class:

* `201 Created`: The server successfully created a resource. The response must include a `Location` header containing the URL to the new resource.
* `304 Not Modified`: Sent during cache validation (when `If-None-Match` or `If-Modified-Since` checks succeed), instructing the client to display their cached copy. The body is omitted to save network bandwidth.
* `412 Precondition Failed`: The server rejected the request because one or more conditional headers (e.g. `If-Match` matching a resource ETag) failed validation, preventing concurrent write collisions.
* `415 Unsupported Media Type`: The server rejected the request because the request payload format (specified in `Content-Type`) is not supported.

A common anti-pattern is returning `200 OK` with an error message (like `{"error": "Unauthorized"}`) inside the body. RESTful APIs must return the correct status code (e.g. `401 Unauthorized`) to allow intermediaries and standard clients to handle errors natively.

---

## Further Reading

- [Roy Fielding's Dissertation: Representational State Transfer (REST)](https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm) — Chapter 5 defines the formal architectural model and constraints.
- [RFC 9110: HTTP Semantics](https://datatracker.ietf.org/doc/html/rfc9110) — The modern spec governing method definitions, caching headers, status codes, and media types.
- [HATEOAS and Hypermedia API design](https://restfulapi.net/hateoas/) — Practical implementation guide detailing self-descriptive links and API navigation.
