---
title: Distributed Transactions & Sagas
slug: distributed-transactions-sagas
summary: "When transactions span multiple database boundaries, the Saga pattern coordinates a sequence of local transactions and compensating rollbacks to guarantee eventual consistency."
difficulty: advanced
chapterId: reliability
domain: Reliability & Scale
estimatedMinutes: 15
prerequisites: [acid-transactions-isolation, message-queues]
related: [idempotency]
seo_title: "Distributed Transactions: Two-Phase Commit vs Sagas Pattern"
seo_description: "Learn how the Saga pattern solves the limitations of Two-Phase Commit (2PC) in microservices using orchestration, choreography, and compensating actions."
canonical_url: "/concepts/distributed-transactions-sagas"
citations:
  - title: "Sagas"
    author: "Hector Garcia-Molina and Kenneth Salem"
    chapter: "Section 2: Saga Definition"
    page_range: "9-15"
    external_link: "https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf"
code_examples:
  - language: go
    title: "Saga Orchestrator Engine with Compensating Actions"
    code: |
      package main

      import (
          "context"
          "fmt"
      )

      type SagaStep interface {
          Name() string
          Execute(ctx context.Context) error
          Compensate(ctx context.Context) error
      }

      type OrderStep struct{}
      func (s *OrderStep) Name() string { return "Create Order" }
      func (s *OrderStep) Execute(ctx context.Context) error {
          fmt.Println("Executing: Create Order")
          return nil
      }
      func (s *OrderStep) Compensate(ctx context.Context) error {
          fmt.Println("Compensating: Cancel Order")
          return nil
      }

      type PaymentStep struct{}
      func (s *PaymentStep) Name() string { return "Charge Card" }
      func (s *PaymentStep) Execute(ctx context.Context) error {
          fmt.Println("Executing: Charge Card")
          return nil
      }
      func (s *PaymentStep) Compensate(ctx context.Context) error {
          fmt.Println("Compensating: Refund Card")
          return nil
      }

      type InventoryStep struct {
          ShouldFail bool
      }
      func (s *InventoryStep) Name() string { return "Reserve Inventory" }
      func (s *InventoryStep) Execute(ctx context.Context) error {
          fmt.Println("Executing: Reserve Inventory")
          if s.ShouldFail {
              return fmt.Errorf("inventory unavailable")
          }
          return nil
      }
      func (s *InventoryStep) Compensate(ctx context.Context) error {
          fmt.Println("Compensating: Release Inventory")
          return nil
      }

      type SagaOrchestrator struct {
          steps []SagaStep
      }

      func NewSagaOrchestrator(steps []SagaStep) *SagaOrchestrator {
          return &SagaOrchestrator{steps: steps}
      }

      func (o *SagaOrchestrator) Execute(ctx context.Context) error {
          var executedSteps []SagaStep

          for _, step := range o.steps {
              fmt.Printf("Starting step: %s\n", step.Name())
              err := step.Execute(ctx)
              if err != nil {
                  fmt.Printf("Step failed: %s with error: %v. Starting rollback...\n", step.Name(), err)
                  o.rollback(ctx, executedSteps)
                  return err
              }
              executedSteps = append(executedSteps, step)
          }
          fmt.Println("Saga completed successfully")
          return nil
      }

      func (o *SagaOrchestrator) rollback(ctx context.Context, executed []SagaStep) {
          for i := len(executed) - 1; i >= 0; i-- {
              step := executed[i]
              fmt.Printf("Running compensating action for: %s\n", step.Name())
              err := step.Compensate(ctx)
              if err != nil {
                  fmt.Printf("CRITICAL: Compensation failed for %s: %v\n", step.Name(), err)
              }
          }
          fmt.Println("Saga rollback completed")
      }
---

## The Challenge of Distributed Transactions

In a monolithic application, maintaining transaction safety is straightforward, the system interacts with a single database, and you can wrap operations in a standard SQL transaction block (`BEGIN` / `COMMIT`). If anything fails, the database automatically rolls back all changes, upholding ACID guarantees.

In a microservices architecture, this simplicity disappears. Business transactions are distributed across multiple independent services, each with its own local database. For example, checking out a shopping cart might require:
1. **Order Service** to create an order record.
2. **Payment Service** to charge the user's credit card.
3. **Inventory Service** to reserve the physical items.

Because these services run on separate nodes and databases, standard local SQL transactions cannot coordinate them. If the payment succeeds but the inventory check fails, the system is left in an inconsistent state: a customer has been charged for items that are out of stock.

## The Two-Phase Commit (2PC) Protocol

Historically, distributed systems used **Two-Phase Commit** (2PC) to enforce ACID properties across databases. As the name implies, 2PC operates in two phases, managed by a centralized coordinator:

