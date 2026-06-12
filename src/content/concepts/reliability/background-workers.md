---
title: Asynchronous Background Workers
slug: background-workers
summary: "How background worker pools and durable job queues offload long-running tasks from the synchronous request-response path."
difficulty: intermediate
chapterId: reliability
domain: Reliability & Scale
estimatedMinutes: 12
prerequisites: [message-queues, processes-threads]
related: [webhooks]
seo_title: "Asynchronous Background Workers: Resilient Job Processing"
seo_description: "Learn how to build resilient background worker pools. Discover the Job Queue pattern, exponential backoff, jitter, dead letter queues (DLQs), and delivery guarantees."
canonical_url: "/concepts/background-workers"
citations:
  - title: "Enterprise Integration Patterns: Designing, Building, and Deploying Messaging Solutions"
    author: "Gregor Hohpe & Bobby Woolf"
    chapter: "Chapter 5: Messaging Systems, Chapter 6: Consumer Patterns"
    page_range: "220-312"
    external_link: "https://www.enterpriseintegrationpatterns.com/"
code_examples:
  - language: go
    title: "Resilient Background Worker Pool with Retry Backoff and DLQ Routing"
    code: |
      package main

      import (
          "context"
          "errors"
          "fmt"
          "math"
          "math/rand"
          "sync"
          "time"
      )

      type Task struct {
          ID          string
          Payload     string
          MaxAttempts int
          Attempts    int
      }

      type WorkerPool struct {
          taskQueue  chan Task
          dlq        map[string]Task
          dlqMutex   sync.Mutex
          wg         sync.WaitGroup
          ctx        context.Context
          cancel     context.CancelFunc
      }

      func NewWorkerPool(bufferSize int) *WorkerPool {
          ctx, cancel := context.WithCancel(context.Background())
          return &WorkerPool{
              taskQueue: make(chan Task, bufferSize),
              dlq:       make(map[string]Task),
              ctx:       ctx,
              cancel:    cancel,
          }
      }

      func (wp *WorkerPool) Submit(task Task) {
          wp.taskQueue <- task
      }

      func (wp *WorkerPool) StartWorkers(numWorkers int) {
          for i := 0; i < numWorkers; i++ {
              wp.wg.Add(1)
              go wp.worker(i)
          }
      }

      func (wp *WorkerPool) worker(id int) {
          defer wp.wg.Done()
          for {
              select {
              case <-wp.ctx.Done():
                  return
              case task, ok := <-wp.taskQueue:
                  if !ok {
                      return
                  }
                  err := wp.process(task)
                  if err != nil {
                      task.Attempts++
                      fmt.Printf("[Worker %d] Task %s failed (Attempt %d/%d): %v\n", id, task.ID, task.Attempts, task.MaxAttempts, err)
                      if task.Attempts >= task.MaxAttempts {
                          wp.routeToDLQ(task)
                      } else {
                          go wp.retryWithBackoff(task)
                      }
                  } else {
                      fmt.Printf("[Worker %d] Task %s successfully completed\n", id, task.ID)
                  }
              }
          }
      }

      func (wp *WorkerPool) process(task Task) error {
          // Simulate processing time
          time.Sleep(10 * time.Millisecond)
          
          // Simulate occasional transient network issues (70% failure rate)
          if rand.Float32() < 0.7 {
              return errors.New("transient database connection timeout")
          }
          return nil
      }

      func (wp *WorkerPool) retryWithBackoff(task Task) {
          // Exponential backoff logic: delay = base * 2^(attempt-1)
          baseDelay := 20 * time.Millisecond
          multiplier := math.Pow(2, float64(task.Attempts-1))
          delay := time.Duration(float64(baseDelay) * multiplier)
          
          // Add random jitter to avoid synchronized retry storms
          jitter := time.Duration(rand.Intn(10)) * time.Millisecond
          finalDelay := delay + jitter

          fmt.Printf("[System] Scheduling task %s retry in %v\n", task.ID, finalDelay)
          
          select {
          case <-wp.ctx.Done():
              return
          case <-time.After(finalDelay):
              wp.taskQueue <- task
          }
      }

      func (wp *WorkerPool) routeToDLQ(task Task) {
          wp.dlqMutex.Lock()
          defer wp.dlqMutex.Unlock()
          wp.dlq[task.ID] = task
          fmt.Printf("[DLQ] Permanently routing failed Task %s to the Dead Letter Queue\n", task.ID)
      }

      func (wp *WorkerPool) Shutdown() {
          wp.cancel()
          close(wp.taskQueue)
          wp.wg.Wait()
      }

      func main() {
          rand.Seed(time.Now().UnixNano())
          pool := NewWorkerPool(10)
          pool.StartWorkers(3)

          for i := 1; i <= 5; i++ {
              pool.Submit(Task{
                  ID:          fmt.Sprintf("task-%d", i),
                  Payload:     fmt.Sprintf("data-%d", i),
                  MaxAttempts: 3,
              })
          }

          // Let workers run for a bit
          time.Sleep(200 * time.Millisecond)
          pool.Shutdown()
      }
