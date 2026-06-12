---
title: API Versioning Strategies
slug: api-versioning
summary: "Learn how to manage breaking API updates using URI paths, query params, headers, and media types, while coordinating schema translation and deprecations."
difficulty: beginner
chapterId: api-design
domain: API Design
estimatedMinutes: 10
prerequisites: [http]
related: [rest-api-design]
seo_title: "API Versioning Strategies: URI, Headers, and Routing"
seo_description: "Explore API versioning methods: URI paths, query params, headers, and content negotiation. Understand schema mapping and HTTP deprecation headers."
canonical_url: "/concepts/api-versioning"
citations:
  - title: "Versioning Web APIs"
    author: "Erik Wilde"
    chapter: "API Evolution and Version Negotiation Mechanics"
    external_link: "https://dret.net/netdret/publications/wilde-api-versioning"
code_examples:
  - language: go
    title: Multi-Version Router Supporting Accept Headers and URI Path Fallbacks
    code: |
      package main

      import (
      	"encoding/json"
      	"fmt"
      	"log"
      	"net/http"
      	"strings"
      )

      // Legacy User Representation (v1)
      type UserV1 struct {
      	ID       string `json:"id"`
      	FullName string `json:"name"` // Old field name
      }

      // Modern User Representation (v2)
      type UserV2 struct {
      	ID        string `json:"id"`
      	FirstName string `json:"first_name"` // Split name field
      	LastName  string `json:"last_name"`
      }

      // Mock database record
      var dbUser = map[string]string{
      	"id":         "usr_456",
      	"first_name": "Jane",
      	"last_name":  "Doe",
      }

      // getTargetVersion extracts the version from path prefix or Accept header
      func getTargetVersion(r *http.Request) string {
      	// 1. Check path prefix
      	if strings.HasPrefix(r.URL.Path, "/v1/") {
      		return "v1"
      	}
      	if strings.HasPrefix(r.URL.Path, "/v2/") {
      		return "v2"
      	}

      	// 2. Check Accept header (Content Negotiation)
      	// e.g. "Accept: application/vnd.company.v2+json"
      	acceptHeader := r.Header.Get("Accept")
      	if strings.Contains(acceptHeader, "vnd.company.v1") {
      		return "v1"
      	}
      	if strings.Contains(acceptHeader, "vnd.company.v2") {
      		return "v2"
      	}

      	// Default fallback to legacy version
      	return "v1"
      }

      func handleUsers(w http.ResponseWriter, r *http.Request) {
      	version := getTargetVersion(r)
      	w.Header().Set("Content-Type", "application/json")

      	// Inject Deprecation alerts if v1 is requested
      	if version == "v1" {
      		// Deprecation: Date when deprecation was declared
      		w.Header().Set("Deprecation", "@1718222400") // Epoch timestamp
      		// Sunset: Date when the endpoint will be deleted
      		w.Header().Set("Sunset", "Fri, 31 Dec 2027 23:59:59 GMT")
      	}

      	switch version {
      	case "v1":
      		// Translate database record to Legacy V1 representation
      		legacyUser := UserV1{
      			ID:       dbUser["id"],
      			FullName: dbUser["first_name"] + " " + dbUser["last_name"],
      		}
      		payload, _ := json.Marshal(legacyUser)
      		w.Write(payload)

      	case "v2":
      		// Map directly to Modern V2 representation
      		modernUser := UserV2{
      			ID:        dbUser["id"],
      			FirstName: dbUser["first_name"],
      			LastName:  dbUser["last_name"],
      		}
      		payload, _ := json.Marshal(modernUser)
      		w.Write(payload)

      	default:
      		w.WriteHeader(http.StatusBadRequest)
      		w.Write([]byte(`{"error": "Unsupported API version requested"}`))
      	}
      }

      func main() {
      	// Support both path versioning and header versioning on the same handler
      	http.HandleFunc("/v1/users", handleUsers)
      	http.HandleFunc("/v2/users", handleUsers)
      	http.HandleFunc("/users", handleUsers) // Checked via Accept header

      	log.Println("Multi-version API Router running on port 8080...")
      	log.Fatal(http.ListenAndServe(":8080", nil))
      }
