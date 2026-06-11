---
title: Message Queues
slug: message-queues
summary: "Message queues decouple producers from consumers in time, enabling async communication, load leveling, and fault isolation across distributed services."
difficulty: intermediate
chapterId: reliability
domain: Reliability
estimatedMinutes: 12
prerequisites: [http]
related: [circuit-breakers, change-data-capture]
seo_title: "Message Queues Explained: Delivery Guarantees, Brokers & Backpressure"
seo_description: "Learn how message queues decouple distributed services, the difference between at-most-once and exactly-once delivery, pub/sub vs point-to-point, and how Kafka, RabbitMQ, and SQS compare."
canonical_url: "/concepts/message-queues"
code_examples:
  - language: python
    title: Publish and consume with Redis Streams
    code: |
      import redis

      r = redis.Redis(host="localhost", port=6379, decode_responses=True)

      # Producer: publish an order event
      msg_id = r.xadd(
          "orders",
          {"order_id": "ord-9912", "item": "keyboard", "qty": "1"},
      )
      print(f"Published message: {msg_id}")

      # Consumer: read new messages (blocking, 2-second timeout)
      messages = r.xread({"orders": "$"}, count=10, block=2000)
      for stream, entries in (messages or []):
          for entry_id, fields in entries:
              print(f"[{entry_id}] Received: {fields}")
---

## The core problem

Imagine your order service calls the inventory service directly over HTTP. If inventory is slow, the order service waits. If inventory is down, the order call fails outright. The two services are **coupled in time**: neither can operate independently of the other.

A **message queue** breaks this coupling. Instead of calling inventory directly, the order service drops a message into a queue and immediately gets an acknowledgement from the broker. The inventory service picks up that message whenever it is ready. The caller is free to move on; the callee is free to process at its own pace.

## The restaurant analogy

Think of a restaurant order-ticket system. When a customer orders, the waiter writes a ticket and clips it to the rail above the kitchen window. The waiter walks away and takes the next table. The kitchen picks up tickets when a cook is free. No one is blocked waiting at the kitchen window.

In software terms: the waiter is the **producer**, the ticket rail is the **queue**, and the kitchen is the **consumer**. The queue stores messages durably so that a brief kitchen slowdown (consumer lag) or even a restart doesn't lose any orders.

