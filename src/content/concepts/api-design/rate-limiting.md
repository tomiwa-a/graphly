---
title: Rate Limiting
slug: rate-limiting
summary: "Understand API rate limiting: Token Bucket, Leaky Bucket, Sliding Window algorithms, distributed synchronization, and HTTP client signaling."
difficulty: intermediate
chapterId: api-design
domain: API Design
estimatedMinutes: 12
prerequisites: [http]
related: [caching-strategies, circuit-breakers]
seo_title: "API Rate Limiting Algorithms and Architectures | Graphly"
seo_description: "Deep dive into API rate limiting: Token Bucket, Leaky Bucket, Sliding Window Counter, distributed Redis implementations, and HTTP client metadata headers."
canonical_url: "/concepts/rate-limiting"
citations:
  - title: "Computer Networks"
    author: "Andrew S. Tanenbaum and David J. Wetherall"
    chapter: "Chapter 5: The Network Layer - Traffic Shaping (Token and Leaky Buckets)"
    page_range: "394-400"
    external_link: "https://www.pearson.com/en-us/subject-catalog/p/computer-networks/P200000003233"
code_examples:
  - language: python
    title: Atomic Sliding Window Counter via Redis Lua Scripting
    code: |
      import time
      import redis

      class RedisSlidingWindowRateLimiter:
          def __init__(self, redis_client: redis.Redis, window_size: int, limit: int):
              self.redis = redis_client
              self.window_size = window_size  # Window duration in seconds
              self.limit = limit              # Maximum allowed requests per window
              
              # Lua script executed atomically inside the Redis engine
              self.lua_script = """
              local key = KEYS[1]
              local now = tonumber(ARGV[1])
              local window = tonumber(ARGV[2])
              local limit = tonumber(ARGV[3])
              local clear_before = now - window

              -- 1. Remove requests that have slid out of the current window
              redis.call('ZREMRANGEBYSCORE', key, 0, clear_before)

              -- 2. Count active request timestamps remaining in the window
              local current_requests = redis.call('ZCARD', key)

              if current_requests < limit then
                  -- 3. Register current request timestamp in the sorted set
                  redis.call('ZADD', key, now, now)
                  
                  -- 4. Refresh key TTL to clean up idle user data automatically
                  redis.call('EXPIRE', key, window)
                  
                  return {1, limit - current_requests - 1} -- Allowed (1), remaining capacity
              else
                  return {0, 0} -- Denied (0), remaining capacity 0
              end
              """
              self.register_script = self.redis.register_script(self.lua_script)

          def is_allowed(self, user_id: str) -> tuple[bool, int]:
              key = f"rate_limit:{user_id}"
              now = time.time()
              
              # Execute the Lua script atomically
              allowed, remaining = self.register_script(
                  keys=[key],
                  args=[now, self.window_size, self.limit]
              )
              return bool(allowed), remaining

      # Example usage:
      # r = redis.Redis(host='localhost', port=6379, db=0)
      # limiter = RedisSlidingWindowRateLimiter(r, window_size=60, limit=100)
      # allowed, remaining_calls = limiter.is_allowed("user_98765")
---

## Why Rate Limit?

In web infrastructure, APIs must handle fluctuating traffic volumes. An unexpected surge in requests can consume server threads, exhaust database connections, and degrade performance for all users. **Rate limiting** is the architectural pattern of throttling the rate of incoming requests to protect backend resources.

We rate limit APIs for three primary reasons:
* **Denial of Service (DoS) Mitigation**: Prevents malicious actors or buggy clients from executing volumetric resource exhaustion attacks against endpoints.
* **API Monetization**: Enforces usage boundaries for tiered pricing models, restricting basic accounts while allocating higher capacity to premium users.
* **Resource Preservation**: Protects downstream dependencies, such as third-party payment gateways, from being overwhelmed by app-side spikes.

Rate limiting works by inspecting request metadata (such as IP addresses, authorization tokens, or API keys), evaluating usage history against a tracking algorithm, and either allowing the request or rejecting it.

---

## The Token Bucket Algorithm

The **Token Bucket** algorithm is a widely used rate limiting strategy that permits traffic bursts up to a defined limit.

