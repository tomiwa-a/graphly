---
title: Database Indexes
slug: indexes
summary: "How indexes speed up database queries and the storage and write-performance tradeoffs they introduce."
difficulty: intermediate
chapterId: databases
domain: Databases
estimatedMinutes: 12
prerequisites: [http]
related: [caching-strategies]
seo_title: "Database Indexes: B-Trees, Query Performance, and Tradeoffs"
seo_description: "Learn how database indexes work under the hood — B-trees, composite indexes, query planning, and the read/write performance tradeoffs every backend engineer must understand."
canonical_url: "https://graphy.dev/concepts/indexes"
code_examples:
  - language: TypeScript
    title: Prisma index definition
    code: |
      model User {
        id    String @id @default(uuid())
        email String @unique
        name  String

        @@index([email])
        @@index([name, email])  // composite
      }
  - language: Go
    title: SQL index creation
    code: |
      _, err := db.Exec(`
        CREATE INDEX CONCURRENTLY idx_users_email
        ON users (email);

        CREATE INDEX idx_orders_user_date
        ON orders (user_id, created_at DESC);
      `)
---

## What it is

A database index is a data structure (usually a B-tree) that allows the database to find rows without scanning the entire table. It works like the index at the back of a textbook — instead of reading every page, you look up the topic and jump to the right page.

## Why it matters

Without indexes, every query scans every row in the table (a full table scan). On a table with millions of rows, this is catastrophically slow. A well-placed index turns a 5-second query into a 5-millisecond query.

## How it works

When you create an index on a column, the database builds a sorted data structure pointing to the rows. For a B-tree index, lookups are O(log n). Composite indexes cover multiple columns and support queries that filter on those columns in order.

## Production concerns

Every index slows down writes because the database must update the index on every INSERT, UPDATE, and DELETE. Indexes consume disk space. Too many indexes degrade write performance. Use EXPLAIN ANALYZE to verify your queries actually use the indexes you create.

## Common mistakes

Indexing every column "just in case." Creating composite indexes in the wrong column order. Not analyzing query plans to verify index usage. Forgetting that indexes on low-cardinality columns (like boolean flags) are usually useless.