## Architecture overview

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 260" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#81a1c1"/>
    </marker>
  </defs>
  <!-- Producer -->
  <rect x="20" y="100" width="110" height="60" rx="8" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="75" y="126" font-family="sans-serif" font-size="13" fill="#88c0d0" text-anchor="middle" font-weight="bold">Producer</text>
  <text x="75" y="145" font-family="sans-serif" font-size="11" fill="#d8dee9" text-anchor="middle">Order Service</text>
  <!-- Arrow: producer -> queue -->
  <line x1="130" y1="130" x2="198" y2="130" stroke="#81a1c1" stroke-width="1.5" marker-end="url(#arrow)"/>
  <!-- Ack arrow back -->
  <line x1="198" y1="138" x2="130" y2="138" stroke="#a3be8c" stroke-width="1.2" stroke-dasharray="4,3" marker-end="url(#arrow)"/>
  <text x="164" y="122" font-family="sans-serif" font-size="10" fill="#d8dee9" text-anchor="middle">publish</text>
  <text x="164" y="152" font-family="sans-serif" font-size="10" fill="#a3be8c" text-anchor="middle">ack ✓</text>
  <!-- Queue box -->
  <rect x="200" y="80" width="140" height="100" rx="8" fill="#3b4252" stroke="#88c0d0" stroke-width="1.5"/>
  <text x="270" y="105" font-family="sans-serif" font-size="13" fill="#88c0d0" text-anchor="middle" font-weight="bold">Message Queue</text>
  <!-- Message slots -->
  <rect x="215" y="112" width="28" height="22" rx="3" fill="#4c566a"/>
  <rect x="248" y="112" width="28" height="22" rx="3" fill="#4c566a"/>
  <rect x="281" y="112" width="28" height="22" rx="3" fill="#4c566a"/>
  <rect x="314" y="112" width="28" height="22" rx="3" fill="#4c566a" opacity="0.4"/>
  <text x="229" y="127" font-family="sans-serif" font-size="9" fill="#eceff4" text-anchor="middle">msg</text>
  <text x="262" y="127" font-family="sans-serif" font-size="9" fill="#eceff4" text-anchor="middle">msg</text>
  <text x="295" y="127" font-family="sans-serif" font-size="9" fill="#eceff4" text-anchor="middle">msg</text>
  <text x="270" y="158" font-family="sans-serif" font-size="10" fill="#81a1c1" text-anchor="middle">durable, ordered</text>
  <!-- Arrows: queue -> consumers -->
  <line x1="340" y1="110" x2="408" y2="82" stroke="#81a1c1" stroke-width="1.5" marker-end="url(#arrow)"/>
  <line x1="340" y1="130" x2="408" y2="130" stroke="#81a1c1" stroke-width="1.5" marker-end="url(#arrow)"/>
  <line x1="340" y1="150" x2="408" y2="178" stroke="#81a1c1" stroke-width="1.5" marker-end="url(#arrow)"/>
  <!-- Consumer 1 -->
  <rect x="410" y="55" width="130" height="54" rx="8" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="475" y="78" font-family="sans-serif" font-size="12" fill="#a3be8c" text-anchor="middle" font-weight="bold">Consumer 1</text>
  <text x="475" y="95" font-family="sans-serif" font-size="10" fill="#d8dee9" text-anchor="middle">Inventory Svc</text>
  <!-- Consumer 2 -->
  <rect x="410" y="103" width="130" height="54" rx="8" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="475" y="126" font-family="sans-serif" font-size="12" fill="#a3be8c" text-anchor="middle" font-weight="bold">Consumer 2</text>
  <text x="475" y="143" font-family="sans-serif" font-size="10" fill="#d8dee9" text-anchor="middle">Analytics Svc</text>
  <!-- Consumer 3 -->
  <rect x="410" y="151" width="130" height="54" rx="8" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="475" y="174" font-family="sans-serif" font-size="12" fill="#a3be8c" text-anchor="middle" font-weight="bold">Consumer 3</text>
  <text x="475" y="191" font-family="sans-serif" font-size="10" fill="#d8dee9" text-anchor="middle">Email Svc</text>
  <!-- Fan-out label -->
  <text x="270" y="230" font-family="sans-serif" font-size="11" fill="#81a1c1" text-anchor="middle">Producer acks from the broker, not the consumer</text>
</svg>

Notice the key detail: the producer gets its acknowledgement from the **broker** (the queue), not from any consumer. This is what makes the decoupling real. Even if all three consumers are offline, the producer keeps publishing successfully and the messages pile up safely in the queue.

## Delivery guarantees

Every messaging system makes a choice about what it promises when delivering a message.

* **At-most-once:** The broker fires the message and forgets it. If the consumer crashes before processing, the message is gone. Fast and simple, used for metrics or telemetry where some loss is acceptable.
* **At-least-once:** The broker retries delivery until the consumer sends an acknowledgement. The message will not be lost, but it may be delivered more than once if the ack is delayed. This is the default in Kafka, SQS, and RabbitMQ. Consumers must be **idempotent**: processing the same message twice should have the same net effect as processing it once.
* **Exactly-once:** The message is processed exactly once, no loss and no duplication. This requires coordination between the broker and the consumer's storage (e.g. transactional commits), and is the hardest guarantee to implement. Kafka supports it via `enable.idempotence=true` combined with transactional producers, but it adds overhead.

In practice, most teams design for at-least-once delivery and build idempotent consumers. Exactly-once is reserved for financial or inventory-critical paths.