The algorithm uses a simple analogy:
Imagine a self-serve bakery where customers must grab a physical ticket (token) from a dispenser to buy bread.
* The ticket dispenser has a maximum capacity `B`.
* A timer adds new tickets to the dispenser at a constant rate of `r` tokens per second.
* When a customer arrives, they try to pull a ticket. If a ticket is available, they proceed with their purchase.
* If a line forms, customers consume tickets immediately, allowing a sudden burst of sales until the dispenser is empty.
* If no tickets are left, customers are turned away until the dispenser generates a new ticket.

```
token_count = min(capacity, token_count + rate * elapsed_time)
```

If a client makes a request and the current `token_count` is at least `1`, the controller decrements the count by `1` and allows the request. If the count is `0`, the request is blocked.

This algorithm allows apps to handle transient traffic spikes gracefully: if a user is idle, their bucket fills to capacity, allowing them to make a burst of requests immediately when they return.

---

## The Leaky Bucket Algorithm

The **Leaky Bucket** algorithm smooths out traffic bursts, transmitting requests at a strictly constant rate.

This algorithm can be compared to a queue line at an amusement park ride:
* Customers enter a staging queue (the bucket) of maximum capacity `Q`.
* Customers arrive in random clumps and bursts, piling into the queue.
* At the exit of the queue, a turnstile lets exactly one customer through to the ride every 5 seconds (constant leak rate `L`).
* If the staging queue fills to capacity, subsequent customers are immediately rejected.

Unlike the Token Bucket, which allows bursts to exhaust tokens instantly, the Leaky Bucket forces all requests through a first-in, first-out (FIFO) queue. The queue leaks requests to the backend at a uniform rate. This makes the Leaky Bucket ideal for traffic-shaping configurations where downstream services require a highly predictable, flat request volume.

---

## Fixed Window vs Sliding Window Algorithms

Runtimes can track request limits using window-based counting algorithms.

### Fixed Window Counter
The **Fixed Window Counter** partition time into static windows (e.g., 1-minute blocks from 12:00 to 12:01). Every request increments a counter associated with the current window. Once the counter hits the limit, all subsequent requests are blocked until the next window boundary begins.

This algorithm has a major flaw: the **double-dipping spike**. 
If a user is allowed 10 requests per minute, they can transmit 10 requests at 12:00:59, wait one second for the window to reset at 12:01:00, and transmit 10 more requests immediately. This allows the user to execute 20 requests in a 2-second window, bypassing the intended limit.

### Sliding Window Log
The **Sliding Window Log** resolves this by storing a sorted log of request timestamps for each user. When a request arrives, the algorithm:
1. Deletes all timestamps older than `now - window_width`.
2. Counts the remaining timestamps in the log.
3. If the count is less than the limit, appends the current timestamp to the log and allows the request.

* **Pros**: Extremely precise, eliminating the double-dipping vulnerability.
* **Cons**: Storing individual timestamps for millions of active users consumes a significant amount of memory.

### Sliding Window Counter
The **Sliding Window Counter** combines the low memory foot-print of Fixed Window with the precision of Sliding Log. It stores only the request counts of the current and preceding windows. When a request arrives, the algorithm computes a weighted sum of requests over the rolling window:

```
Requests = (Preceding_Count * (1 - ratio)) + Current_Count
```

Here, `ratio` is the progress percentage through the current window. If this calculated sum is below the limit, the current window's count is incremented.

---

## Distributed Rate Limiting and Race Conditions

When scaling an application horizontally across multiple server nodes, rate limiting state must be stored in a centralized cache like Redis. A naive implementation can suffer from **race conditions** (specifically, read-modify-write conflicts).

If two server instances concurrently evaluate a user's rate limit:
1. Both read the user's current token count (e.g., 1 token left).
2. Both confirm the request is allowed.
3. Both write back a decremented token count of `0`.

The user has successfully executed two requests, even though only one token remained.

### Atomic Redis Lua Scripting
To prevent these conflicts, systems execute rate-limiting logic inside **Redis Lua scripts**. Redis runs Lua scripts atomically on its main execution thread. No other commands can run while the script is executing, ensuring that the read, calculation, and write steps are performed as a single, atomic operation without distributed locking overhead.

---

## HTTP Headers and Client Signaling

When a request is blocked by a rate limiter, the server must communicate this status to the client using standardized HTTP protocols:

* **HTTP Status Code**: The server returns `429 Too Many Requests`.
* **Retry-After**: A header indicating how many seconds the client must wait before retrying (e.g., `Retry-After: 30`).

