---
title: Cross-Origin Resource Sharing (CORS)
slug: cors
summary: "Understand browser-enforced security through the Same-Origin Policy and learn how CORS enables secure, controlled resource sharing across different domains."
difficulty: beginner
chapterId: api-design
domain: API Design
estimatedMinutes: 10
prerequisites: [http]
related: [rest-api-design]
seo_title: "CORS (Cross-Origin Resource Sharing): Architecture and Security"
seo_description: "Learn how CORS controls browser access to cross-origin APIs. Master preflight OPTIONS requests, allowed headers, and credential sharing security."
canonical_url: "/concepts/cors"
citations:
  - title: "Cross-Origin Resource Sharing (CORS) W3C Recommendation"
    author: "Anne van Kesteren"
    chapter: "Introduction and Resource Sharing Algorithms"
    external_link: "https://www.w3.org/TR/cors/"
code_examples:
  - language: go
    title: Preflight CORS Handler with Origin Validation and Secure Cookie Headers
    code: |
      package main

      import (
      	"fmt"
      	"log"
      	"net/http"
      )

      // A list of allowed client domains (origins)
      var allowedOrigins = map[string]bool{
      	"https://app.example.com":       true,
      	"https://dashboard.example.com": true,
      }

      // corsMiddleware wraps an http.Handler and enforces origin restrictions
      func corsMiddleware(next http.Handler) http.Handler {
      	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
      		origin := r.Header.Get("Origin")

      		// Check if Origin header exists (cross-origin request from browser)
      		if origin != "" {
      			if allowedOrigins[origin] {
      				// Dynamically echo the origin instead of returning "*" wildcard.
      				// This is mandatory when credentials (cookies/auth headers) are allowed.
      				w.Header().Set("Access-Control-Allow-Origin", origin)
      				w.Header().Set("Access-Control-Allow-Credentials", "true")
      			} else {
      				// Reject unauthorized origins with a 403 Forbidden
      				w.WriteHeader(http.StatusForbidden)
      				fmt.Fprint(w, "CORS Policy: Origin not allowed")
      				return
      			}
      		}

      		// Handle CORS Preflight request (OPTIONS method checking permissions)
      		if r.Method == http.MethodOptions {
      			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS")
      			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
      			// Cache the preflight authorization for 1 hour to reduce network traffic
      			w.Header().Set("Access-Control-Max-Age", "3600")
      			w.WriteHeader(http.StatusNoContent)
      			return
      		}

      		// Forward normal requests to actual route handlers
      		next.ServeHTTP(w, r)
      	})
      }

      func handleUserData(w http.ResponseWriter, r *http.Request) {
      	w.Header().Set("Content-Type", "application/json")
      	w.WriteHeader(http.StatusOK)
      	w.Write([]byte(`{"username": "dev_coder", "email": "dev@example.com"}`))
      }

      func main() {
      	mux := http.NewServeMux()
      	mux.HandleFunc("/api/user", handleUserData)

      	// Wrap multiplexer with CORS checking middleware
      	handler := corsMiddleware(mux)

      	log.Println("Secure API running on port 8080...")
      	log.Fatal(http.ListenAndServe(":8080", handler))
      }
---

## The Concept

The web browser is an untrusted environment executing external code. To protect users from malicious sites reading sensitive data from other tabs, browsers enforce strict isolation boundaries. However, modern APIs often require client interfaces running on one domain to query data from a server hosted on another.

**Cross-Origin Resource Sharing** (`CORS`) is an HTTP-header-based protocol that allows a server to explicitly declare which foreign origins are permitted to load its resources. Rather than blocking requests outright, the browser queries the target API server for permission before allowing the client-side JavaScript to read the response.