### Phase 1: Prepare Phase
The coordinator asks all participating nodes if they are ready to commit their work. Each participant performs safety checks, acquires necessary local database locks on the affected rows, and replies with a vote (Yes or No).

### Phase 2: Commit Phase
If all participants voted Yes, the coordinator broadcasts a commit instruction, and the participants make their changes permanent. If any participant voted No, or failed to respond within a timeout, the coordinator broadcasts a rollback instruction, and all participants abort their local transactions.

If the coordinator crashes midway through Phase 2, participants are left in a state of limbo. They hold database locks and cannot commit or abort because they do not know what the coordinator decided. They must wait for the coordinator to recover.

## Limitations of Two-Phase Commit

While 2PC guarantees strict data consistency, it is rarely used in modern, high-throughput microservices due to major trade-offs:
* **Blocking Nature**: Nodes must hold database locks on records from the start of the Prepare phase until they receive the Commit/Abort instruction. This reduces query throughput and increases lock contention.
* **Latency Overhead**: 2PC requires multiple synchronous network round-trips between the coordinator and all participants, amplifying latency.
* **Single Point of Failure**: If the coordinator crashes while participants are in the prepared state, those database resources remain locked indefinitely, impacting system availability.

For these reasons, modern distributed systems trade strict ACID properties for eventual consistency, moving from 2PC to the Saga pattern.

## Diagram: Two-Phase Commit vs Saga Rollback

The following diagram contrasts the blocking, lock-holding nature of 2PC with the non-blocking, compensating rollback flow of a Saga:

<svg viewBox="0 0 580 320" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="24" font-family="sans-serif" font-size="14" fill="#88c0d0" text-anchor="middle" font-weight="bold">2-Phase Commit (2PC) vs Saga Workflow</text>
  <rect x="20" y="50" width="250" height="250" rx="6" fill="#2e3440" stroke="#bf616a" stroke-width="1.5"/>
  <text x="145" y="70" font-family="sans-serif" font-size="12" fill="#bf616a" text-anchor="middle" font-weight="bold">Two-Phase Commit (Blocking)</text>
  <rect x="40" y="85" width="80" height="25" rx="3" fill="#3b4252" stroke="#81a1c1"/>
  <text x="80" y="101" font-family="sans-serif" font-size="9" fill="#eceff4" text-anchor="middle">Coordinator</text>
  <rect x="170" y="85" width="80" height="25" rx="3" fill="#3b4252" stroke="#81a1c1"/>
  <text x="210" y="101" font-family="sans-serif" font-size="9" fill="#eceff4" text-anchor="middle">Participant</text>
  <path d="M 120 120 L 170 120" stroke="#ebcb8b" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="145" y="115" font-family="sans-serif" font-size="8" fill="#ebcb8b" text-anchor="middle">1. Prepare</text>
  <path d="M 170 140 L 120 140" stroke="#a3be8c" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="145" y="136" font-family="sans-serif" font-size="8" fill="#a3be8c" text-anchor="middle">2. Vote Yes</text>
  <line x1="40" y1="160" x2="250" y2="160" stroke="#4c566a" stroke-dasharray="3,3"/>
  <text x="145" y="175" font-family="sans-serif" font-size="9" fill="#81a1c1" text-anchor="middle">Locks held until commit completes</text>
  <path d="M 120 200 L 170 200" stroke="#ebcb8b" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="145" y="195" font-family="sans-serif" font-size="8" fill="#ebcb8b" text-anchor="middle">3. Commit</text>
  <path d="M 170 220 L 120 220" stroke="#a3be8c" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="145" y="216" font-family="sans-serif" font-size="8" fill="#a3be8c" text-anchor="middle">4. Acknowledge</text>
  <rect x="310" y="50" width="250" height="250" rx="6" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="435" y="70" font-family="sans-serif" font-size="12" fill="#a3be8c" text-anchor="middle" font-weight="bold">Saga Pattern (Non-blocking)</text>
  <rect x="330" y="90" width="80" height="30" rx="4" fill="#2e3440" stroke="#a3be8c"/>
  <text x="370" y="105" font-family="sans-serif" font-size="9" fill="#eceff4" text-anchor="middle">T1: Create Order</text>
  <text x="370" y="117" font-family="sans-serif" font-size="7" fill="#a3be8c" text-anchor="middle">Success</text>
  <path d="M 410 105 L 460 105" stroke="#a3be8c" stroke-width="1.5" marker-end="url(#arrow)"/>
  <rect x="460" y="90" width="80" height="30" rx="4" fill="#2e3440" stroke="#a3be8c"/>
  <text x="500" y="105" font-family="sans-serif" font-size="9" fill="#eceff4" text-anchor="middle">T2: Charge Card</text>
  <text x="500" y="117" font-family="sans-serif" font-size="7" fill="#a3be8c" text-anchor="middle">Success</text>
  <path d="M 500 120 L 500 170" stroke="#a3be8c" stroke-width="1.5" marker-end="url(#arrow)"/>
  <rect x="460" y="170" width="80" height="30" rx="4" fill="#2e3440" stroke="#bf616a"/>
  <text x="500" y="185" font-family="sans-serif" font-size="9" fill="#eceff4" text-anchor="middle">T3: Reserve Inv</text>
  <text x="500" y="197" font-family="sans-serif" font-size="7" fill="#bf616a" text-anchor="middle">FAILED</text>
  <path d="M 460 185 L 410 185" stroke="#ebcb8b" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="435" y="180" font-family="sans-serif" font-size="7" fill="#ebcb8b" text-anchor="middle">Rollback</text>
  <rect x="330" y="170" width="80" height="30" rx="4" fill="#2e3440" stroke="#ebcb8b"/>
  <text x="370" y="185" font-family="sans-serif" font-size="9" fill="#eceff4" text-anchor="middle">C2: Refund Card</text>
  <text x="370" y="197" font-family="sans-serif" font-size="7" fill="#ebcb8b" text-anchor="middle">Compensate</text>
  <path d="M 370 170 L 370 120" stroke="#ebcb8b" stroke-width="1.5" marker-end="url(#arrow)"/>
  <rect x="330" y="240" width="80" height="30" rx="4" fill="#2e3440" stroke="#ebcb8b"/>
  <text x="370" y="255" font-family="sans-serif" font-size="9" fill="#eceff4" text-anchor="middle">C1: Cancel Order</text>
  <text x="370" y="267" font-family="sans-serif" font-size="7" fill="#ebcb8b" text-anchor="middle">Compensate</text>
  <path d="M 370 200 L 370 240" stroke="#ebcb8b" stroke-width="1.5" marker-end="url(#arrow)"/>
  <defs>
    <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#81a1c1"/>
    </marker>
  </defs>
