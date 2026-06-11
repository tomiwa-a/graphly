---
title: Observability
slug: observability-metrics-logs-traces
summary: "Debugging distributed software using structured JSON logging, Prometheus metric aggregations, and W3C trace context propagation across service boundaries."
difficulty: intermediate
chapterId: infrastructure
domain: Infrastructure
estimatedMinutes: 15
prerequisites: [processes-threads, http]
related: [kubernetes]
seo_title: "Observability: Metrics, Structured Logs, and Distributed Tracing"
seo_description: "Learn the foundations of system observability. Discover the three pillars: metrics, structured logging, and distributed tracing context propagation."
canonical_url: "/concepts/observability-metrics-logs-traces"
citations:
  - title: "Dapper, a Large-Scale Distributed Systems Tracing Infrastructure"
    author: "Benjamin H. Sigelman, Luiz André Barroso, Mike Burrows, Pat Stephenson, Mano Plakal, Donald Beaver, Shingo Jasen, and Ashwin Shanbhag"
    chapter: "Section 2: Dapper's Distributed Tracing Model"
    page_range: "2-7"
    external_link: "https://research.google/pubs/pub36356/"
code_examples:
  - language: go
    title: Distributed Trace Context Propagation and Metrics Instrumentation
    code: |
      package main

      import (
          "context"
          "net/http"
          "time"

          "github.com/prometheus/client_golang/prometheus"
          "github.com/prometheus/client_golang/prometheus/promauto"
          "go.opentelemetry.io/otel"
          "go.opentelemetry.io/otel/attribute"
          "go.opentelemetry.io/otel/propagation"
          "go.opentelemetry.io/otel/trace"
      )

      var (
          httpRequestsTotal = promauto.NewCounterVec(
              prometheus.CounterOpts{
                  Name: "http_requests_total",
                  Help: "Total number of HTTP requests processed.",
              },
              []string{"path", "status"},
          )
          httpRequestDuration = promauto.NewHistogramVec(
              prometheus.HistogramOpts{
                  Name:    "http_request_duration_seconds",
                  Help:    "Latency of HTTP requests in seconds.",
                  Buckets: prometheus.DefBuckets,
              },
              []string{"path"},
          )
      )

      func traceMiddleware(next http.Handler) http.Handler {
          return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
              start := time.Now()

              // 1. Extract W3C traceparent header context from incoming call
              propagator := propagation.TraceContext{}
              ctx := propagator.Extract(r.Context(), propagation.HeaderCarrier(r.Header))

              // 2. Start a new span linked to the parent trace context
              tracer := otel.Tracer("http-server")
              ctx, span := tracer.Start(ctx, "ServeHTTP", trace.WithSpanKind(trace.SpanKindServer))
              defer span.End()

              span.SetAttributes(
                  attribute.String("http.method", r.Method),
                  attribute.String("http.path", r.URL.Path),
              )

              wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
              next.ServeHTTP(wrapped, r.WithContext(ctx))

              // 3. Record metrics (latency histogram and request counters)
              duration := time.Since(start).Seconds()
              httpRequestDuration.WithLabelValues(r.URL.Path).Observe(duration)
              httpRequestsTotal.WithLabelValues(r.URL.Path, http.StatusText(wrapped.statusCode)).Inc()

              span.SetAttributes(attribute.Int("http.status_code", wrapped.statusCode))
          })
      }

      func callDownstreamService(ctx context.Context, url string) error {
          // 4. Inject active trace context into outgoing HTTP request
          req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
          if err != nil {
              return err
          }

          propagator := propagation.TraceContext{}
          propagator.Inject(ctx, propagation.HeaderCarrier(req.Header))

          client := &http.Client{Timeout: 5 * time.Second}
          resp, err := client.Do(req)
          if err != nil {
              return err
          }
          defer resp.Body.Close()

          return nil
      }

      type responseWriter struct {
          http.ResponseWriter
          statusCode int
      }

      func (rw *responseWriter) WriteHeader(code int) {
          rw.statusCode = code
          rw.ResponseWriter.WriteHeader(code)
      }
---

## Monitoring vs Observability

In production systems, engineers make a clear distinction between monitoring a system and making it observable:

* **Monitoring**: Focuses on reporting symptoms. It answers the question, "Is the system broken?" It tracks key performance indicators (such as CPU utilization, memory consumption, or HTTP error counts) and triggers alerts when values cross predefined thresholds. Monitoring is ideal for catching **known failure modes**.
* **Observability**: Focuses on understanding system states. It answers the question, "Why is the system broken?" By collecting rich telemetry data, observability allows engineers to debug novel system behaviors, trace rare concurrency bugs, and inspect **unknown failure modes** without deploying new code.

A system is observable if you can infer its internal state solely by examining its external outputs (logs, metrics, and traces).

---

## Structured Logging

Traditional logging emits lines of unstructured text, making them difficult to parse programmatically. If you have millions of log lines spread across multiple microservices, locating a single failure is nearly impossible.

**Structured logging** solves this by formatting log entries as structured data objects, typically JSON blobs. Every log line contains key-value pairs representing context:

```json
{
  "timestamp": "2026-06-11T18:04:12Z",
  "level": "error",
  "message": "database query timeout",
  "service": "billing-service",
  "trace_id": "4a3fe29c8e1a123fbc09d17d",
  "span_id": "8e3cd92a",
  "query_duration_ms": 5000,
  "user_id": 48291
}
```

By including attributes like `trace_id` and `user_id`, log aggregators (such as Elasticsearch or Grafana Loki) can filter millions of events instantly, correlating billing errors with database performance and user accounts.

