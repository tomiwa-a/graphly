---
title: Circuit Breakers
slug: circuit-breakers
summary: "Preventing cascading failures by detecting and isolating faulting downstream services before they take the whole system down."
difficulty: advanced
chapterId: reliability
domain: Reliability
estimatedMinutes: 14
prerequisites: [http, idempotency]
related: [message-queues, retries-backoff]
seo_title: "Circuit Breakers: Preventing Cascading Failures in Distributed Systems"
seo_description: "Learn how circuit breakers detect and isolate faulting downstream services, prevent cascading failures, and implement fallback strategies in production systems."
canonical_url: "/concepts/circuit-breakers"
code_examples:
  - language: go
    title: Circuit breaker with gobreaker
    code: |
      import "github.com/sony/gobreaker"

      cb := gobreaker.NewCircuitBreaker(gobreaker.Settings{
          Name:        "payment-service",
          MaxRequests: 3,               // half-open probe requests
          Interval:    10 * time.Second, // sliding window reset
          Timeout:     30 * time.Second, // open -> half-open wait
          ReadyToTrip: func(counts gobreaker.Counts) bool {
              return counts.ConsecutiveFailures > 5
          },
          OnStateChange: func(name string, from, to gobreaker.State) {
              log.Printf("circuit %s: %s -> %s", name, from, to)
          },
      })

      result, err := cb.Execute(func() (interface{}, error) {
          return callPaymentService()
      })
      if err == gobreaker.ErrOpenState {
          return fallbackResponse() // serve cached/default data
      }
  - language: typescript
    title: Circuit breaker state machine
    code: |
      class CircuitBreaker {
        private failures = 0;
        private state: "closed" | "open" | "half-open" = "closed";
        private nextAttempt = 0;

        constructor(
          private threshold = 5,
          private cooldown = 30_000
        ) {}

        async call<T>(fn: () => Promise<T>): Promise<T> {
          if (this.state === "open") {
            if (Date.now() < this.nextAttempt) throw new Error("Circuit OPEN");
            this.state = "half-open";
          }
          try {
            const result = await fn();
            this.failures = 0;
            this.state = "closed";
            return result;
          } catch (err) {
            this.failures++;
            if (this.failures >= this.threshold) {
              this.state = "open";
              this.nextAttempt = Date.now() + this.cooldown;
            }
            throw err;
          }
        }
      }
---

## The Cascading Failure Problem

Imagine Service A calls Service B on every incoming request. Service B starts timing out after a deployment issue. Each call from A waits for the full 30-second timeout before giving up. With 100 concurrent users, A now has 100 threads all blocked waiting on B. A's thread pool exhausts. A starts timing out too. Every service calling A now faces the same problem. The failure cascades up the entire call graph.

A circuit breaker is a safety switch that prevents this. When it detects B is failing, it stops sending requests to B immediately and fails fast, freeing A's threads to handle other work.

---

## The Three States

