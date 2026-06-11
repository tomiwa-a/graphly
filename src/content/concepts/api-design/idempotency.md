---
title: Idempotency
slug: idempotency
summary: "Making repeated operations safe by ensuring the same request produces the same result no matter how many times it's executed."
difficulty: intermediate
chapterId: api-design
domain: API Design
estimatedMinutes: 15
prerequisites: [http]
related: [message-queues, circuit-breakers]
seo_title: "Idempotency in REST APIs: Building Reliable Distributed Endpoints"
seo_description: "Learn how idempotency keys mathematically prevent double-billing and duplicate resource creation in HTTP POST networks."
canonical_url: "/concepts/idempotency"
code_examples:
  - language: Go
    title: Idempotent API handler
    code: |
      func CreatePayment(w http.ResponseWriter, r *http.Request) {
          key := r.Header.Get("Idempotency-Key")
          if key == "" {
              http.Error(w, "missing idempotency key", 400)
              return
          }

          // Check if we've seen this key before
          if result, ok := cache.Get(key); ok {
              json.NewEncoder(w).Encode(result)
              return
          }

          // Process the payment
          payment, err := processPayment(r)
          if err != nil {
              http.Error(w, err.Error(), 500)
              return
          }

          // Store result for future retries
          cache.Set(key, payment, 24*time.Hour)
          json.NewEncoder(w).Encode(payment)
      }
  - language: Python
    title: Idempotent endpoint with Flask
    code: |
      from flask import Flask, request, jsonify
      from functools import lru_cache
      import redis

      app = Flask(__name__)
      r = redis.Redis()

      @app.route("/payments", methods=["POST"])
      def create_payment():
          key = request.headers.get("Idempotency-Key")
          if not key:
              return jsonify(error="missing key"), 400

          cached = r.get(f"idem:{key}")
          if cached:
              return jsonify(json.loads(cached))

          result = process_payment(request.json)
          r.setex(f"idem:{key}", 86400, json.dumps(result))
          return jsonify(result), 201
  - language: TypeScript
    title: Express idempotency middleware
    code: |
      const idempotency = new Map<string, unknown>();

      app.post("/payments", (req, res) => {
        const key = req.headers["idempotency-key"] as string;
        if (!key) return res.status(400).json({ error: "missing key" });

        if (idempotency.has(key)) {
          return res.json(idempotency.get(key));
        }

        const result = processPayment(req.body);
        idempotency.set(key, result);

        // Clean up after 24h
        setTimeout(() => idempotency.delete(key), 86400000);
        res.status(201).json(result);
      });
---

## What It Is

An operation is idempotent if performing it multiple times has the same effect as performing it once. 

Under the HTTP specification:
* `GET`, `HEAD`, `OPTIONS`, `TRACE` are safe and idempotent by definition because they only retrieve data.
* `PUT` is idempotent: replacing a resource entirely with the same payload repeatedly leaves the resource in the exact same state.
* `DELETE` is idempotent: deleting a resource multiple times results in the resource being gone. The first call deletes it (returning `200` or `204`), and subsequent calls will return `404`, but the system state is identical.
* `POST` is **not** idempotent: sending the same POST request multiple times will create multiple resources or trigger multiple transactions.

---

## Why It Matters: Network Failures

In distributed systems, networks are unreliable. A request can fail in three ways:
1. The request never reaches the server.
2. The server processes the request but the connection drops before sending the response.
3. The response is lost on the way back to the client.

If a client retries a payment `POST /payments` request because of a timeout, they do not know if the failure happened at step 1, 2, or 3. Without idempotency, retrying could charge the customer's card twice.

---

## Idempotency Key Lifecycle & Cache Flow

To make `POST` requests safe, clients generate a unique identifier (typically a UUIDv4) called an **Idempotency Key** and send it in a custom header: `Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d`.