---

## The Problem: Blocking the HTTP Request Lifecycle

When a client initiates an HTTP request, they expect a prompt response. However, many backend systems must perform operations that are slow or resource-heavy. Examples include:

* Generating complex PDF invoices or reports.
* Compressing images or transcoding video files.
* Sending transactional emails or push notifications.
* Calling slow third-party APIs.

If you execute these processes synchronously inside the client HTTP request lifecycle, the client must wait. This locks up a server request thread, increases HTTP response latency, and leaves the client vulnerable to connection timeouts. If traffic spikes, the application will quickly run out of available threads and crash.

---

## The Solution: The Job Queue Pattern

The **job queue** pattern decouples the synchronous request-response path from asynchronous task execution.

Instead of processing an expensive task immediately, the web server serializes the task details (such as JSON metadata) and publishes it as a job to a durable message broker (such as Redis, RabbitMQ, or Amazon SQS). The server immediately returns an HTTP status code `202 Accepted` to the client, indicating that the task is queued for future processing.

Downstream, separate processes called **background workers** continuously poll or subscribe to the message broker, fetch tasks, and execute them asynchronously.

<svg viewBox="0 0 580 260" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <rect x="15" y="45" width="80" height="40" rx="6" fill="#2e3440" stroke="#d8dee9" stroke-width="1"/>
  <text x="55" y="69" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Client</text>
  <path d="M 95 55 L 135 55" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="115" y="50" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">HTTP POST</text>
  <path d="M 135 75 L 95 75" stroke="#88c0d0" stroke-width="1.5" stroke-dasharray="2" fill="none" marker-end="url(#arr)"/>
  <text x="115" y="87" fill="#88c0d0" font-family="sans-serif" font-size="8" text-anchor="middle">202 Accepted</text>
  <rect x="135" y="45" width="90" height="40" rx="6" fill="#3b4252" stroke="#88c0d0" stroke-width="1"/>
  <text x="180" y="69" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Web Server</text>
  <path d="M 225 65 L 265 65" stroke="#88c0d0" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="245" y="58" fill="#88c0d0" font-family="sans-serif" font-size="8" text-anchor="middle">Enqueue</text>
  <rect x="265" y="45" width="110" height="40" rx="6" fill="#3b4252" stroke="#ebcb8b" stroke-width="1"/>
  <text x="320" y="69" fill="#ebcb8b" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Job Queue</text>
  <path d="M 320 85 L 320 125" stroke="#88c0d0" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="200" y="125" width="100" height="40" rx="6" fill="#2e3440" stroke="#81a1c1" stroke-width="1"/>
  <text x="250" y="149" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">Worker A</text>
  <rect x="340" y="125" width="100" height="40" rx="6" fill="#2e3440" stroke="#81a1c1" stroke-width="1"/>
  <text x="390" y="149" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">Worker B</text>
  <rect x="460" y="125" width="105" height="40" rx="6" fill="#3b4252" stroke="#bf616a" stroke-width="1"/>
  <text x="512" y="149" fill="#bf616a" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">DLQ</text>
  <path d="M 440 145 L 460 145" stroke="#bf616a" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="450" y="137" fill="#bf616a" font-family="sans-serif" font-size="8" text-anchor="middle">Failures</text>
  <path d="M 200 145 C 150 145, 150 215, 320 215 C 430 215, 430 65, 375 65" stroke="#81a1c1" stroke-width="1.2" stroke-dasharray="3" fill="none" marker-end="url(#arr)"/>
  <text x="240" y="227" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Retry (Exponential Backoff + Jitter)</text>
  <defs>
    <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#eceff4"/>
    </marker>
  </defs>
