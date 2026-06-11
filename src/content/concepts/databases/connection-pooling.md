---
title: Connection Pooling
slug: connection-pooling
summary: "A connection pool maintains a cache of active database connections, eliminating the high cost of initiating a new network socket and authenticating on every query."
difficulty: intermediate
chapterId: databases
domain: Databases
estimatedMinutes: 10
prerequisites: [processes-threads, network-sockets-tcp-udp]
related: [caching-strategies]
seo_title: "Database Connection Pooling: Architecture and Sizing"
seo_description: "Learn how database connection pooling works, why physical connection creation is slow, and how to size your pool using the HikariCP formula."
canonical_url: "/concepts/connection-pooling"
citations:
  - title: "About Pool Sizing"
    author: "HikariCP Wiki"
    external_link: "https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing"
code_examples:
  - language: go
    title: "Thread-Safe Database Connection Pool from Scratch"
    code: |
      package main

      import (
          "context"
          "errors"
          "net"
          "sync"
          "time"
      )

      type Conn interface {
          Ping() error
          Close() error
          IsClosed() bool
      }

      type mockConn struct {
          netConn   net.Conn
          createdAt time.Time
          closed    bool
      }

      func (c *mockConn) Ping() error      { return nil }
      func (c *mockConn) Close() error     { c.closed = true; return nil }
      func (c *mockConn) IsClosed() bool   { return c.closed }

      type PoolConfig struct {
          MinIdle     int
          MaxPoolSize int
          MaxLifetime time.Duration
          DialTimeout time.Duration
      }

      type Pool struct {
          config PoolConfig
          conns  chan *mockConn
          mu     sync.Mutex
          active int
      }

      func NewPool(config PoolConfig) (*Pool, error) {
          p := &Pool{
              config: config,
              conns:  make(chan *mockConn, config.MaxPoolSize),
          }
          for i := 0; i < config.MinIdle; i++ {
              conn, err := p.dial()
              if err == nil {
                  p.conns <- conn
                  p.active++
              }
          }
          go p.supervisor()
          return p, nil
      }

      func (p *Pool) dial() (*mockConn, error) {
          return &mockConn{
              createdAt: time.Now(),
          }, nil
      }

      func (p *Pool) Acquire(ctx context.Context) (Conn, error) {
          p.mu.Lock()
          if len(p.conns) == 0 && p.active < p.config.MaxPoolSize {
              conn, err := p.dial()
              if err == nil {
                  p.active++
                  p.mu.Unlock()
                  return conn, nil
              }
          }
          p.mu.Unlock()

          select {
          case conn := <-p.conns:
              if time.Since(conn.createdAt) > p.config.MaxLifetime {
                  conn.Close()
                  p.mu.Lock()
                  p.active--
                  p.mu.Unlock()
                  return p.Acquire(ctx)
              }
              return conn, nil
          case <-ctx.Done():
              return nil, ctx.Err()
          }
      }

      func (p *Pool) Release(conn Conn) {
          mc, ok := conn.(*mockConn)
          if !ok || mc.IsClosed() {
              p.mu.Lock()
              p.active--
              p.mu.Unlock()
              return
          }

          select {
          case p.conns <- mc:
          default:
              mc.Close()
              p.mu.Lock()
              p.active--
              p.mu.Unlock()
          }
      }

      func (p *Pool) supervisor() {
          ticker := time.NewTicker(30 * time.Second)
          for range ticker.C {
              p.mu.Lock()
              numIdle := len(p.conns)
              for i := 0; i < numIdle; i++ {
                  select {
                  case conn := <-p.conns:
                      if time.Since(conn.createdAt) > p.config.MaxLifetime || conn.Ping() != nil {
                          conn.Close()
                          p.active--
                      } else {
                          p.conns <- conn
                      }
                  default:
                      break
                  }
              }
              p.mu.Unlock()
          }
      }
---

## The Cost of Raw Database Connections

