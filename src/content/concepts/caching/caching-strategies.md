---
title: Caching Strategies
slug: caching-strategies
summary: "Improving performance with cache-aside, write-through, and CDN patterns to reduce load on databases."
difficulty: intermediate
chapterId: caching
domain: Caching
estimatedMinutes: 16
prerequisites: [http, indexes, bloom-filters]
related: [idempotency, message-queues]
seo_title: "Caching Strategies: Cache-Aside, Write-Through, and CDN Patterns"
seo_description: "Master caching strategies — cache-aside, write-through, write-behind, and CDN caching. Learn TTL management, invalidation, and cache stampede prevention."
canonical_url: "https://graphy.dev/concepts/caching-strategies"
code_examples:
  - language: TypeScript
    title: Cache-aside with Redis
    code: |
      async function getUser(id: string): Promise<User> {
        // 1. Check cache
        const cached = await redis.get(`user:${id}`);
        if (cached) return JSON.parse(cached);

        // 2. Cache miss - fetch from DB
        const user = await db.users.findUnique({ where: { id } });
        if (!user) throw new NotFoundError();

        // 3. Populate cache with TTL
        await redis.setex(`user:${id}`, 3600, JSON.stringify(user));
        return user;
      }

      // Invalidate on write
      async function updateUser(id: string, data: Partial<User>) {
        await db.users.update({ where: { id }, data });
        await redis.del(`user:${id}`);  // bust cache
      }
  - language: Go
    title: Cache-aside pattern
    code: |
      func GetUser(ctx context.Context, id string) (*User, error) {
          // Check cache
          cached, err := rdb.Get(ctx, "user:"+id).Result()
          if err == nil {
              var u User
              json.Unmarshal([]byte(cached), &u)
              return &u, nil
          }

          // Cache miss
          u, err := db.QueryUser(ctx, id)
          if err != nil {
              return nil, err
          }

          // Populate cache (1 hour TTL)
          data, _ := json.Marshal(u)
          rdb.Set(ctx, "user:"+id, data, time.Hour)
          return u, nil
      }
  - language: Python
    title: Redis caching decorator
    code: |
      import redis
      import json
      from functools import wraps

      r = redis.Redis()

      def cached(ttl=3600):
          def decorator(fn):
              @wraps(fn)
              def wrapper(*args, **kwargs):
                  key = f"{fn.__name__}:{args}:{kwargs}"
                  hit = r.get(key)
                  if hit:
                      return json.loads(hit)
                  result = fn(*args, **kwargs)
                  r.setex(key, ttl, json.dumps(result))
                  return result
              return wrapper
          return decorator

      @cached(ttl=1800)
      def get_user(user_id):
          return db.query("SELECT * FROM users WHERE id=%s", user_id)
---

## What it is

Caching stores frequently accessed data in a fast layer (memory, Redis, CDN) so you don't hit the slower layer (database, external API) on every request. The right caching strategy depends on your read/write ratio and data consistency requirements.

## Why it matters

A database query might take 50ms. A Redis lookup takes 1ms. For data that's read 1000x more often than it's written, caching eliminates 99.9% of database load. At scale, caching is the difference between a system that handles 100 req/s and one that handles 100,000 req/s.

## How it works

Cache-aside: application checks cache first, fetches from DB on miss, writes to cache. Write-through: writes go to cache and DB simultaneously. Write-behind: writes go to cache immediately, DB is updated asynchronously. Each pattern has different consistency and performance characteristics.

## Production concerns

Cache invalidation is one of the hardest problems in CS. Set appropriate TTLs. Use cache stampede prevention (locking or stale-while-revalidate). Monitor cache hit rates — below 80% usually means your cache isn't helping. Plan for cache failures — your app should degrade gracefully, not crash.

## Common mistakes

Caching everything regardless of access pattern. Setting TTLs too long (stale data) or too short (no benefit). Not handling cache invalidation on writes. Caching user-specific data with shared keys. Not monitoring hit/miss ratios.