</svg>

## The Saga Pattern: Eventual Consistency

A **Saga** is a design pattern that models a distributed transaction as a series of independent **local transactions**. Each service executes its own local database transaction and publishes an event or message. Subsequent services listen to these messages and trigger their own local transactions.

Because each service commits its local transaction immediately, no global database locks are held. This increases performance but means the system only guarantees **eventual consistency** (BASE model, standing for Basically Available, Soft state, Eventual consistency) rather than strict immediate consistency.

If all local transactions succeed, the saga completes. If any local transaction fails, the saga must execute a series of **compensating transactions** to revert the changes made by preceding steps, rolling back state in reverse order (LIFO).

## Saga Orchestration vs Saga Choreography

There are two primary ways to coordinate a saga:

### Orchestration
An Orchestration Saga relies on a centralized coordinator service (the **Orchestrator**). The orchestrator acts as a brain, explicitly telling each service which local transaction to execute next, parsing responses, and coordinating compensating rollbacks if a step fails.
* **Pros**: Simple to reason about, centralizes control flow, avoids cyclic service dependencies.
* **Cons**: Introduces a single service coordinate point, can concentrate business logic.

### Choreography
A Choreography Saga uses event-driven coordination. Each service executes its local transaction, and publishes an event (e.g. `OrderCreated`). Other services subscribe to these events and execute their logic in response (e.g. the Payment Service charges the card when it detects `OrderCreated`, then emits `PaymentSucceeded`).
* **Pros**: Highly decoupled, no single coordinator bottleneck.
* **Cons**: Difficult to trace the execution path, potential for cyclic dependencies, complex to reason about under error conditions.

## Compensating Transactions: Reverting State

Unlike 2PC, which aborts transactions in memory, a Saga commits data to the database at every step. Therefore, a rollback cannot rely on a database-level undo. Instead, developers must explicitly design a compensating transaction for every forward step:
* If the forward step is `ChargeCard($100)`, the compensating transaction is `RefundCard($100)`.
* If the forward step is `ReserveInventory(ItemA)`, the compensating transaction is `ReleaseInventory(ItemA)`.

### The Lack of Isolation
Because intermediate steps commit their data immediately, other concurrent requests can read the intermediate state. This violates the **Isolation** property of ACID, leading to potential anomalies:
* **Dirty Reads**: Another transaction might see and act on the order created by step 1, even if the saga eventually fails and rolls back.
* **Lost Updates**: An intermediate step changes a database record, which is overwritten by another concurrent task before the compensation runs.

To mitigate these, developers apply application-level defense patterns, such as using an **Outbox Pattern** to safely send events, writing idempotent event handlers, and utilizing reconciliation loops to locate and resolve mismatched states asynchronously.

## Further Reading

* [Sagas Paper by Hector Garcia-Molina and Kenneth Salem](https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf)
* [Microservice Patterns: Saga Pattern](https://microservices.io/patterns/data/saga.html)
* [Designing Data-Intensive Applications by Martin Kleppmann](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/)
