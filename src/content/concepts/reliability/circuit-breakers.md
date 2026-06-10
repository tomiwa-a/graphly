---
title: Circuit Breakers
slug: circuit-breakers
summary: "Preventing cascading failures by detecting and isolating faulting downstream services."
difficulty: advanced
chapterId: reliability
domain: Reliability
estimatedMinutes: 18
prerequisites: [http, idempotency]
related: [message-queues, caching-strategies]
seo_title: "Circuit Breakers: Preventing Cascading Failures in Distributed Systems"
seo_description: "Learn how circuit breakers detect and isolate faulting downstream services, prevent cascading failures, and implement fallback strategies in production systems."
canonical_url: "/concepts/circuit-breakers"
code_examples:
  - language: Go
    title: Circuit breaker with gobreaker
    code: |
      import "github.com/sony/gobreaker"

      cb := gobreaker.NewCircuitBreaker(gobreaker.Settings{
          Name:        "payment-service",
          MaxRequests: 3,              // half-open test requests
          Interval:    10 * time.Second, // sliding window
          Timeout:     30 * time.Second, // open -> half-open
          ReadyToTrip: func(counts gobreaker.Counts) bool {
              return counts.ConsecutiveFailures > 5
          },
      })

      result, err := cb.Execute(func() (interface{}, error) {
          return callPaymentService()
      })
  - language: TypeScript
    title: Simple circuit breaker class
    code: |
      class CircuitBreaker {
        private failures = 0;
        private state: "closed" | "open" | "half-open" = "closed";
        private nextAttempt = 0;

        constructor(
          private threshold = 5,
          private cooldown = 30000
        ) {}

        async call<T>(fn: () => Promise<T>): Promise<T> {
          if (this.state === "open") {
            if (Date.now() < this.nextAttempt) {
              throw new Error("Circuit is OPEN");
            }
            this.state = "half-open";
          }
          try {
            const result = await fn();
            this.onSuccess();
            return result;
          } catch (err) {
            this.onFailure();
            throw err;
          }
        }

        private onSuccess() {
          this.failures = 0;
          this.state = "closed";
        }

        private onFailure() {
          this.failures++;
          if (this.failures >= this.threshold) {
            this.state = "open";
            this.nextAttempt = Date.now() + this.cooldown;
          }
        }
      }
---

## What it is

A circuit breaker monitors calls to a downstream service. When failures exceed a threshold, it "trips" and stops sending requests for a cooldown period. This prevents a failing service from taking down the entire system.

## Why it matters

When Service A calls Service B and B is down, A's threads pile up waiting for timeouts. If A has 100 concurrent requests and each waits 30 seconds, A is effectively dead too. A circuit breaker fails fast, freeing resources.

## How it works

Three states: CLOSED (normal, requests pass through), OPEN (tripped, requests fail immediately), HALF-OPEN (testing, a few requests allowed to check if the downstream has recovered). Track failure counts in a sliding window. Trip when failures exceed the threshold.

## Production concerns

Choose thresholds carefully — too sensitive and you trip on transient errors, too lenient and you don't protect fast enough. Add fallback responses when the circuit is open. Log state transitions for observability. Consider per-endpoint circuit breakers.

## Common mistakes

Using a single global circuit breaker for all downstream services. Not implementing a fallback response. Setting the cooldown period too short, causing rapid open/close oscillation. Not monitoring circuit breaker state in dashboards.
