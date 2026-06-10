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

## What it is

An operation is idempotent if performing it multiple times has the same effect as performing it once. HTTP GET, PUT, and DELETE are idempotent by design. POST is not — sending the same POST twice may create two resources.

## Why it matters

Networks are unreliable. Clients retry requests when they don't get a response. Without idempotency, a retried payment request could charge a customer twice. Idempotency keys let servers detect duplicate requests and return the original result.

## Mental model

Think of an elevator button. Pressing it once calls the elevator. Pressing it five more times doesn't call five elevators — the result is the same. That's idempotency.

## How it works

The client generates a unique idempotency key (usually a UUID) and sends it with the request. The server checks if it has seen this key before. If yes, it returns the stored response. If no, it processes the request, stores the result keyed by the idempotency key, and returns the response.

## Production concerns

Store idempotency keys in a database with a TTL (e.g., 24 hours). Use database constraints to prevent race conditions. Consider what happens if the original request failed — should retries re-attempt or return the error?

## Common mistakes

Using session IDs or user IDs as idempotency keys (not unique per request). Forgetting to handle partial failures. Not setting a TTL on stored keys, causing unbounded storage growth.