<svg viewBox="0 0 560 220" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="280" y="22" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Circuit Breaker State Machine</text>
  <!-- CLOSED state -->
  <rect x="30" y="50" width="140" height="60" rx="8" fill="#2e3440" stroke="#a3be8c" stroke-width="2"/>
  <text x="100" y="76" fill="#a3be8c" font-family="sans-serif" font-size="12" text-anchor="middle" font-weight="bold">CLOSED</text>
  <text x="100" y="92" fill="#d8dee9" font-family="sans-serif" font-size="9" text-anchor="middle">Normal operation.</text>
  <text x="100" y="103" fill="#d8dee9" font-family="sans-serif" font-size="9" text-anchor="middle">Requests pass through.</text>
  <!-- OPEN state -->
  <rect x="390" y="50" width="140" height="60" rx="8" fill="#2e3440" stroke="#bf616a" stroke-width="2"/>
  <text x="460" y="76" fill="#bf616a" font-family="sans-serif" font-size="12" text-anchor="middle" font-weight="bold">OPEN</text>
  <text x="460" y="92" fill="#d8dee9" font-family="sans-serif" font-size="9" text-anchor="middle">Tripped. All requests</text>
  <text x="460" y="103" fill="#d8dee9" font-family="sans-serif" font-size="9" text-anchor="middle">fail immediately.</text>
  <!-- HALF-OPEN state -->
  <rect x="205" y="145" width="150" height="60" rx="8" fill="#2e3440" stroke="#ebcb8b" stroke-width="2"/>
  <text x="280" y="171" fill="#ebcb8b" font-family="sans-serif" font-size="12" text-anchor="middle" font-weight="bold">HALF-OPEN</text>
  <text x="280" y="187" fill="#d8dee9" font-family="sans-serif" font-size="9" text-anchor="middle">Probing: allows a few</text>
  <text x="280" y="198" fill="#d8dee9" font-family="sans-serif" font-size="9" text-anchor="middle">test requests through.</text>
  <!-- Arrows -->
  <path d="M 170 75 L 390 75" stroke="#bf616a" stroke-width="2" fill="none" marker-end="url(#rb)"/>
  <defs>
    <marker id="rb" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#bf616a"/>
    </marker>
  </defs>
  <text x="280" y="65" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle">failures exceed threshold</text>
  <!-- OPEN -> HALF-OPEN -->
  <path d="M 430 110 L 360 145" stroke="#ebcb8b" stroke-width="2" fill="none" marker-end="url(#ry)"/>
  <defs>
    <marker id="ry" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#ebcb8b"/>
    </marker>
  </defs>
  <text x="415" y="134" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle">timeout expires</text>
  <!-- HALF-OPEN -> CLOSED (success) -->
  <path d="M 230 155 L 120 110" stroke="#a3be8c" stroke-width="2" fill="none" marker-end="url(#rg)"/>
  <defs>
    <marker id="rg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#a3be8c"/>
    </marker>
  </defs>
  <text x="148" y="130" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">probe succeeds</text>
  <!-- HALF-OPEN -> OPEN (fail) -->
  <path d="M 355 155 L 460 110" stroke="#bf616a" stroke-width="1.5" stroke-dasharray="4,3" fill="none" marker-end="url(#rb2)"/>
  <defs>
    <marker id="rb2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#bf616a"/>
    </marker>
  </defs>
  <text x="425" y="150" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle">probe fails</text>
</svg>

* **CLOSED**: Normal operation. Every request passes through to the downstream service. The circuit breaker tracks failures in a sliding window.
* **OPEN**: The failure threshold was exceeded. The circuit is tripped. All requests fail immediately without touching the downstream service. This is the fast-fail behaviour that protects your thread pool.
* **HALF-OPEN**: After a configured timeout, the breaker allows a small number of probe requests through to test if the downstream has recovered. If they succeed, it resets to CLOSED. If they fail, it snaps back to OPEN.

---

## Fallback Responses

A circuit breaker is most useful when paired with a fallback. When the circuit is OPEN, instead of propagating an error, return something useful:

* Serve stale cached data from a previous successful response
* Return a default/empty response (e.g. an empty product list instead of an error)
* Queue the operation for retry later via a message queue
* Return a user-friendly degraded UI response

This is the difference between "the recommendations section is empty" and "the entire page is broken".

---

## Configuration Tradeoffs

* **Threshold too low**: the circuit trips on transient errors (a single slow second), causing unnecessary outages for healthy services
* **Threshold too high**: the circuit takes too long to trip, allowing a failing service to exhaust your thread pool before protection kicks in
* **Timeout too short**: the circuit returns to HALF-OPEN before the downstream has actually recovered, immediately re-trips, and you get rapid oscillation
* **Sliding window vs consecutive count**: consecutive failure count is simpler but sensitive to intermittent errors. A percentage-based sliding window (e.g. 50% of requests in the last 10 seconds fail) is more robust in production

---

## Further Reading

- [Martin Fowler on the Circuit Breaker pattern](https://martinfowler.com/bliki/CircuitBreaker.html) — the canonical description of the pattern
- [Resilience4j documentation](https://resilience4j.readme.io/docs/circuitbreaker) — the most popular JVM circuit breaker library
- [AWS re:Post: implementing circuit breakers](https://repost.aws/knowledge-center/circuit-breaker-pattern) — practical guide for cloud environments
- [Release It! by Michael Nygard](https://pragprog.com/titles/mnee2/release-it-second-edition/) — the book that popularised the circuit breaker pattern