<svg viewBox="0 0 580 300" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="24" fill="#88c0d0" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Idempotency Key Lifecycle & Cache Flow</text>
  
  <!-- Client -->
  <rect x="30" y="70" width="100" height="40" rx="5" fill="#2e3440" stroke="#88c0d0"/>
  <text x="80" y="95" fill="#eceff4" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">Client</text>
  
  <!-- Server / Gate -->
  <rect x="220" y="70" width="140" height="40" rx="5" fill="#2e3440" stroke="#ebcb8b"/>
  <text x="290" y="95" fill="#eceff4" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">API Gateway / Server</text>
  
  <!-- Cache (Redis) -->
  <rect x="220" y="180" width="140" height="40" rx="5" fill="#2e3440" stroke="#a3be8c"/>
  <text x="290" y="205" fill="#a3be8c" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">Cache (Redis)</text>
  
  <!-- Backend / DB -->
  <rect x="450" y="70" width="100" height="40" rx="5" fill="#2e3440" stroke="#bf616a"/>
  <text x="500" y="95" fill="#eceff4" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">Database / Bank</text>
  
  <!-- Flow Arrows -->
  <!-- 1. Send request with Key -->
  <path d="M 130 80 L 220 80" stroke="#88c0d0" stroke-width="1.5" marker-end="url(#arr-blue)"/>
  <text x="175" y="72" fill="#88c0d0" font-family="sans-serif" font-size="8" text-anchor="middle">1. POST (Key=xyz)</text>
  
  <!-- 2. Check Cache -->
  <path d="M 270 110 L 270 180" stroke="#ebcb8b" stroke-width="1.5" marker-end="url(#arr-yellow)"/>
  <text x="260" y="145" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="end">2. Lookup key</text>
  
  <!-- 3. Cache Miss / Lock -->
  <path d="M 310 180 L 310 110" stroke="#a3be8c" stroke-width="1.5" stroke-dasharray="3,2" marker-end="url(#arr-green)"/>
  <text x="320" y="145" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="start">3. Miss (not seen)</text>
  
  <!-- 4. Process Payment -->
  <path d="M 360 80 L 450 80" stroke="#bf616a" stroke-width="1.5" marker-end="url(#arr-red)"/>
  <text x="405" y="72" fill="#bf616a" font-family="sans-serif" font-size="8" text-anchor="middle">4. Charge card</text>
  
  <!-- 5. Save Result in Cache -->
  <path d="M 360 100 Q 420 140 360 190" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#arr-green)"/>
  <text x="410" y="150" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="start">5. Save key + result</text>

  <!-- 6. Return response -->
  <path d="M 220 100 L 130 100" stroke="#ebcb8b" stroke-width="1.5" marker-end="url(#arr-yellow)"/>
  <text x="175" y="112" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">6. Success (201)</text>

  <!-- Retry flow (Cache Hit) -->
  <path d="M 130 90 Q 175 140 220 90" stroke="#81a1c1" stroke-width="1.5" stroke-dasharray="4,2" fill="none" marker-end="url(#arr-blue-light)"/>
  <text x="175" y="150" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Retry (Key=xyz)</text>
  <text x="175" y="162" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">Returns cached result</text>
  
  <defs>
    <marker id="arr-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#88c0d0"/>
    </marker>
    <marker id="arr-blue-light" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#81a1c1"/>
    </marker>
    <marker id="arr-yellow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#ebcb8b"/>
    </marker>
    <marker id="arr-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#a3be8c"/>
    </marker>
    <marker id="arr-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#bf616a"/>
    </marker>
  </defs>
</svg>

### The Step-by-Step Flow:
1. **Key Generation**: The client generates a unique token before sending the request.
2. **First Request**: The server receives the key and searches its storage. Since it is a cache miss, the server marks the key as `IN_PROGRESS` (often using an atomic lock) to avoid race conditions.
3. **Execution**: The server executes the downstream banking or write operation.
4. **Storage**: Once finished, the server stores the response payload, status code, and headers in the cache or database, and sets the key's state to `COMPLETED`.
5. **Return**: The response goes back to the client.
6. **Subsequent Retries**: If the client retries the request with the same key, the server finds the key in the cache and returns the saved response immediately. The downstream operation is not triggered a second time.

---

## Production Concerns

### 1. Handling Concurrent Requests
What happens if two identical requests with the same key arrive at the server at the exact same millisecond? This is a classic race condition.

To prevent this, the database or cache must use atomic lock operations. For example, using Redis `SET key val NX PX 10000` (set if not exists with a TTL of 10 seconds). If the second request tries to acquire the same key while the first is still processing, the server returns a `409 Conflict` status code or waits for the lock to release.

### 2. Payload Consistency
Should the server verify if the request body matches the first request for a given key? 

If a client sends `POST /payments` with `amount=10` and key `xyz`, and then sends `POST /payments` with `amount=100` and the same key `xyz`, this is an application bug or malicious request. Best practice is to hash the request body and store it alongside the key. If the hash does not match on a retry, return a `400 Bad Request` explaining the payload mismatch.

### 3. Expiration (TTL)
You do not need to store idempotency keys forever. Doing so would bloat your database. A standard TTL of 24 to 72 hours is usually sufficient to handle any client retries.

---

## Common Mistakes

* **Using Non-Unique Keys**: Using a customer ID or order ID as the idempotency key. Keys must be unique per request attempt.
* **No TTL**: Forgetting to set a TTL on the database records, causing infinite database table growth.
* **Ignoring Downstream Failures**: If the downstream bank call fails with a 500 error, storing that error permanently. If an operation fails due to transient issues, the idempotency record should be cleared or updated to allow a genuine retry.

---

## Further Reading

* [Stripe Engineering: Design of Idempotency APIs](https://stripe.com/blog/idempotency) — The canonical resource detailing Stripe's implementation of idempotency keys
* [IETF Draft: The Idempotency-Key HTTP Header](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-idempotency-key-header-04) — The proposed internet standard for idempotency headers
* [AWS Builder's Library: Making retries safe with idempotency](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotency/) — Architectural patterns for implementing idempotency in AWS services
* [RFC 9110: HTTP Semantics - Idempotent Methods](https://www.rfc-editor.org/rfc/rfc9110.html#name-idempotent-methods) — The formal HTTP specification details on idempotency