<svg viewBox="0 0 580 280" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;"><text x="290" y="20" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">CORS Preflight (OPTIONS) and Actual Request Flow</text><rect x="20" y="45" width="80" height="30" rx="4" fill="#2e3440" stroke="#81a1c1" stroke-width="1"/><text x="60" y="64" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Browser</text><rect x="480" y="45" width="80" height="30" rx="4" fill="#3b4252" stroke="#eceff4" stroke-width="1"/><text x="520" y="64" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">API Server</text><line x1="60" y1="75" x2="60" y2="260" stroke="#4c566a" stroke-dasharray="2" stroke-width="1"/><line x1="520" y1="75" x2="520" y2="260" stroke="#4c566a" stroke-dasharray="2" stroke-width="1"/><path d="M 60 100 L 520 100" stroke="#ebcb8b" stroke-width="1" fill="none" marker-end="url(#arrow-yel)"/><text x="290" y="95" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">1. Preflight: OPTIONS /data (Origin: app.com, Request-Method: PUT)</text><path d="M 520 135 L 60 135" stroke="#ebcb8b" stroke-width="1" fill="none" marker-end="url(#arrow-yel)"/><text x="290" y="130" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">2. Response: Access-Control-Allow-Origin: app.com, Allow-Methods: PUT</text><path d="M 60 180 L 520 180" stroke="#88c0d0" stroke-width="1.5" fill="none" marker-end="url(#arrow-blue)"/><text x="290" y="175" fill="#88c0d0" font-family="sans-serif" font-size="8" text-anchor="middle">3. Actual Request: PUT /data (Origin: app.com)</text><path d="M 520 215 L 60 215" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#arrow-green)"/><text x="290" y="210" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">4. Response: HTTP 200 OK with Data</text><defs><marker id="arrow-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#88c0d0"/></marker><marker id="arrow-yel" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#ebcb8b"/></marker><marker id="arrow-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#a3be8c"/></marker></defs></svg>

---

## Practical Analogy

Think of CORS as an **apartment security intercom system**:

* The **Same-Origin Policy** is like locking the main building gate. By default, residents can walk around inside, but visitors from outside the building are locked out.
* A **Cross-Origin Request** is like an outside delivery driver arriving at the gate. 
* A **CORS Preflight** is like the delivery driver calling up to a specific apartment using the intercom. The driver asks: "I have a package from delivery-service.com, can I bring it up using the elevator (HTTP method)?" 
* The **Server Response** is like the tenant pressing the buzzer. The tenant verifies the driver's origin, replies "Yes, delivery-service.com is allowed to bring up packages using the elevator," and unlocks the gate. The browser then lets the delivery driver walk inside and hand over the package.

---

## Same-Origin Policy (SOP)

The **Same-Origin Policy** (`SOP`) is a core security pillar implemented by web browsers. It prevents client-side scripts running on one website from reading data or interacting with resources on a different website.

An **origin** is defined by three components:
1. **Protocol** (e.g. `http` vs `https`)
2. **Host** (e.g. `example.com` vs `api.example.com`)
3. **Port** (e.g. `:80` vs `:8080`)

If any of these three elements differ, the browser classifies the targets as different origins. For example, a script executing on `https://my-app.com` cannot read the raw HTTP response from `https://api.my-app.com` or `https://my-app.com:8080` by default. 

It is vital to understand that SOP does not block the browser from sending requests: a malicious website can still trigger a state-changing `POST` request to your bank. SOP prevents the malicious site from reading the sensitive response data returned by the bank.

---

## Cross-Origin Resource Sharing (CORS)

While SOP prevents unauthorized data leakage, modern web architectures rely on cross-origin setups (such as separating a static frontend domain from a REST API backend). CORS provides a standard mechanism to selectively bypass SOP limits.

When a browser script initiates an HTTP request to a different origin:
1. The browser automatically appends an `Origin` header to the request containing the sender's origin (e.g., `Origin: https://my-app.com`).
2. The server receives the request, processes the route, and attaches CORS headers to the response.
3. The browser intercepts the response, reads the CORS headers, and checks if the origin is authorized. If the header `Access-Control-Allow-Origin` matches the request's origin or is set to the wildcard `*`, the browser passes the response data to the script. Otherwise, it throws a runtime console error.