</svg>

---

## Concurrency Safety and Worker Design

To achieve high throughput, background workers generally run inside concurrent threads, goroutines, or separate operating system processes. However, managing concurrency requires careful resource constraints:

* **Worker Prefetch Limits**: If a worker node fetches too many jobs from the broker into local memory at once, it can run out of memory or starve other idle workers of tasks. Setting a prefetch count (e.g. via RabbitMQ `basic.qos`) ensures workers only retrieve jobs they have the active capacity to process.
* **Database Connection Pool Allocation**: A common mistake is configuring 50 worker threads but setting the database connection pool limit to 10. When the workers execute in parallel, 40 of them will block waiting for a database connection, degrading throughput.

---

## Delivery Guarantees: At-Least-Once vs At-Most-Once

When a worker pulls a task from the queue, what happens if the worker crashes mid-execution?

* **At-Most-Once**: The broker deletes the job immediately upon sending it to the worker. If the worker crashes, the job is lost forever. This is suitable only for non-critical, ephemeral tasks like log forwarding.
* **At-Least-Once**: The worker must explicitly send an acknowledgment (ACK) back to the broker after successfully processing the task. If the worker crashes or fails to respond within a visibility timeout, the broker re-enqueues the job to be picked up by another worker.

Because At-Least-Once delivery can result in duplicate executions (for example, if a worker processes a task but crashes right before sending the ACK), tasks must be **idempotent**. This means running the same task multiple times must result in the same state as running it once.

---

## Fault Tolerance: Backoffs, Jitter, and Dead Letter Queues

If a task fails due to a transient issue, such as a database query timeout or a third-party API outage, it should not be discarded. Instead, it must be retried safely:

* **Exponential Backoff**: Successive retry attempts are spaced out by doubling the wait interval (e.g. 1s, 2s, 4s, 8s). This prevents the workers from overwhelming struggling downstream dependencies.
* **Jitter**: Adding random noise (jitter) to the backoff delay prevents all failing tasks from retrying at the exact same millisecond. This prevents synchronized retry storms.
* **Dead Letter Queues (DLQ)**: If a job fails repeatedly and exceeds its maximum retry threshold (e.g. 5 attempts), it represents a permanent failure (like a corrupted payload or a code bug). The system routes these jobs to a specialized queue called a **Dead Letter Queue**. This isolates bad payloads and lets developers inspect them manually without blocking the main queues.

---

## Distributed Locks and Resource Coordination

If multiple worker processes are pulling tasks from a queue, you may need to ensure that certain tasks do not run concurrently. For example, you should not run two parallel billing jobs for the same user.

To prevent this, workers use **distributed locks** (such as Redis-based Redlock) to serialize execution:

1. A worker retrieves a job for User X.
2. The worker attempts to acquire a lock for the key `lock:user_id:X`.
3. If it fails to acquire the lock, the worker releases the job back to the queue to try again later.
4. If it succeeds, it processes the job, releases the lock, and acknowledges the job.

---

## Monitoring and Observability Metrics

Maintaining a healthy background system requires tracking key performance metrics:

* **Queue Depth**: The number of pending tasks in the queue. A steadily growing queue indicates that your workers cannot keep up with the incoming volume, signaling a need to scale out the worker pool.
* **Processing Latency**: The duration between when a task is enqueued and when it finishes executing. High latency harms user experiences if they are waiting for a background result (like an email code).
* **Failure Rate**: The ratio of failed tasks to total tasks. A sudden spike indicates network connectivity issues, database locks, or bad code deployments.

---

## Further Reading

- [Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/) — Seminal guide on messaging systems and consumer patterns by Hohpe and Woolf.
- [Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) — AWS Architecture blog post detailing the mathematics and benefits of jitter.
- [RabbitMQ Consumer Acknowledgements](https://www.rabbitmq.com/confirms.html) — Deep dive into how ACK protocols work under the hood.
