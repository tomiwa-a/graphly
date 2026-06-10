---
title: Message Queues
slug: message-queues
summary: "Decoupling services through asynchronous message passing for reliability and scalability."
difficulty: intermediate
chapterId: reliability
domain: Queues
estimatedMinutes: 14
prerequisites: [http]
related: [idempotency, circuit-breakers]
seo_title: "Message Queues: Decoupling Services with Async Messaging"
seo_description: "Understand message queues — how producers and consumers decouple services, handle failures, and build resilient asynchronous systems with RabbitMQ, SQS, and BullMQ."
canonical_url: "/concepts/message-queues"
code_examples:
  - language: TypeScript
    title: BullMQ producer and consumer
    code: |
      import { Queue, Worker } from "bullmq";

      // Producer
      const emailQueue = new Queue("emails");
      await emailQueue.add("welcome", {
        to: "user@example.com",
        subject: "Welcome!",
      });

      // Consumer
      const worker = new Worker("emails", async (job) => {
        await sendEmail(job.data.to, job.data.subject);
        console.log(`Sent: ${job.data.subject}`);
      });

      worker.on("failed", (job, err) => {
        console.error(`Job ${job?.id} failed: ${err.message}`);
      });
  - language: Go
    title: AMQP consumer with RabbitMQ
    code: |
      conn, _ := amqp.Dial("amqp://guest:guest@localhost:5672/")
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
      }
---

## What it is

A message queue is a buffer that sits between a producer (sender) and a consumer (receiver). The producer pushes messages onto the queue, and the consumer pulls and processes them independently. The two sides don't need to be available at the same time.

## Why it matters

Without queues, Service A calls Service B synchronously. If B is slow or down, A blocks. With a queue, A publishes a message and moves on. B processes it when it's ready. This decoupling is critical for building resilient, scalable systems.

## How it works

Producer sends a message (JSON payload) to a named queue. The message broker (RabbitMQ, SQS, Redis) stores it. A consumer subscribes to the queue, picks up the message, processes it, and acknowledges completion. If the consumer fails, the message returns to the queue for retry.

## Production concerns

Handle poison messages (messages that always fail) with dead letter queues. Ensure consumers are idempotent — messages may be delivered more than once. Monitor queue depth to detect backlogs. Set appropriate visibility timeouts and retry limits.

## Common mistakes

Assuming exactly-once delivery (most queues guarantee at-least-once). Not handling message ordering. Putting too much data in the message instead of just an ID. Not monitoring queue lag. Forgetting to set up dead letter queues.