## Point-to-point vs pub/sub

**Point-to-point** (work queue): a message is delivered to exactly one consumer. Multiple consumers compete for messages from the same queue, which gives you horizontal scaling. A payment processing queue with three worker instances is a classic example — each payment goes to only one worker.

**Pub/sub** (publish/subscribe): every subscriber receives a copy of each message. The producer publishes to a topic; any service that cares subscribes. When an order is placed, both the inventory service and the email service need to know — pub/sub is the natural fit.

**Kafka** supports both models through **consumer groups**. Within a group, each message goes to one member (point-to-point scaling). Across groups, every group gets a copy (pub/sub broadcast).

## Push vs pull

In a **push** model (RabbitMQ), the broker decides when to send messages to consumers. This reduces latency but can overwhelm a slow consumer.

In a **pull** model (Kafka), the consumer asks the broker for the next batch of messages at its own pace. This naturally implements **backpressure**: a slow consumer just reads slowly, and the queue depth grows rather than the consumer crashing. Pull is generally preferred in high-throughput pipelines.

## Dead Letter Queues

When a consumer fails to process a message after N retries, it would be a mistake to keep retrying forever or to silently discard the message. Instead, move it to a **Dead Letter Queue (DLQ)**.

A DLQ holds messages that could not be processed. Engineers can inspect them, fix the underlying bug, and replay them into the main queue. Without a DLQ, bad messages either poison the queue (blocking all progress) or disappear silently.

Configure DLQs from day one. Set a `maxReceiveCount` (SQS terminology) or a `dead-letter` exchange (RabbitMQ) and alert on DLQ depth.

## Broker comparison

| Broker | Model | Delivery | Throughput | Notable strength |
|---|---|---|---|---|
| **Kafka** | Log-based, pull | At-least-once / exactly-once | Very high | Replay, retention, consumer groups |
| **RabbitMQ** | Broker-mediated, push | At-least-once | High | Flexible routing (exchanges), AMQP |
| **AWS SQS** | Managed queue, pull | At-least-once | High | Zero ops, native DLQ, FIFO option |
| **Redis Streams** | Log-based, pull | At-least-once | Medium | Lightweight, co-located with cache |

## Backpressure and queue depth

When consumers are slower than producers, messages accumulate in the queue. This is normal up to a point. What matters is the trend.

Monitor **queue depth** (number of pending messages) and **consumer lag** (how far behind the consumer offset is, in Kafka terms). A queue depth that grows without bound means you need more consumer instances or a faster consumer implementation. Add auto-scaling policies that trigger on queue depth so the system self-corrects before the queue becomes a problem.

## Code example

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Producer: publish an order event
msg_id = r.xadd(
    "orders",
    {"order_id": "ord-9912", "item": "keyboard", "qty": "1"},
)
print(f"Published message: {msg_id}")

# Consumer: read new messages (blocking, 2-second timeout)
messages = r.xread({"orders": "$"}, count=10, block=2000)
for stream, entries in (messages or []):
    for entry_id, fields in entries:
        print(f"[{entry_id}] Received: {fields}")
```

`xadd` appends the event to the `orders` stream and returns a unique monotonic ID. `xread` with `"$"` as the starting ID means "give me only new messages from this point forward". The `block=2000` argument makes the call wait up to 2 seconds for a message before returning, avoiding a busy-poll loop.

## Further Reading

* [Designing Data-Intensive Applications, Chapter 11 — Stream Processing (Kleppmann)](https://dataintensive.net/)
* [Apache Kafka Documentation: Introduction](https://kafka.apache.org/documentation/#introduction)
* [AWS SQS: Dead-Letter Queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)
* [RabbitMQ: AMQP 0-9-1 Model Explained](https://www.rabbitmq.com/tutorials/amqp-concepts)
* [CloudFlare Blog: Backpressure explained](https://blog.cloudflare.com/kwik-e-mart-and-backpressure/)