---

## Metrics Aggregation

Metrics are numerical values aggregated over time. They are highly structured, efficient to store, and ideal for creating real-time dashboards and alerts. Telemetry frameworks utilize four core metric types:

* **Counters**: Monotonically increasing values that only reset to zero on restart. Use counters to track event rates (for instance, the total number of HTTP requests, database transactions, or cache misses).
* **Gauges**: Numerical values that can go up and down. Use gauges to represent instantaneous states (such as current memory utilization, active thread pool size, or queue depth).
* **Histograms**: Buckets that count the frequency of events falling into specific size ranges. Use histograms to compute percentiles (like p95 or p99 latencies), which show the distribution of query times rather than simple averages.
* **Summaries**: Similar to histograms, but they compute configurable quantiles directly on the client side over a sliding time window.

---

## Distributed Tracing and Context Propagation

In a microservices architecture, a single user request might traverse dozens of distinct services, network load balancers, and databases. If a request fails or is slow, logging alone cannot show where the bottleneck lies.

**Distributed tracing** reconstructs the request path. It utilizes two main abstractions:

* **Span**: The basic unit of work. A span represents a single operation with a start time, duration, and status (e.g. an HTTP request, a database query, or an encryption operation).
* **Trace**: A collection of spans that form a directed acyclic graph, representing the end-to-end lifecycle of a request.

To link spans across network boundaries, services use **context propagation**. When service A calls service B, it injects trace metadata (like the Trace ID and Parent Span ID) into the outgoing HTTP headers using the W3C `traceparent` standard. Service B extracts this header, links its new child span to the parent span, and passes the context down-stream.

<svg viewBox="0 0 580 340" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="20" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Distributed Trace Span Hierarchy</text>
  <text x="30" y="50" fill="#81a1c1" font-family="sans-serif" font-size="10" font-weight="bold">Service Call Graph</text>
  <rect x="30" y="65" width="100" height="30" rx="4" fill="#2e3440" stroke="#88c0d0" stroke-width="1.5"/>
  <text x="80" y="83" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">API Gateway</text>
  <rect x="180" y="65" width="100" height="30" rx="4" fill="#2e3440" stroke="#ebcb8b" stroke-width="1.5"/>
  <text x="230" y="83" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Service A</text>
  <rect x="330" y="65" width="100" height="30" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="380" y="83" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Service B</text>
  <rect x="330" y="110" width="100" height="30" rx="4" fill="#2e3440" stroke="#bf616a" stroke-width="1.5"/>
  <text x="380" y="128" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Database</text>
  <path d="M 130 80 L 175 80" stroke="#d8dee9" stroke-width="1.5" marker-end="url(#arr)"/>
  <text x="152" y="72" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">HTTP</text>
  <path d="M 280 80 L 325 80" stroke="#d8dee9" stroke-width="1.5" marker-end="url(#arr)"/>
  <text x="302" y="72" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">HTTP</text>
  <path d="M 230 95 L 230 125 L 325 125" stroke="#d8dee9" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="280" y="118" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">SQL</text>
  <text x="30" y="170" fill="#81a1c1" font-family="sans-serif" font-size="10" font-weight="bold">Trace Timeline Visualization</text>
  <rect x="30" y="185" width="520" height="20" rx="3" fill="#2e3440" stroke="#88c0d0" stroke-width="1.5"/>
  <text x="40" y="198" fill="#eceff4" font-family="sans-serif" font-size="8">Span 1: API Gateway (Parent)</text>
  <rect x="100" y="215" width="430" height="20" rx="3" fill="#2e3440" stroke="#ebcb8b" stroke-width="1.5"/>
  <text x="110" y="228" fill="#eceff4" font-family="sans-serif" font-size="8">Span 2: Service A (Child)</text>
  <rect x="180" y="245" width="160" height="20" rx="3" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="190" y="258" fill="#eceff4" font-family="sans-serif" font-size="8">Span 3: Service B</text>
  <rect x="360" y="275" width="160" height="20" rx="3" fill="#2e3440" stroke="#bf616a" stroke-width="1.5"/>
  <text x="370" y="288" fill="#eceff4" font-family="sans-serif" font-size="8">Span 4: SQL Query</text>
  <defs>
    <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#d8dee9"/>
    </marker>
  </defs>
</svg>

---

## Push vs Pull Collection Models

Telemetry frameworks use two models for collecting data:

* **Pull Model (e.g. Prometheus)**: The monitoring server periodically scrapes metrics from endpoints exposed by target application instances (typically over a path like `/metrics`). This model simplifies application logic and protects instances from being overloaded by telemetry traffic, but it requires service discovery to locate target containers in elastic environments.
* **Push Model (e.g. OpenTelemetry)**: Application instances actively push metrics, logs, and traces to a centralized collector. This model is ideal for short-lived serverless tasks (which exit before a scraper can run) and simplifies routing through firewalls.

Modern standards (like OpenTelemetry) decouple collection from storage, allowing you to ingest data using push protocols and forward it to backend storage engines using whichever mechanism they require.

---

## Further Reading

* [Dapper, a Large-Scale Distributed Systems Tracing Infrastructure](https://research.google/pubs/pub36356/) — Google's seminal paper defining span hierarchies and tracing context propagation.
* [OpenTelemetry Specifications](https://opentelemetry.io/docs/specs/otel/) — The open standard definition for metrics, logs, and trace telemetry structures.
* [Prometheus Architecture](https://prometheus.io/docs/introduction/architecture/) — An overview of pull-based metric collection and storage principles.