---

## The Concept

Software changes. As features are added, field schemas expand, database models are normalized, and endpoint interactions are updated. However, while a developer can redeploy a web frontend instantly, they cannot force external integration clients, mobile applications, or SDKs to update simultaneously. 

**API Versioning** is the structural practice of running multiple concurrent representation interfaces of a single API. This allows developers to deliver breaking updates and modern schemas to new integrations while preserving the behavior and structural expectations of legacy clients.

<svg viewBox="0 0 580 280" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;"><text x="290" y="20" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">API Version Routing: URI Path vs Accept Header</text><rect x="20" y="100" width="80" height="60" rx="4" fill="#2e3440" stroke="#81a1c1" stroke-width="1"/><text x="60" y="125" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">Client</text><text x="60" y="137" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">App Integration</text><path d="M 100 115 L 200 115" stroke="#ebcb8b" stroke-width="1.5" fill="none" marker-end="url(#arrow-yel)"/><text x="150" y="107" fill="#ebcb8b" font-family="sans-serif" font-size="7" text-anchor="middle">GET /v1/users</text><path d="M 100 145 L 200 145" stroke="#88c0d0" stroke-width="1.5" fill="none" marker-end="url(#arrow-blue)"/><text x="150" y="157" fill="#88c0d0" font-family="sans-serif" font-size="7" text-anchor="middle">Accept: v2+json</text><rect x="210" y="80" width="130" height="100" rx="6" fill="#3b4252" stroke="#eceff4" stroke-width="1.5"/><text x="275" y="98" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">API Gateway Router</text><rect x="220" y="110" width="110" height="25" rx="3" fill="#2e3440" stroke="#ebcb8b" stroke-width="1"/><text x="275" y="125" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">URI Path Rule</text><rect x="220" y="145" width="110" height="25" rx="3" fill="#2e3440" stroke="#88c0d0" stroke-width="1"/><text x="275" y="160" fill="#88c0d0" font-family="sans-serif" font-size="8" text-anchor="middle">Header Negotiator</text><path d="M 340 120 L 415 80" stroke="#ebcb8b" stroke-width="1.5" fill="none" marker-end="url(#arrow-yel)"/><path d="M 340 160 L 415 200" stroke="#88c0d0" stroke-width="1.5" fill="none" marker-end="url(#arrow-blue)"/><rect x="425" y="55" width="130" height="50" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1"/><text x="490" y="75" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">Legacy Service</text><text x="490" y="88" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Handles v1 representation</text><rect x="425" y="175" width="130" height="50" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1"/><text x="490" y="195" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Modern Service</text><text x="490" y="208" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Handles v2 representation</text><defs><marker id="arrow-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#88c0d0"/></marker><marker id="arrow-yel" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#ebcb8b"/></marker></defs></svg>

---

## Practical Analogy

Think of API Versioning as the **power adapter sockets** in a hotel:

* **No Versioning** is like a hotel changing all physical wall outlets overnight to a new configuration. Suddenly, guests with older phone chargers cannot plug in their devices, breaking utility access.
* **URI Path Versioning** is like the hotel installing two physical sockets side-by-side: a legacy three-pin plug socket and a modern USB-C outlet. The guest looks at the wall, identifies the socket that fits their cord, and connects.
* **Header Versioning** is like a single universal socket. The socket detects the type of plug inserted and adjusts its internal electrical output accordingly, negotiating compatibility behind the scenes without cluttering the wall space.

---

## Versioning Strategies Compared

APIs utilize four primary strategies to determine which representation version to process:

### 1. URI Path Versioning
The version prefix is hardcoded directly into the URL path structure.
* **Example**: `https://api.example.com/v1/users`
* **Pros**: Simple to route at the network layer, highly readable, works out-of-the-box with simple web browsers.
* **Cons**: Violates pure REST design principles: a resource should have a single unique URL, rather than switching paths based on the requested model structure.

