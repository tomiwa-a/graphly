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
canonical_url: "/concepts/caching-strategies"
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

## What It Is

Caching stores frequently accessed data in a fast, temporary storage layer (usually RAM or edge servers) so you do not hit the slower, authoritative storage layer (databases or disk files) on every request.

The right caching strategy depends on your read-to-write ratio, data consistency requirements, and latency thresholds.

---

## Caching Topologies

<svg viewBox="0 0 580 340" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="24" fill="#88c0d0" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Three Common Caching Topologies</text>
  
  <!-- Cache-Aside (Lazy Load) -->
  <text x="100" y="55" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">1. Cache-Aside (Lazy)</text>
  <rect x="30" y="70" width="140" height="65" rx="5" fill="#2e3440" stroke="#88c0d0"/>
  <text x="100" y="86" fill="#88c0d0" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">App checks cache first</text>
  <text x="100" y="98" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">On Miss: reads from DB,</text>
  <text x="100" y="110" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">writes back to cache,</text>
  <text x="100" y="122" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">and returns data.</text>

  <!-- Write-Through -->
  <text x="290" y="55" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">2. Write-Through</text>
  <rect x="220" y="70" width="140" height="65" rx="5" fill="#2e3440" stroke="#ebcb8b"/>
  <text x="290" y="86" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">Synchronous double-write</text>
  <text x="290" y="98" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">App writes to cache</text>
  <text x="290" y="110" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">AND database in one</text>
  <text x="290" y="122" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">transaction before ack.</text>

  <!-- Write-Behind (Write-Back) -->
  <text x="480" y="55" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">3. Write-Behind (Async)</text>
  <rect x="410" y="70" width="140" height="65" rx="5" fill="#2e3440" stroke="#a3be8c"/>
  <text x="480" y="86" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">Asynchronous write</text>
  <text x="480" y="98" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">App writes to cache,</text>
  <text x="480" y="110" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">acks client immediately.</text>
  <text x="480" y="122" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">Queue updates DB later.</text>

  <!-- Diagram Flow -->
  <rect x="30" y="210" width="60" height="30" rx="4" fill="#2e3440" stroke="#88c0d0"/>
  <text x="60" y="228" fill="#d8dee9" font-family="sans-serif" font-size="10" text-anchor="middle">App</text>
  
  <rect x="250" y="210" width="80" height="30" rx="4" fill="#2e3440" stroke="#ebcb8b"/>
  <text x="290" y="228" fill="#d8dee9" font-family="sans-serif" font-size="10" text-anchor="middle">Cache (Redis)</text>
  
  <rect x="470" y="210" width="80" height="30" rx="4" fill="#2e3440" stroke="#bf616a"/>
  <text x="510" y="228" fill="#d8dee9" font-family="sans-serif" font-size="10" text-anchor="middle">Database</text>

  <!-- Flow lines for Cache-Aside read miss -->
  <path d="M 90 220 L 250 220" stroke="#88c0d0" stroke-width="1.5" marker-end="url(#arr-blue)"/>
  <text x="170" y="212" fill="#88c0d0" font-family="sans-serif" font-size="8" text-anchor="middle">1. Read (Miss)</text>
  
  <path d="M 60 240 C 150 310, 380 310, 470 235" stroke="#bf616a" stroke-width="1.5" fill="none" marker-end="url(#arr-red)"/>
  <text x="260" y="295" fill="#bf616a" font-family="sans-serif" font-size="8" text-anchor="middle">2. Fetch from DB</text>

  <path d="M 470 220 L 330 220" stroke="#a3be8c" stroke-width="1.5" marker-end="url(#arr-green)"/>
  <text x="400" y="212" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">3. Write to cache</text>

  <defs>
    <marker id="arr-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#88c0d0"/>
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

### 1. Cache-Aside (Lazy Loading)
The most common approach: the application coordinates reads and writes.
* **Read flow**: App checks the cache. On a hit, it returns the data. On a miss, it reads from the database, populates the cache, and returns.
* **Write flow**: App updates the database directly and invalidates (deletes) the cached entry.
* **Pros**: Cache only contains requested data; database failures do not break the whole application.
* **Cons**: Three round-trips on a cache miss; stale data if writes bypass the application.

### 2. Write-Through
The application treats the cache as the main data store.
* **Read flow**: Same as cache-aside (or managed directly by the cache layer).
* **Write flow**: When data is updated, the app writes to the cache, and the cache synchronously writes to the database. The write completes only after both succeed.
* **Pros**: Data is never stale; read path is fast.
* **Cons**: High write latency; many unused keys fill up cache memory.

### 3. Write-Behind (Write-Back)
An asynchronous write topology.
* **Write flow**: The application writes to the cache, which immediately acknowledges success. A background queue or worker asynchronously flushes the modifications to the database.
* **Pros**: Incredible write performance; buffers database write bursts.
* **Cons**: Risk of data loss if the cache crashes before flushing; eventual consistency challenges.

---

## Production Concerns

### 1. Cache Stampede (Thundering Herd)
A cache stampede occurs when a high-traffic key expires. If 1,000 concurrent requests arrive for `user:1001` at the same microsecond and find a cache miss, all 1,000 requests will hit the database to calculate or query the same data.

**Solutions**:
* **Mutex Locks (Single Flight)**: Use a lock to ensure only the first request queries the database. Subsequent requests wait for the lock and read from the newly populated cache.
* **Probabilistic Early Expiration**: Background workers regenerate the cached value before it actually expires based on request probability.
* **Soft Expiration (Stale-While-Revalidate)**: Return the expired value to clients while fetching the new value in the background.

### 2. Cache Invalidation
Deciding when to expire data is the hardest problem in caching.
* **TTL (Time to Live)**: A timer set on each key. When the timer expires, the key is removed. Essential to prevent permanent memory bloat.
* **Active Invalidation**: Explicitly deleting the cache key whenever a write or delete occurs in the primary database.

---

## Cache Eviction Policies

When the cache memory limits are reached, the system must drop old keys to make room for new ones.

| Policy | Name | Logic | Best Use Case |
|---|---|---|---|
| **LRU** | Least Recently Used | Drops the key that has not been accessed for the longest time | General purpose, default for Redis |
| **LFU** | Least Frequently Used | Drops the key with the lowest hit counter | Popular items (e.g. static homepage assets) |
| **FIFO** | First In, First Out | Drops the oldest key, regardless of hits | Time-series or sequential logs |
| **Random** | Random Eviction | Drops keys completely at random | Low overhead, simple datasets |

---

## Further Reading

* [Caching Strategies and Best Practices — AWS Documentation](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Strategies.html) — Extensive guide on lazy loading vs write-through caching
* [Preventing Cache Stampedes with Redis](https://redis.io/blog/preventing-cache-stampede-with-redis/) — Practical strategies for locking and probabilistic early expiration
* [Things You Should Know About Caching — HashedOut](https://www.ehcache.org/documentation/3.10/about.html) — Technical foundations of cache design
* [LRU Eviction Algorithm Explained](https://medium.com/@krishankantsinghal/my-first-post-on-medium-lru-cache-design-implementation-a6e5a420b784) — How LRU works under the hood using a doubly-linked list and a hash map