Additionally, servers include metadata headers on successful responses to help clients manage their rate of requests:
* `X-RateLimit-Limit`: The maximum number of allowed requests in the current window.
* `X-RateLimit-Remaining`: The number of remaining requests the client can make in the current window.
* `X-RateLimit-Reset`: The Unix epoch timestamp indicating when the current window resets.

---

## System Performance Trade-offs

Choosing a rate limiting architecture requires evaluating trade-offs between memory overhead, CPU performance, and precision:

| Algorithm | Memory Cost | CPU Complexity | Spiky Traffic Support | Implementation Complexity |
|---|---|---|---|---|
| **Token Bucket** | Low (2 variables per key) | `O(1)` (lazy updates) | Yes (bursts up to `B`) | Low |
| **Leaky Bucket** | Medium (FIFO Queue space) | `O(1)` | No (forces smooth flow) | Medium |
| **Fixed Window** | Low (1 counter per key) | `O(1)` | Yes (allows double-dipping) | Low |
| **Sliding Log** | High (list of timestamps) | `O(N)` (unbounded logs) | Yes (highly precise) | High |
| **Sliding Counter** | Low (2 variables per key) | `O(1)` | Yes (weighted math) | Medium |

<svg viewBox="0 0 580 340" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="24" fill="#88c0d0" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Comparison of Key Rate Limiting Algorithms</text>
  <rect x="20" y="45" width="165" height="230" rx="6" fill="#2e3440" stroke="#88c0d0" stroke-width="1.5"/>
  <text x="102" y="65" fill="#88c0d0" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">Token Bucket</text>
  <rect x="30" y="80" width="145" height="70" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="102" y="100" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Tokens fill at rate 'r'</text>
  <text x="102" y="115" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle">Max capacity limit 'B'</text>
  <text x="102" y="130" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Requests consume tokens</text>
  <rect x="30" y="160" width="145" height="100" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="102" y="180" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Spiky Bursts: Allowed</text>
  <text x="102" y="195" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Idle Accumulation: Yes</text>
  <text x="102" y="210" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Memory: Low</text>
  <text x="102" y="225" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">CPU: O(1) lazy math</text>
  <rect x="207" y="45" width="165" height="230" rx="6" fill="#2e3440" stroke="#ebcb8b" stroke-width="1.5"/>
  <text x="290" y="65" fill="#ebcb8b" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">Leaky Bucket</text>
  <rect x="217" y="80" width="145" height="70" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="290" y="100" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Requests join queue 'Q'</text>
  <text x="290" y="115" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Steady leak rate 'L'</text>
  <text x="290" y="130" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle">Overflow: Discarded</text>
  <rect x="217" y="160" width="145" height="100" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="290" y="180" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Spiky Bursts: Throttled</text>
  <text x="290" y="195" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Idle Accumulation: No</text>
  <text x="290" y="210" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Memory: Medium</text>
  <text x="290" y="225" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">CPU: O(1) queue shift</text>
  <rect x="395" y="45" width="165" height="230" rx="6" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="477" y="65" fill="#a3be8c" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">Sliding Counter</text>
  <rect x="405" y="80" width="145" height="70" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="477" y="100" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Current window count</text>
  <text x="477" y="115" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Preceding window count</text>
  <text x="477" y="130" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Weighted rolling sum</text>
  <rect x="405" y="160" width="145" height="100" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="477" y="180" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Spiky Bursts: Controlled</text>
  <text x="477" y="195" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Idle Accumulation: No</text>
  <text x="477" y="210" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Memory: Low</text>
  <text x="477" y="225" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">CPU: O(1) math only</text>
  <rect x="20" y="295" width="540" height="30" rx="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="290" y="313" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Token Bucket allows instant bursts; Leaky Bucket flattens traffic flow; Sliding Counter balances accuracy and memory cost.</text>
</svg>

---

## Further Reading

* [Computer Networks](https://www.pearson.com/en-us/subject-catalog/p/computer-networks/P200000003233) — Classic networks textbook chapter outlining token and leaky bucket logic.
* [RFC 6585: Additional HTTP Status Codes](https://datatracker.ietf.org/doc/html/rfc6585) — The official IETF RFC establishing status code `429 Too Many Requests`.
* [Redis Rate Limiter Pattern](https://redis.io/commands/incr/#pattern-rate-limiter) — Guide on atomic operations for counter-based rate limit patterns.
* [Scaling Rate Limiting at Stripe](https://stripe.com/blog/rate-limiters) — Engineering write-up on real-world multi-tier distributed rate limiter configurations.