### 2. Query Parameter Versioning
The requested version is passed as a URL query parameter string.
* **Example**: `https://api.example.com/users?version=2`
* **Pros**: Easy to implement, defaults to a standard version if the query parameter is omitted.
* **Cons**: Query parameters complicate URL parsing and are easily stripped or modified by analytics, tracking, or proxy systems.

### 3. Custom Header Versioning
Clients request specific interfaces by including a proprietary header in the transaction request.
* **Example**: `X-API-Version: 2`
* **Pros**: Preserves clean, resource-centric URLs.
* **Cons**: Requires clients to configure custom request engines, preventing simple browser link testing.

### 4. Content Negotiation (Media Type)
Clients request versions by specifying custom media types in the standard HTTP `Accept` header.
* **Example**: `Accept: application/vnd.company.v2+json`
* **Pros**: The most semantically correct REST approach. The URL represents the resource, while the `Accept` header negotiates the requested format (representation).
* **Cons**: Highly complex routing logic, difficult for novice API consumers to understand, and complicates HTTP proxy behavior.

---

## Routing and Caching Impacts

API versioning selection dramatically affects Content Delivery Networks (`CDN`) and caching layers:

* **URI Path Caching**: CDNs cache requests based on the URL string. When versions are isolated in the URI path (e.g. `/v1/users` vs `/v2/users`), each version naturally receives its own cache key. This is highly efficient and safe.
* **Header-Based Caching**: When versioning relies on headers (like `Accept` or `X-API-Version`), the cache key is identical if it only reads the URL path. If a CDN returns a cached `v1` representation to a modern client requesting `v2`, the client application breaks.
* **The Vary Header**: To prevent cache poisoning in header-based architectures, the origin server must return a `Vary: Accept` or `Vary: X-API-Version` header. This instructs CDNs to split the cache entry into multiple sub-keys based on the header value, increasing cache management complexity.

---

## API Gateway Integration and Routing

In distributed systems, versioning is often managed at the **API Gateway** layer rather than inside individual application codebases.

An API Gateway intercepts requests, parses the version indicator (URI prefix or header parameter), and proxies the traffic to distinct backend microservice clusters. For instance, `/v1/users` can be routed to a legacy service cluster running an older container build, while `/v2/users` is directed to a modern cluster. This architecture prevents developers from bloating a single codebase with legacy controller routes, allowing teams to build, deploy, and scale versions independently.

---

## Schema Translation and Controller Layout

If version routing must occur inside a single application server, the system should avoid mixing version translation logic with core business logic. Software designs use two patterns:

### The Controller Routing Split
Create separate directory structures and classes for each version controller (e.g. `controllers/v1/user.go` and `controllers/v2/user.go`). The HTTP router forwards requests to the appropriate class.

### The Dynamic Schema Translation Layer
The controller always reads and writes the latest internal database schema. If a client requests an older version, the request passes through a translation middleware. This middleware maps the database entity back to the legacy schema structure before serializing the output (e.g., merging split name fields or restoring deprecated attributes).

---

## Deprecation and Sunset Strategies

No API version can run indefinitely. Maintaining multiple versions increases support costs, security auditing overhead, and database migration complexity.

To safely decommission legacy endpoints, APIs communicate lifetimes using standardized HTTP headers:
* `Deprecation`: Signals that the endpoint is deprecated and should not be used in new integrations (e.g. `Deprecation: @1718222400` indicating date or epoch).
* `Sunset`: Announces the timestamp when the endpoint will be turned off and deleted (e.g. `Sunset: Fri, 31 Dec 2027 23:59:59 GMT`).

These headers allow automated client systems or monitoring tools to alert integration engineers to upgrade their API calls before the legacy endpoint is turned off.

---

## Further Reading

* [RFC 8594: The Sunset HTTP Response Header Field](https://datatracker.ietf.org/doc/html/rfc8594) — Standardizes how servers communicate resource retirement timelines to client applications.
* [Roy Fielding: REST APIs must be hypertext-driven](https://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven) — Roy Fielding's perspective on content negotiation and URL design principles.
* [Microsoft API Design Guidelines: Versioning](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design#api-versioning) — Best practices for managing API changes and routing in enterprise environments.
