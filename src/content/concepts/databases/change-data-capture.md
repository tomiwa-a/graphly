---
title: Change Data Capture
slug: change-data-capture
summary: "How systems listen to a database's internal changelog to react to every insert, update, and delete without polling the database directly."
difficulty: intermediate
chapterId: databases
domain: Databases
estimatedMinutes: 10
prerequisites: [indexes, message-queues]
related: [lsm-trees, message-queues]
seo_title: "Change Data Capture (CDC) Explained: Database Changelogs and Event Streaming"
seo_description: "Learn how Change Data Capture works by reading database write-ahead logs, and why it's used for data sync, event streaming, and real-time analytics pipelines."
canonical_url: "/concepts/change-data-capture"
code_examples: []
---

## The Polling Problem

Suppose you have a `users` table in your primary Postgres database, and you need to keep an Elasticsearch search index in sync. The naive approach is to poll: every 10 seconds, query for rows updated in the last 10 seconds and re-index them.

This works until it doesn't. You miss updates that happen between polls. Deletes are invisible. You add load to your database continuously. And at high volume, a 10-second lag is often too much.

**Change Data Capture (CDC)** solves this by reading the database's own internal record of every write, the same log the database already uses internally for crash recovery.

---

## How Databases Record Writes

Before any write commits, most production databases append it to a **Write-Ahead Log (WAL)**. The WAL is append-only and sequential, which is why it is fast. If the database crashes mid-write, it replays the WAL on restart to recover. Replication between a primary and its replicas also works by streaming this log.

CDC tools tap into this same stream. Instead of querying the table, they read the log and emit an event for every change: an insert with the new row's data, an update with before and after values, or a delete with the deleted row's identifier.

<svg viewBox="0 0 600 220" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="300" y="22" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">CDC Pipeline</text>
  <!-- Database -->
  <rect x="20" y="50" width="110" height="52" rx="6" fill="#2e3440" stroke="#88c0d0" stroke-width="2"/>
  <text x="75" y="72" fill="#eceff4" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">Postgres</text>
  <text x="75" y="88" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">WAL (write-ahead log)</text>
  <!-- Arrow 1 -->
  <path d="M 130 76 L 175 76" stroke="#88c0d0" stroke-width="2" fill="none" marker-end="url(#arr1)"/>
  <defs>
    <marker id="arr1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#88c0d0"/>
    </marker>
  </defs>
  <!-- CDC Tool -->
  <rect x="178" y="50" width="120" height="52" rx="6" fill="#3b4252" stroke="#ebcb8b" stroke-width="2"/>
  <text x="238" y="72" fill="#ebcb8b" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">Debezium</text>
  <text x="238" y="88" fill="#d8dee9" font-family="sans-serif" font-size="9" text-anchor="middle">reads WAL, emits events</text>
  <!-- Arrow 2 -->
  <path d="M 298 76 L 343 76" stroke="#88c0d0" stroke-width="2" fill="none" marker-end="url(#arr2)"/>
  <defs>
    <marker id="arr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#88c0d0"/>
    </marker>
  </defs>
  <!-- Kafka -->
  <rect x="346" y="50" width="110" height="52" rx="6" fill="#3b4252" stroke="#81a1c1" stroke-width="1"/>
  <text x="401" y="72" fill="#d8dee9" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">Kafka</text>
  <text x="401" y="88" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">change event stream</text>
  <!-- Consumers branching out -->
  <path d="M 456 65 L 510 50" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#arr3)"/>
  <path d="M 456 76 L 510 76" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#arr4)"/>
  <path d="M 456 88 L 510 102" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#arr5)"/>
  <defs>
    <marker id="arr3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#a3be8c"/>
    </marker>
    <marker id="arr4" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#a3be8c"/>
    </marker>
    <marker id="arr5" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#a3be8c"/>
    </marker>
  </defs>
  <rect x="513" y="36" width="68" height="24" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1"/>
  <text x="547" y="52" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Elasticsearch</text>
  <rect x="513" y="64" width="68" height="24" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1"/>
  <text x="547" y="80" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Data warehouse</text>
  <rect x="513" y="92" width="68" height="24" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1"/>
  <text x="547" y="108" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Cache eviction</text>
  <!-- Bottom note -->
  <text x="300" y="160" fill="#4c566a" font-family="sans-serif" font-size="9" text-anchor="middle">No polling. Every insert, update, and delete flows through as an event.</text>
  <text x="300" y="175" fill="#4c566a" font-family="sans-serif" font-size="9" text-anchor="middle">Consumers are decoupled — adding a new one doesn't change the database or Debezium config.</text>
</svg>

---

## What a CDC Event Looks Like

Each event carries the operation type and the full row data before and after the change. A Debezium event for an updated user might look like:

```json
{
  "op": "u",
  "before": { "id": 42, "email": "alice@old.com" },
  "after":  { "id": 42, "email": "alice@new.com" },
  "source": { "table": "users", "lsn": 190234 }
}
```

Consumers subscribe to the topic for their table and react however they need: reindex the document, invalidate a cache key, update a replica in another region.

---

## Common Use Cases

**Search index sync**: Keep Elasticsearch or Algolia in sync with your database without dual-writes or polling. Every row change flows into the search index automatically.

**Data warehouse replication**: Stream production database changes into a data warehouse (Snowflake, BigQuery) for analytics. No nightly batch jobs.

**Cache invalidation**: When a row updates, immediately evict the corresponding cache key. More reliable than TTL-based expiry.

**Audit logs**: Record every change to sensitive data (user records, payment data) in a tamper-evident log, without modifying the application code.

**Cross-service sync**: In a microservices architecture, one service's database changes can trigger updates in another service's own database, without the two services coupling directly to each other.

---

## The Transactional Outbox Pattern

A related pattern worth knowing: sometimes you want to write to your database *and* publish a message to a queue atomically. If the service crashes between the two, you end up in an inconsistent state.

The [Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html) pattern solves this by writing the message into an `outbox` table in the same database transaction as your main write. A CDC consumer then reads the outbox table and publishes to the message queue. Since everything lives in the same database transaction, it is either all committed or all rolled back.

---

## Tools

[Debezium](https://debezium.io/) is the most widely used open-source CDC connector, built on top of Kafka Connect. [AWS DMS](https://aws.amazon.com/dms/) (Database Migration Service) supports CDC for migrations. [PlanetScale's Vitess](https://vitess.io/) has built-in CDC. For Postgres specifically, the `pg_logical` extension and `pgoutput` plugin power most CDC implementations.

---

## Further Reading

- [Change Data Capture explained (Confluent)](https://www.confluent.io/learn/change-data-capture/) — Confluent's overview of CDC patterns and Kafka integration
- [Debezium documentation](https://debezium.io/documentation/) — how to set up CDC from Postgres, MySQL, or MongoDB
- [The Transactional Outbox pattern](https://microservices.io/patterns/data/transactional-outbox.html) — atomically combining a database write with an event publication
- [Postgres WAL explained](https://www.crunchydata.com/blog/what-is-a-postgresql-wal) — Crunchy Data's explanation of how Postgres's write-ahead log works
