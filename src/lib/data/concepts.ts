export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface CodeExample {
  language: string;
  title: string;
  code: string;
}

export interface ConceptSection {
  id: string;
  title: string;
  content: string;
}

export interface Concept {
  slug: string;
  title: string;
  summary: string;
  difficulty: Difficulty;
  domain: string;
  estimatedMinutes: number;
  prerequisites: string[];
  related: string[];
  sections: ConceptSection[];
  codeExamples: CodeExample[];
}

export const concepts: Concept[] = [
  {
    slug: "idempotency",
    title: "Idempotency",
    summary:
      "Making repeated operations safe by ensuring the same request produces the same result no matter how many times it's executed.",
    difficulty: "intermediate",
    domain: "API Design",
    estimatedMinutes: 15,
    prerequisites: ["http"],
    related: ["message-queues", "circuit-breakers"],
    sections: [
      {
        id: "what-it-is",
        title: "What it is",
        content:
          "An operation is idempotent if performing it multiple times has the same effect as performing it once. HTTP GET, PUT, and DELETE are idempotent by design. POST is not — sending the same POST twice may create two resources.",
      },
      {
        id: "why-it-matters",
        title: "Why it matters",
        content:
          "Networks are unreliable. Clients retry requests when they don't get a response. Without idempotency, a retried payment request could charge a customer twice. Idempotency keys let servers detect duplicate requests and return the original result.",
      },
      {
        id: "mental-model",
        title: "Mental model",
        content:
          "Think of an elevator button. Pressing it once calls the elevator. Pressing it five more times doesn't call five elevators — the result is the same. That's idempotency.",
      },
      {
        id: "how-it-works",
        title: "How it works",
        content:
          "The client generates a unique idempotency key (usually a UUID) and sends it with the request. The server checks if it has seen this key before. If yes, it returns the stored response. If no, it processes the request, stores the result keyed by the idempotency key, and returns the response.",
      },
      {
        id: "production-concerns",
        title: "Production concerns",
        content:
          "Store idempotency keys in a database with a TTL (e.g., 24 hours). Use database constraints to prevent race conditions. Consider what happens if the original request failed — should retries re-attempt or return the error?",
      },
      {
        id: "common-mistakes",
        title: "Common mistakes",
        content:
          "Using session IDs or user IDs as idempotency keys (not unique per request). Forgetting to handle partial failures. Not setting a TTL on stored keys, causing unbounded storage growth.",
      },
    ],
    codeExamples: [
      {
        language: "Go",
        title: "Idempotent API handler",
        code: `func CreatePayment(w http.ResponseWriter, r *http.Request) {
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
}`,
      },
      {
        language: "Python",
        title: "Idempotent endpoint with Flask",
        code: `from flask import Flask, request, jsonify
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
    return jsonify(result), 201`,
      },
      {
        language: "TypeScript",
        title: "Express idempotency middleware",
        code: `const idempotency = new Map<string, unknown>();

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
});`,
      },
    ],
  },
  {
    slug: "indexes",
    title: "Database Indexes",
    summary:
      "How indexes speed up database queries and the storage and write-performance tradeoffs they introduce.",
    difficulty: "intermediate",
    domain: "Databases",
    estimatedMinutes: 12,
    prerequisites: ["http"],
    related: ["caching-strategies"],
    sections: [
      {
        id: "what-it-is",
        title: "What it is",
        content:
          "A database index is a data structure (usually a B-tree) that allows the database to find rows without scanning the entire table. It works like the index at the back of a textbook — instead of reading every page, you look up the topic and jump to the right page.",
      },
      {
        id: "why-it-matters",
        title: "Why it matters",
        content:
          "Without indexes, every query scans every row in the table (a full table scan). On a table with millions of rows, this is catastrophically slow. A well-placed index turns a 5-second query into a 5-millisecond query.",
      },
      {
        id: "how-it-works",
        title: "How it works",
        content:
          "When you create an index on a column, the database builds a sorted data structure pointing to the rows. For a B-tree index, lookups are O(log n). Composite indexes cover multiple columns and support queries that filter on those columns in order.",
      },
      {
        id: "production-concerns",
        title: "Production concerns",
        content:
          "Every index slows down writes because the database must update the index on every INSERT, UPDATE, and DELETE. Indexes consume disk space. Too many indexes degrade write performance. Use EXPLAIN ANALYZE to verify your queries actually use the indexes you create.",
      },
      {
        id: "common-mistakes",
        title: "Common mistakes",
        content:
          "Indexing every column 'just in case.' Creating composite indexes in the wrong column order. Not analyzing query plans to verify index usage. Forgetting that indexes on low-cardinality columns (like boolean flags) are usually useless.",
      },
    ],
    codeExamples: [
      {
        language: "TypeScript",
        title: "Prisma index definition",
        code: `model User {
  id    String @id @default(uuid())
  email String @unique
  name  String

  @@index([email])
  @@index([name, email])  // composite
}`,
      },
      {
        language: "Go",
        title: "SQL index creation",
        code: `_, err := db.Exec(\`
  CREATE INDEX CONCURRENTLY idx_users_email
  ON users (email);

  CREATE INDEX idx_orders_user_date
  ON orders (user_id, created_at DESC);
\`)`,
      },
    ],
  },
  {
    slug: "circuit-breakers",
    title: "Circuit Breakers",
    summary:
      "Preventing cascading failures by detecting and isolating faulting downstream services.",
    difficulty: "advanced",
    domain: "Reliability",
    estimatedMinutes: 18,
    prerequisites: ["http", "idempotency"],
    related: ["message-queues", "caching-strategies"],
    sections: [
      {
        id: "what-it-is",
        title: "What it is",
        content:
          "A circuit breaker monitors calls to a downstream service. When failures exceed a threshold, it 'trips' and stops sending requests for a cooldown period. This prevents a failing service from taking down the entire system.",
      },
      {
        id: "why-it-matters",
        title: "Why it matters",
        content:
          "When Service A calls Service B and B is down, A's threads pile up waiting for timeouts. If A has 100 concurrent requests and each waits 30 seconds, A is effectively dead too. A circuit breaker fails fast, freeing resources.",
      },
      {
        id: "how-it-works",
        title: "How it works",
        content:
          "Three states: CLOSED (normal, requests pass through), OPEN (tripped, requests fail immediately), HALF-OPEN (testing, a few requests allowed to check if the downstream has recovered). Track failure counts in a sliding window. Trip when failures exceed the threshold.",
      },
      {
        id: "production-concerns",
        title: "Production concerns",
        content:
          "Choose thresholds carefully — too sensitive and you trip on transient errors, too lenient and you don't protect fast enough. Add fallback responses when the circuit is open. Log state transitions for observability. Consider per-endpoint circuit breakers.",
      },
      {
        id: "common-mistakes",
        title: "Common mistakes",
        content:
          "Using a single global circuit breaker for all downstream services. Not implementing a fallback response. Setting the cooldown period too short, causing rapid open/close oscillation. Not monitoring circuit breaker state in dashboards.",
      },
    ],
    codeExamples: [
      {
        language: "Go",
        title: "Circuit breaker with gobreaker",
        code: `import "github.com/sony/gobreaker"

cb := gobreaker.NewCircuitBreaker(gobreaker.Settings{
    Name:        "payment-service",
    MaxRequests: 3,              // half-open test requests
    Interval:    10 * time.Second, // sliding window
    Timeout:     30 * time.Second, // open → half-open
    ReadyToTrip: func(counts gobreaker.Counts) bool {
        return counts.ConsecutiveFailures > 5
    },
})

result, err := cb.Execute(func() (interface{}, error) {
    return callPaymentService()
})`,
      },
      {
        language: "TypeScript",
        title: "Simple circuit breaker class",
        code: `class CircuitBreaker {
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
}`,
      },
    ],
  },
  {
    slug: "http",
    title: "HTTP",
    summary:
      "The foundation of web communication — methods, status codes, headers, and the request/response lifecycle.",
    difficulty: "beginner",
    domain: "Foundations",
    estimatedMinutes: 10,
    prerequisites: [],
    related: ["idempotency", "caching-strategies"],
    sections: [
      {
        id: "what-it-is",
        title: "What it is",
        content:
          "HTTP (HyperText Transfer Protocol) is the protocol that powers the web. Every time your browser loads a page, submits a form, or calls an API, it uses HTTP. It's a stateless request/response protocol: a client sends a request, a server sends back a response.",
      },
      {
        id: "why-it-matters",
        title: "Why it matters",
        content:
          "Everything in backend engineering sits on top of HTTP. REST APIs, GraphQL, webhooks, health checks, authentication flows — they all use HTTP. Understanding methods, status codes, and headers is foundational to building any web service.",
      },
      {
        id: "how-it-works",
        title: "How it works",
        content:
          "A client opens a TCP connection to a server and sends a request with a method (GET, POST, PUT, DELETE), a path (/users/123), headers (Content-Type, Authorization), and optionally a body. The server processes the request and responds with a status code (200, 404, 500), headers, and a body.",
      },
      {
        id: "production-concerns",
        title: "Production concerns",
        content:
          "Use HTTPS in production (TLS encryption). Set appropriate timeouts on both client and server. Understand keep-alive connections and connection pooling. Use correct status codes — don't return 200 for errors. Set Content-Type headers correctly.",
      },
      {
        id: "common-mistakes",
        title: "Common mistakes",
        content:
          "Using GET for operations with side effects. Returning 200 with an error message in the body. Ignoring HTTP caching headers. Not setting timeouts, leading to hanging connections. Using POST for everything instead of appropriate methods.",
      },
    ],
    codeExamples: [
      {
        language: "Go",
        title: "HTTP server and handler",
        code: `func main() {
    http.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {
        switch r.Method {
        case http.MethodGet:
            w.Header().Set("Content-Type", "application/json")
            json.NewEncoder(w).Encode(users)
        case http.MethodPost:
            var u User
            json.NewDecoder(r.Body).Decode(&u)
            users = append(users, u)
            w.WriteHeader(http.StatusCreated)
            json.NewEncoder(w).Encode(u)
        default:
            w.WriteHeader(http.StatusMethodNotAllowed)
        }
    })
    http.ListenAndServe(":8080", nil)
}`,
      },
      {
        language: "TypeScript",
        title: "Fetch API basics",
        code: `// GET request
const res = await fetch("/api/users");
const users = await res.json();

// POST request
const created = await fetch("/api/users", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Alice", email: "alice@example.com" }),
});

if (!created.ok) {
  throw new Error(\`HTTP \${created.status}: \${created.statusText}\`);
}`,
      },
      {
        language: "Python",
        title: "Flask HTTP handlers",
        code: `from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/users", methods=["GET"])
def list_users():
    return jsonify(users)

@app.route("/users", methods=["POST"])
def create_user():
    data = request.get_json()
    users.append(data)
    return jsonify(data), 201

@app.route("/users/<user_id>", methods=["DELETE"])
def delete_user(user_id):
    # remove user...
    return "", 204`,
      },
    ],
  },
  {
    slug: "message-queues",
    title: "Message Queues",
    summary:
      "Decoupling services through asynchronous message passing for reliability and scalability.",
    difficulty: "intermediate",
    domain: "Queues",
    estimatedMinutes: 14,
    prerequisites: ["http"],
    related: ["idempotency", "circuit-breakers"],
    sections: [
      {
        id: "what-it-is",
        title: "What it is",
        content:
          "A message queue is a buffer that sits between a producer (sender) and a consumer (receiver). The producer pushes messages onto the queue, and the consumer pulls and processes them independently. The two sides don't need to be available at the same time.",
      },
      {
        id: "why-it-matters",
        title: "Why it matters",
        content:
          "Without queues, Service A calls Service B synchronously. If B is slow or down, A blocks. With a queue, A publishes a message and moves on. B processes it when it's ready. This decoupling is critical for building resilient, scalable systems.",
      },
      {
        id: "how-it-works",
        title: "How it works",
        content:
          "Producer sends a message (JSON payload) to a named queue. The message broker (RabbitMQ, SQS, Redis) stores it. A consumer subscribes to the queue, picks up the message, processes it, and acknowledges completion. If the consumer fails, the message returns to the queue for retry.",
      },
      {
        id: "production-concerns",
        title: "Production concerns",
        content:
          "Handle poison messages (messages that always fail) with dead letter queues. Ensure consumers are idempotent — messages may be delivered more than once. Monitor queue depth to detect backlogs. Set appropriate visibility timeouts and retry limits.",
      },
      {
        id: "common-mistakes",
        title: "Common mistakes",
        content:
          "Assuming exactly-once delivery (most queues guarantee at-least-once). Not handling message ordering. Putting too much data in the message instead of just an ID. Not monitoring queue lag. Forgetting to set up dead letter queues.",
      },
    ],
    codeExamples: [
      {
        language: "TypeScript",
        title: "BullMQ producer and consumer",
        code: `import { Queue, Worker } from "bullmq";

// Producer
const emailQueue = new Queue("emails");
await emailQueue.add("welcome", {
  to: "user@example.com",
  subject: "Welcome!",
});

// Consumer
const worker = new Worker("emails", async (job) => {
  await sendEmail(job.data.to, job.data.subject);
  console.log(\`Sent: \${job.data.subject}\`);
});

worker.on("failed", (job, err) => {
  console.error(\`Job \${job?.id} failed: \${err.message}\`);
});`,
      },
      {
        language: "Go",
        title: "AMQP consumer with RabbitMQ",
        code: `conn, _ := amqp.Dial("amqp://guest:guest@localhost:5672/")
ch, _ := conn.Channel()

q, _ := ch.QueueDeclare("emails", true, false, false, false, nil)

msgs, _ := ch.Consume(q.Name, "", false, false, false, false, nil)

for msg := range msgs {
    err := processEmail(msg.Body)
    if err != nil {
        msg.Nack(false, true) // requeue
        continue
    }
    msg.Ack(false)
}`,
      },
    ],
  },
  {
    slug: "caching-strategies",
    title: "Caching Strategies",
    summary:
      "Improving performance with cache-aside, write-through, and CDN patterns to reduce load on databases.",
    difficulty: "intermediate",
    domain: "Caching",
    estimatedMinutes: 16,
    prerequisites: ["http", "indexes", "bloom-filters"],
    related: ["idempotency", "message-queues"],
    sections: [
      {
        id: "what-it-is",
        title: "What it is",
        content:
          "Caching stores frequently accessed data in a fast layer (memory, Redis, CDN) so you don't hit the slower layer (database, external API) on every request. The right caching strategy depends on your read/write ratio and data consistency requirements.",
      },
      {
        id: "why-it-matters",
        title: "Why it matters",
        content:
          "A database query might take 50ms. A Redis lookup takes 1ms. For data that's read 1000x more often than it's written, caching eliminates 99.9% of database load. At scale, caching is the difference between a system that handles 100 req/s and one that handles 100,000 req/s.",
      },
      {
        id: "how-it-works",
        title: "How it works",
        content:
          "Cache-aside: application checks cache first, fetches from DB on miss, writes to cache. Write-through: writes go to cache and DB simultaneously. Write-behind: writes go to cache immediately, DB is updated asynchronously. Each pattern has different consistency and performance characteristics.",
      },
      {
        id: "production-concerns",
        title: "Production concerns",
        content:
          "Cache invalidation is one of the hardest problems in CS. Set appropriate TTLs. Use cache stampede prevention (locking or stale-while-revalidate). Monitor cache hit rates — below 80% usually means your cache isn't helping. Plan for cache failures — your app should degrade gracefully, not crash.",
      },
      {
        id: "common-mistakes",
        title: "Common mistakes",
        content:
          "Caching everything regardless of access pattern. Setting TTLs too long (stale data) or too short (no benefit). Not handling cache invalidation on writes. Caching user-specific data with shared keys. Not monitoring hit/miss ratios.",
      },
    ],
    codeExamples: [
      {
        language: "TypeScript",
        title: "Cache-aside with Redis",
        code: `async function getUser(id: string): Promise<User> {
  // 1. Check cache
  const cached = await redis.get(\`user:\${id}\`);
  if (cached) return JSON.parse(cached);

  // 2. Cache miss — fetch from DB
  const user = await db.users.findUnique({ where: { id } });
  if (!user) throw new NotFoundError();

  // 3. Populate cache with TTL
  await redis.setex(\`user:\${id}\`, 3600, JSON.stringify(user));
  return user;
}

// Invalidate on write
async function updateUser(id: string, data: Partial<User>) {
  await db.users.update({ where: { id }, data });
  await redis.del(\`user:\${id}\`);  // bust cache
}`,
      },
      {
        language: "Go",
        title: "Cache-aside pattern",
        code: `func GetUser(ctx context.Context, id string) (*User, error) {
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
}`,
      },
      {
        language: "Python",
        title: "Redis caching decorator",
        code: `import redis
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
    return db.query("SELECT * FROM users WHERE id=%s", user_id)`,
      },
    ],
  },
  {
    slug: "bits",
    title: "Bits & Binary",
    summary: "The fundamental units of binary information and bitwise operations that power all higher-level data structures.",
    difficulty: "beginner",
    domain: "Foundations",
    estimatedMinutes: 8,
    prerequisites: [],
    related: ["hash-functions"],
    sections: [
      {
        id: "what-it-is",
        title: "What it is",
        content: "A bit (binary digit) is the most basic unit of information in computing, representing a logical state of 0 or 1. Pointers, arrays, and integers are all stored as sequences of bits in memory. Bitwise operators (AND, OR, XOR, NOT, shifts) manipulate these binary values directly, offering maximum execution speed and minimum memory footprint."
      },
      {
        id: "why-it-matters",
        title: "Why it matters",
        content: "High-performance data structures—like bit arrays, Bloom filters, and bitmap indexes—depend directly on bitwise arithmetic. By using individual bits as boolean flags, a system can store and query set membership in raw CPU cache with zero pointer indirection or database overhead."
      },
      {
        id: "bitwise-ops",
        title: "Key Bitwise Operators",
        content: "1. AND (&): Sets bit to 1 if both bits are 1.\n2. OR (|): Sets bit to 1 if either bit is 1.\n3. XOR (^): Sets bit to 1 if only one bit is 1.\n4. Left Shift (<<): Shifts bits left, filling with 0. Multiplying by 2^n.\n5. Right Shift (>>): Shifts bits right. Dividing by 2^n."
      }
    ],
    codeExamples: [
      {
        language: "TypeScript",
        title: "Bitwise flags in TypeScript",
        code: `const READ = 1 << 0;  // 0001\nconst WRITE = 1 << 1; // 0010\nconst EXEC = 1 << 2;  // 0100\n\n// Combine flags using OR (|)\nlet userPerms = READ | WRITE; // 0011\n\n// Check flags using AND (&)\nconst canWrite = (userPerms & WRITE) === WRITE;\nconsole.log(canWrite); // true\n\n// Remove a flag using AND NOT\nuserPerms = userPerms & ~WRITE; // 0001`
      },
      {
        language: "Go",
        title: "Bitwise manipulation in Go",
        code: `package main\nimport "fmt"\n\nfunc main() {\n    var bitmask uint8 = 0 // 00000000\n\n    // Set 3rd bit to 1\n    bitmask |= (1 << 3) // 00001000\n\n    // Check 3rd bit\n    hasThird := (bitmask & (1 << 3)) != 0\n    fmt.Println(hasThird) // true\n}`
      }
    ]
  },
  {
    slug: "hash-functions",
    title: "Hash Functions",
    summary: "Mapping arbitrary-sized keys to fixed-size integers, powering HashMaps, cryptographic security, and data indexing.",
    difficulty: "beginner",
    domain: "Algorithms",
    estimatedMinutes: 10,
    prerequisites: ["bits"],
    related: ["bloom-filters", "indexes"],
    sections: [
      {
        id: "what-it-is",
        title: "What it is",
        content: "A hash function takes an input (often a string or object) and returns a fixed-size integer, called a hash value or code. A good hash function is deterministic (same input always yields same output), fast to compute, and minimizes collisions (different inputs yielding the same hash value)."
      },
      {
        id: "why-it-matters",
        title: "Why it matters",
        content: "Hash functions power the core data structures of the web: Hash tables support O(1) average-time inserts and reads. In backend engineering, hash functions distribute load uniformly (Consistent Hashing), detect data tampering (cryptographic hashes like SHA-256), and determine bit indices for space-saving probabilistic filters."
      },
      {
        id: "collision-resolution",
        title: "Collision Resolution",
        content: "When two different keys generate the same hash, it is a collision. Databases resolve collisions using:\n- Chaining: Storing colliding items in a linked list at that index.\n- Open Addressing: Finding another empty slot using probing sequences (linear, quadratic)."
      }
    ],
    codeExamples: [
      {
        language: "TypeScript",
        title: "Simple DJB2 string hash",
        code: `function djb2Hash(str: string): number {\n  let hash = 5381;\n  for (let i = 0; i < str.length; i++) {\n    const char = str.charCodeAt(i);\n    // hash * 33 + c\n    hash = ((hash << 5) + hash) + char;\n    hash = hash & hash; // Convert to 32bit integer\n  }\n  return Math.abs(hash);\n}\n\nconsole.log(djb2Hash("hello")); // 261185`
      },
      {
        language: "Go",
        title: "FNV-1a hash in Go",
        code: `package main\nimport (\n    "fmt"\n    "hash/fnv"\n)\n\nfunc hashString(s string) uint32 {\n    h := fnv.New32a()\n    h.Write([]byte(s))\n    return h.Sum32()\n}\n\nfunc main() {\n    fmt.Println(hashString("hello")) // 1335836873\n}`
      }
    ]
  },
  {
    slug: "bloom-filters",
    title: "Bloom Filters",
    summary: "A space-efficient probabilistic data structure that checks set membership with zero false negatives.",
    difficulty: "intermediate",
    domain: "Data Structures",
    estimatedMinutes: 14,
    prerequisites: ["bits", "hash-functions"],
    related: ["caching-strategies", "indexes"],
    sections: [
      {
        id: "what-it-is",
        title: "What it is",
        content: "A Bloom Filter is a space-efficient probabilistic data structure. It can check if an element is a member of a set. It returns either:\n1. 'Possibly in the set' (potential False Positive)\n2. 'Definitely not in the set' (absolute guarantee of False Negative = 0%)\nIt uses a bit array and multiple independent hash functions."
      },
      {
        id: "how-it-works",
        title: "How it works under the hood",
        content: "Initialize a bit array of size 'm' to all 0s. Define 'k' hash functions.\n- To ADD: Hash the element with each of the 'k' functions. Set the bits at those indices to 1.\n- To QUERY: Hash the element with the same functions. If ANY of the bits at these indices is 0, the element is definitely NOT in the set. If ALL are 1, it might be in the set (or other keys set those bits, creating a false positive)."
      },
      {
        id: "real-world-use",
        title: "Real-world Applications",
        content: "1. Cache Shielding: Keep a Bloom Filter in memory. If a user queries a non-existent post ID, the Bloom filter says 'Definitely Not Exist' instantly, preventing a database check.\n2. Medium/Google Chrome: Check if a URL is in a malicious domain list locally before loading the page."
      }
    ],
    codeExamples: [
      {
        language: "TypeScript",
        title: "Simple Bloom Filter implementation",
        code: `class BloomFilter {\n  private size: number;\n  private bits: boolean[];\n\n  constructor(size = 100) {\n    this.size = size;\n    this.bits = new Array(size).fill(false);\n  }\n\n  private hash1(str: string): number {\n    let hash = 0;\n    for (let i = 0; i < str.length; i++) {\n      hash = (hash * 31 + str.charCodeAt(i)) % this.size;\n    }\n    return hash;\n  }\n\n  private hash2(str: string): number {\n    let hash = 5381;\n    for (let i = 0; i < str.length; i++) {\n      hash = ((hash << 5) + hash + str.charCodeAt(i)) % this.size;\n    }\n    return Math.abs(hash);\n  }\n\n  add(item: string) {\n    this.bits[this.hash1(item)] = true;\n    this.bits[this.hash2(item)] = true;\n  }\n\n  contains(item: string): boolean {\n    return this.bits[this.hash1(item)] && this.bits[this.hash2(item)];\n  }\n}`
      }
    ]
  }
];

export function getConceptBySlug(slug: string): Concept | undefined {
  return concepts.find((c) => c.slug === slug);
}

export function getConceptsByDomain(domain: string): Concept[] {
  return concepts.filter((c) => c.domain === domain);
}

export function getAllDomains(): string[] {
  return [...new Set(concepts.map((c) => c.domain))];
}

export function getAllSlugs(): string[] {
  return concepts.map((c) => c.slug);
}