In a naive database architecture, a backend application opens a new database connection whenever it needs to run a query, and closes the connection immediately after receiving the results. Under load, this pattern quickly becomes a severe bottleneck.

Opening a physical database connection is an expensive, multi-step process:
* **TCP Handshake**: Initiating a network socket requires a three-way handshake (SYN, SYN-ACK, ACK) between the application and the database server.
* **TLS Negotiation**: Encrypted connections require multiple cryptographic round-trips to establish session keys.
* **Authentication and Authorization**: The database must parse credentials, verify user permissions, and establish session contexts.
* **Process Spawning**: Traditional database engines (like PostgreSQL) spawn a dedicated backend OS process for each incoming connection, consuming system memory and CPU during initialization.

Because of this overhead, establishing a connection can take anywhere from tens to hundreds of milliseconds. If your web request runs a query in 2 milliseconds but spends 50 milliseconds opening the connection, your system efficiency is abysmally low.

## What is a Connection Pool?

To bypass this cost, systems use **connection pooling**. A connection pool is a thread-safe cache of open, authenticated database connections maintained by the client application.

When the application needs to query the database:
1. It requests a connection from the pool.
2. The pool immediately returns an existing, active connection from its idle queue.
3. The application executes the query over this connection.
4. When finished, the application releases the connection back to the pool rather than closing it.

By keeping a warm pool of sockets, the application avoids connection negotiation costs on almost every query.

## Diagram: Connection Pool Architecture

The following diagram illustrates how multiple client threads share a bounded set of idle and active database connections:

<svg viewBox="0 0 580 280" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="24" font-family="sans-serif" font-size="14" fill="#88c0d0" text-anchor="middle" font-weight="bold">Database Connection Pool Lifecycle</text>
  <text x="70" y="60" font-family="sans-serif" font-size="12" fill="#eceff4" text-anchor="middle" font-weight="bold">Client Threads</text>
  <rect x="20" y="80" width="100" height="35" rx="5" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="70" y="102" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">Thread A</text>
  <rect x="20" y="125" width="100" height="35" rx="5" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="70" y="147" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">Thread B</text>
  <rect x="20" y="170" width="100" height="35" rx="5" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="70" y="192" font-family="sans-serif" font-size="11" fill="#eceff4" text-anchor="middle">Thread C (Waiting)</text>
  <rect x="190" y="55" width="200" height="190" rx="8" fill="#3b4252" stroke="#4c566a" stroke-width="2"/>
  <text x="290" y="75" font-family="sans-serif" font-size="12" fill="#eceff4" text-anchor="middle" font-weight="bold">Connection Pool</text>
  <rect x="205" y="90" width="170" height="60" rx="6" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="290" y="108" font-family="sans-serif" font-size="10" fill="#a3be8c" text-anchor="middle" font-weight="bold">Idle Pool (FIFO Queue)</text>
  <rect x="215" y="118" width="40" height="22" rx="3" fill="#3b4252" stroke="#a3be8c"/>
  <text x="235" y="132" font-family="sans-serif" font-size="10" fill="#eceff4" text-anchor="middle">Conn 1</text>
  <rect x="265" y="118" width="40" height="22" rx="3" fill="#3b4252" stroke="#a3be8c"/>
  <text x="285" y="132" font-family="sans-serif" font-size="10" fill="#eceff4" text-anchor="middle">Conn 2</text>
  <rect x="315" y="118" width="40" height="22" rx="3" fill="#3b4252" stroke="#a3be8c"/>
  <text x="335" y="132" font-family="sans-serif" font-size="10" fill="#eceff4" text-anchor="middle">Conn 3</text>
  <rect x="205" y="165" width="170" height="65" rx="6" fill="#2e3440" stroke="#ebcb8b" stroke-width="1.5"/>
  <text x="290" y="182" font-family="sans-serif" font-size="10" fill="#ebcb8b" text-anchor="middle" font-weight="bold">In-Use Connections</text>
  <rect x="240" y="195" width="100" height="25" rx="3" fill="#3b4252" stroke="#ebcb8b"/>
  <text x="290" y="211" font-family="sans-serif" font-size="10" fill="#eceff4" text-anchor="middle">Conn 4 (Active)</text>
  <rect x="460" y="100" width="100" height="100" rx="8" fill="#2e3440" stroke="#88c0d0" stroke-width="2"/>
  <text x="510" y="140" font-family="sans-serif" font-size="13" fill="#88c0d0" text-anchor="middle" font-weight="bold">DBMS</text>
  <text x="510" y="160" font-family="sans-serif" font-size="9" fill="#81a1c1" text-anchor="middle">PostgreSQL / MySQL</text>
  <path d="M 120 98 L 205 118" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="160" y="100" font-family="sans-serif" font-size="8" fill="#a3be8c" text-anchor="middle">Acquire()</text>
  <path d="M 205 138 L 120 142" stroke="#ebcb8b" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="160" y="152" font-family="sans-serif" font-size="8" fill="#ebcb8b" text-anchor="middle">Release()</text>
  <path d="M 340 207 L 460 160" stroke="#88c0d0" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="410" y="180" font-family="sans-serif" font-size="8" fill="#88c0d0" text-anchor="middle">Query/SQL</text>
  <defs>
    <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#81a1c1"/>
    </marker>
  </defs>