---

## Simple vs Preflight Requests

Browsers partition cross-origin requests into two categories based on safety characteristics:

### Simple Requests
Requests that do not alter server data or use custom parameters. A request is simple if it meets all the following criteria:
* The HTTP method is `GET`, `HEAD`, or `POST`.
* It only sets safe standard headers, such as `Accept`, `Accept-Language`, `Content-Language`, or `Content-Type`.
* The `Content-Type` is limited to `application/x-www-form-urlencoded`, `multipart/form-data`, or `text/plain`.

For simple requests, the browser sends the request immediately, verifying the `Access-Control-Allow-Origin` header when the response returns.

### Preflight Requests
If a request could modify server state or uses custom protocols, the browser must confirm permission before sending the payload. This is triggered by:
* HTTP methods like `PUT`, `DELETE`, or `PATCH`.
* Custom HTTP headers (e.g., `Authorization`, `X-Custom-Header`).
* Modern payloads like JSON (`Content-Type: application/json`).

For preflight requests, the browser first issues an automatic `OPTIONS` request. The server must acknowledge this pre-check with the appropriate permission headers before the browser sends the actual data payload.

---

## Preflight Mechanics and Headers

During the preflight handshake, the browser describes the intended transaction using specific metadata headers:

* `Access-Control-Request-Method`: Declares the intended actual method (e.g. `PUT`).
* `Access-Control-Request-Headers`: Lists the custom headers the client plans to send (e.g. `Authorization`).

The server must reply with corresponding validation headers:

* `Access-Control-Allow-Origin`: The allowed domain, or `*` for public resources.
* `Access-Control-Allow-Methods`: The permitted HTTP verbs (e.g. `GET, POST, PUT`).
* `Access-Control-Allow-Headers`: The validated custom headers.
* `Access-Control-Max-Age`: The time in seconds the browser can cache this preflight approval, reducing the latency overhead of future API calls.

---

## Credential Sharing Rules

By default, cross-origin requests do not transmit ambient credentials like cookies, TLS client certificates, or HTTP authentication headers. To share credentials, the client must explicitly enable credential forwarding in its fetch settings (e.g. `credentials: 'include'`).

On the server side, this requires two strict adjustments:
1. The server must return `Access-Control-Allow-Credentials: true`.
2. The server **cannot** use the wildcard `*` for the origin header. It must return a specific, explicit origin (e.g. `Access-Control-Allow-Origin: https://my-app.com`).

If the server sends a wildcard origin with credentials allowed, the browser rejects the transaction, blocking access to the API payload.

---

## Security Implications of Misconfiguration

CORS is a browser-enforced security mechanism: it does not block non-browser clients like `curl`, Postman, or backend proxy servers from making requests. 

Common misconfigurations present severe risks:
* **Reflected Origins**: Writing code that dynamically copies whatever value is in the incoming `Origin` header into `Access-Control-Allow-Origin` with credentials enabled. This effectively turns off SOP, allowing any malicious site on the internet to read private user data.
* **Wildcard IP Exposure**: Allowing arbitrary internal IP or dev addresses (e.g. `http://localhost:*` or `http://*.internal`) without validating port numbers, which exposes local development instances to external scripts.

A secure CORS strategy utilizes strict whitelists of verified production hostnames, denies credential access by default, and limits cached preflight permissions to reasonable intervals.

---

## Further Reading

* [MDN Web Docs: Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) — Detailed explanation of browser CORS mechanics and header configurations.
* [OWASP Cross-Origin Resource Sharing Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Origin_Resource_Sharing_Cheat_Sheet.html) — Practical guides for preventing CORS vulnerabilities and implementing secure origin validation.
* [W3C Same-Origin Policy Specification](https://www.w3.org/Security/wiki/Same_Origin_Policy) — Foundations of the Same-Origin Policy mechanism inside modern user agents.