</svg>

## Sizing the Pool: The HikariCP Formula

A common mistake is configuring a massive connection pool under the assumption that more connections equal higher performance. In reality, too many connections degrade performance due to disk I/O bottlenecks and CPU context switching.

A single CPU core can only do one thing at a time. If you have 4 CPU cores and run 100 concurrent queries, the operating system must constantly swap tasks on and off the cores (context switching), wasting cycles. Furthermore, spinning disk hard drives are constrained by physical spindles.

The PostgreSQL and HikariCP maintainers recommend a sizing formula based on hardware limitations:

`connections = (core_count * 2) + effective_spindle_count`

Where:
* `core_count` is the number of physical CPU cores.
* `effective_spindle_count` represents the disk parallelism (e.g. a RAID array of hard drives). For SSDs, this can be modeled based on concurrent I/O capabilities.

For example, on a 4-core server with an SSD, a pool size of roughly 9 or 10 connections is often optimal. Keeping the pool size small keeps the database server focused, preventing context-switch thrashing and disk queue congestion.

## Pool Lifecycle and Tuning Parameters

Configuring a connection pool requires tuning several key variables:
* **`MaxPoolSize`**: The absolute limit on active connections. When reached, subsequent callers block until a connection is returned.
* **`MinIdle`**: The minimum number of idle connections the pool maintains. Keeping this equal to `MaxPoolSize` (fixed-size pool) is recommended in production to avoid dynamic scaling latency.
* **`MaxLifetime`**: The maximum age of a connection. Periodically destroying and recreating connections prevents memory leaks and clears stale server resources.
* **`ConnectionTimeout`**: The duration a client will wait to borrow a connection before failing with an error.

## Resiliency Patterns and Leak Detection

A robust connection pool must handle networks drops, database crashes, and application bugs:
* **Validation Queries**: Before handing a connection to the application, the pool runs a cheap test query like `SELECT 1` to verify the socket is alive.
* **Failover Handling**: If the database server crashes or fails over, the pool must purge all existing connections and reconnect to the new primary host.
* **Connection Leak Detection**: If an application fails to release a connection back to the pool, the connection is leaked. Over time, leaks exhaust the pool. Production pools track borrowed connections and log warning stack traces if a connection is held longer than a configured threshold.

## Further Reading

* [HikariCP Wiki on Pool Sizing](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)
* [PostgreSQL Connection Pooling Docs](https://www.postgresql.org/docs/current/connection-pooling.html)
* [Designing Data-Intensive Applications by Martin Kleppmann](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/)
