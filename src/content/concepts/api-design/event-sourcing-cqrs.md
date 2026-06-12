---
title: Event Sourcing & CQRS
slug: event-sourcing-cqrs
summary: "Understand Event Sourcing and CQRS patterns, focusing on state reconstruction, snapshots, separation of read/write pathways, and eventual consistency."
difficulty: advanced
chapterId: api-design
domain: API Design
estimatedMinutes: 15
prerequisites: [change-data-capture, message-queues]
related: [database-replication, wal-aries-recovery]
seo_title: "Event Sourcing & CQRS: Patterns, Reconstruction, and Architectures"
seo_description: "Learn how to build architectures using Event Sourcing and CQRS. Covers aggregate root hydration, snapshots, read/write segregation, and eventual consistency."
canonical_url: "/concepts/event-sourcing-cqrs"
citations:
  - title: "Event Sourcing"
    author: "Martin Fowler"
    chapter: "Patterns of Enterprise Application Architecture / Event Sourcing"
    external_link: "https://martinfowler.com/eaaDev/EventSourcing.html"
  - title: "Domain-Driven Design: Tackling Complexity in the Heart of Software"
    author: "Eric Evans"
    chapter: "Chapter 6: The Life Cycle of a Domain Object"
    external_link: "https://www.oreilly.com/library/view/domain-driven-design-tackling/0321125215/"
code_examples:
  - language: go
    title: Event Store with State Reconstruction, Snapshots, and CQRS Projections
    code: |
      package main

      import (
      	"encoding/json"
      	"fmt"
      	"sync"
      	"time"
      )

      // Event represents a domain event
      type Event struct {
      	ID        string
      	AggregateID string
      	Type      string
      	Version   int
      	Payload   []byte
      	CreatedAt time.Time
      }

      // Snapshot represents a snapshot of the aggregate state at a given version
      type Snapshot struct {
      	AggregateID string
      	Version     int
      	Data        []byte
      }

      // AccountAggregate represents a bank account state
      type AccountAggregate struct {
      	ID      string
      	Balance int
      	Version int
      }

      // Event Store
      type EventStore struct {
      	mu        sync.RWMutex
      	events    map[string][]Event
      	snapshots map[string]Snapshot
      }

      func NewEventStore() *EventStore {
      	return &EventStore{
      		events:    make(map[string][]Event),
      		snapshots: make(map[string]Snapshot),
      	}
      }

      // AppendEvents appends new events for an aggregate, checking version conflicts
      func (es *EventStore) AppendEvents(aggID string, expectedVersion int, newEvents []Event) error {
      	es.mu.Lock()
      	defer es.mu.Unlock()

      	history := es.events[aggID]
      	currentVersion := 0
      	if len(history) > 0 {
      		currentVersion = history[len(history)-1].Version
      	}

      	if currentVersion != expectedVersion {
      		return fmt.Errorf("concurrent modification error: expected version %d, got %d", expectedVersion, currentVersion)
      	}

      	for _, event := range newEvents {
      		es.events[aggID] = append(es.events[aggID], event)
      	}
      	return nil
      }

      // SaveSnapshot saves an aggregate snapshot
      func (es *EventStore) SaveSnapshot(aggID string, version int, data []byte) {
      	es.mu.Lock()
      	es.snapshots[aggID] = Snapshot{
      		AggregateID: aggID,
      		Version:     version,
      		Data:        data,
      	}
      	es.mu.Unlock()
      }

      // ReadEvents returns events for an aggregate starting after a specific version
      func (es *EventStore) GetEventsForAggregate(aggID string, afterVersion int) []Event {
      	es.mu.RLock()
      	defer es.mu.RUnlock()

      	var result []Event
      	for _, event := range es.events[aggID] {
      		if event.Version > afterVersion {
      			result = append(result, event)
      		}
      	}
      	return result
      }

      // Apply updates the aggregate balance according to the event
      func (acc *AccountAggregate) Apply(event Event) {
      	switch event.Type {
      	case "AccountOpened":
      		acc.ID = event.AggregateID
      		acc.Balance = 0
      	case "MoneyDeposited":
      		var amount int
      		_ = json.Unmarshal(event.Payload, &amount)
      		acc.Balance += amount
      	case "MoneyWithdrawn":
      		var amount int
      		_ = json.Unmarshal(event.Payload, &amount)
      		acc.Balance -= amount
      	}
      	acc.Version = event.Version
      }

      // ReconstructState recreates aggregate state from snapshot + remaining events
      func (es *EventStore) ReconstructState(aggID string) (*AccountAggregate, error) {
      	es.mu.RLock()
      	snapshot, hasSnapshot := es.snapshots[aggID]
      	es.mu.RUnlock()

      	acc := &AccountAggregate{}
      	startVersion := 0

      	if hasSnapshot {
      		if err := json.Unmarshal(snapshot.Data, &acc); err != nil {
      			return nil, err
      		}
      		startVersion = snapshot.Version
      	}

      	events := es.GetEventsForAggregate(aggID, startVersion)
      	for _, event := range events {
      		acc.Apply(event)
      	}

      	return acc, nil
      }

      // CQRS Read Model View Table
      type AccountView struct {
      	AccountID string
      	Balance   int
      	LastUpdated time.Time
      }

      // CQRS Projector updates the read database
      type Projector struct {
      	mu        sync.RWMutex
      	readModel map[string]AccountView
      }

      func (p *Projector) Project(event Event) {
      	p.mu.Lock()
      	defer p.mu.Unlock()

      	view, exists := p.readModel[event.AggregateID]
      	if !exists {
      		view = AccountView{AccountID: event.AggregateID}
      	}

      	switch event.Type {
      	case "AccountOpened":
      		view.Balance = 0
      	case "MoneyDeposited":
      		var amount int
      		_ = json.Unmarshal(event.Payload, &amount)
      		view.Balance += amount
      	case "MoneyWithdrawn":
      		var amount int
      		_ = json.Unmarshal(event.Payload, &amount)
      		view.Balance -= amount
      	}

      	view.LastUpdated = event.CreatedAt
      	p.readModel[event.AggregateID] = view
      }

      func main() {
      	store := NewEventStore()
      	projector := &Projector{readModel: make(map[string]AccountView)}

      	aggID := "acc_1001"

      	payload1, _ := json.Marshal(0)
      	events := []Event{
      		{ID: "e1", AggregateID: aggID, Type: "AccountOpened", Version: 1, Payload: payload1, CreatedAt: time.Now()},
      	}
      	_ = store.AppendEvents(aggID, 0, events)
      	projector.Project(events[0])

      	payload2, _ := json.Marshal(500)
      	events = []Event{
      		{ID: "e2", AggregateID: aggID, Type: "MoneyDeposited", Version: 2, Payload: payload2, CreatedAt: time.Now()},
      	}
      	_ = store.AppendEvents(aggID, 1, events)
      	projector.Project(events[0])

      	currentAggregate, _ := store.ReconstructState(aggID)
      	snapshotData, _ := json.Marshal(currentAggregate)
      	store.SaveSnapshot(aggID, 2, snapshotData)

      	payload3, _ := json.Marshal(100)
      	events = []Event{
      		{ID: "e3", AggregateID: aggID, Type: "MoneyWithdrawn", Version: 3, Payload: payload3, CreatedAt: time.Now()},
      	}
      	_ = store.AppendEvents(aggID, 2, events)
      	projector.Project(events[0])

      	reconstructed, _ := store.ReconstructState(aggID)
      	fmt.Printf("Reconstructed Balance: $%d (Version: %d)\n", reconstructed.Balance, reconstructed.Version)

      	projector.mu.RLock()
      	view := projector.readModel[aggID]
      	projector.mu.RUnlock()
      	fmt.Printf("Read Model View Balance: $%d (Last Updated: %s)\n", view.Balance, view.LastUpdated.Format("15:04:05"))
      }
---

## The Concept

In traditional database designs, applications store the current state of domain objects directly in relational tables. For example, a user's bank account is represented by a single database row containing a `balance` column. When a transaction occurs, the application updates that column. However, this approach discards the historical context: you know the current state, but you have lost the historical timeline of updates that led to that state.

**Event Sourcing** resolves this limitation by defining application state entirely as an append-only log of immutable domain events. Instead of storing the state value itself, the database stores the record of changes (such as `AccountOpened`, `MoneyDeposited`, or `MoneyWithdrawn`). 

To read or update this system efficiently, engineers combine Event Sourcing with **CQRS** (Command Query Responsibility Segregation), separating the write model pathways from the read model pathways.

<svg viewBox="0 0 580 300" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="22" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Event Sourcing &amp; CQRS Architecture Flow</text>
  <text x="110" y="55" fill="#bf616a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">WRITE PATH (Commands)</text>
  <rect x="20" y="70" width="180" height="40" rx="4" fill="#2e3440" stroke="#bf616a" stroke-width="1"/>
  <text x="110" y="88" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">Command Handler (Write Model)</text>
  <text x="110" y="100" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Validate and Apply Domain Logic</text>
  <rect x="20" y="150" width="180" height="40" rx="4" fill="#2e3440" stroke="#ebcb8b" stroke-width="1"/>
  <text x="110" y="168" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">Event Store (Append-Only Log DB)</text>
  <text x="110" y="180" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Immutable Events (e.g., Deposited)</text>
  <path d="M 110 110 L 110 150" stroke="#bf616a" stroke-width="1.2" marker-end="url(#arrow-red)"/>
  <text x="115" y="134" fill="#bf616a" font-family="sans-serif" font-size="8">1. Append Event</text>
  <rect x="200" y="210" width="180" height="30" rx="4" fill="#2e3440" stroke="#d8dee9" stroke-width="1"/>
  <text x="290" y="228" fill="#d8dee9" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">Event Bus / Broker</text>
  <path d="M 110 190 L 110 225 L 200 225" stroke="#ebcb8b" stroke-width="1.2" fill="none" marker-end="url(#arrow-yellow)"/>
  <text x="120" y="208" fill="#ebcb8b" font-family="sans-serif" font-size="8">2. Publish Event</text>
  <text x="470" y="55" fill="#a3be8c" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">READ PATH (Queries)</text>
  <rect x="380" y="70" width="180" height="40" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1"/>
  <text x="470" y="90" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">Read DB (PostgreSQL, Elasticsearch)</text>
  <text x="470" y="102" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Optimized Query View Tables</text>
  <rect x="380" y="150" width="180" height="40" rx="4" fill="#2e3440" stroke="#88c0d0" stroke-width="1"/>
  <text x="470" y="168" fill="#88c0d0" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">Projector (Event Handler)</text>
  <text x="470" y="180" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Updates read database views</text>
  <path d="M 380 225 L 470 225 L 470 190" stroke="#d8dee9" stroke-width="1.2" fill="none" marker-end="url(#arrow-white)"/>
  <text x="410" y="215" fill="#d8dee9" font-family="sans-serif" font-size="8">3. Deliver</text>
  <path d="M 470 150 L 470 110" stroke="#88c0d0" stroke-width="1.2" marker-end="url(#arrow-blue)"/>
  <text x="475" y="134" fill="#88c0d0" font-family="sans-serif" font-size="8">4. Project View</text>
  <line x1="290" y1="90" x2="20" y2="90" stroke="#4c566a" stroke-width="1.2" stroke-dasharray="3 3"/>
  <line x1="290" y1="90" x2="380" y2="90" stroke="#4c566a" stroke-width="1.2" stroke-dasharray="3 3"/>
  <text x="290" y="85" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">UI Issues Commands &amp; Reads Views</text>
  <defs>
    <marker id="arrow-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#bf616a"/>
    </marker>
    <marker id="arrow-yellow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#ebcb8b"/>
    </marker>
    <marker id="arrow-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#88c0d0"/>
    </marker>
    <marker id="arrow-white" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#d8dee9"/>
    </marker>
  </defs>
</svg>

---

## Practical Analogy

Consider the difference between a simple score counter and a full accounting general ledger:

* **Traditional CRUD databases** are like a scoreboard at a basketball game. When a team scores two points, the referee updates the board from 80 to 82. The scoreboard only tracks the current score. It has no memory of who scored the points, when they were scored, or if a scoring mistake was made and corrected.
* **Event Sourcing** is like the official scorekeeper's ledger. It lists every event: Player A scores 2 points (Version 1), Player B blocks a shot (Version 2), Player C scores 3 points (Version 3). You can calculate the final score (the state) at any time by adding up all the scoring events in the ledger. This preserves a perfect audit log.

---

## Aggregate State Reconstruction

In Event Sourcing, the core business entities are modeled as Domain-Driven Design (**DDD**) **aggregate roots**. When an application processes a new command (for example, withdrawing money), it cannot trust raw memory: it must first load the aggregate root's current state to validate business rules (e.g. ensuring the balance does not drop below zero).

The application reconstructs state using a process called **hydration**:
1. The application queries the event database for all events associated with the aggregate ID.
2. The application instantiates a blank aggregate object.
3. The application iterates through the historical events in sequential order, applying each event's state changes to the aggregate object.
4. Once the last event is applied, the aggregate is fully hydrated and represents the exact current state.

### Snapshots for Performance Optimization
As an system runs, an aggregate root can accumulate thousands of events. Replaying all these events on every single write operation introduces significant CPU and database latency.

To optimize hydration, systems implement **snapshots**:
* Every X events (for example, every 100 events), the system serializes the hydrated aggregate state and writes it to a dedicated snapshot store.
* During the next hydration, the application reads the latest snapshot.
* The application then queries and replays only the events that occurred after the snapshot's version, reducing the hydration cost from `O(N)` events to `O(1)` operations.

---

## Separating Read and Write Paths (CQRS)

Because the event store is optimized for high-speed sequential append-only writes, querying it directly for application views (such as list filters or search fields) is extremely complex. This is where **CQRS** is applied. CQRS splits the application into two distinct execution pathways:

* **Command Path (Writes)**: Focuses exclusively on business operations and state updates. It validates commands, executes domain logic on the aggregate, and writes new events to the event store. It does not return query data, only success or failure.
* **Query Path (Reads)**: Focuses exclusively on data retrieval and visualization. It queries read-optimized database views (such as a denormalized SQL table or an Elasticsearch index). It never modifies data.

### Synchronization Pipelines and Projectors
To keep the read models in sync with the event store, systems build synchronization pipelines. As the event store appends new events, it publishes them to an event broker. 

A consumer process, known as a **projector** or event handler, listens to the event stream. The projector reads each incoming event, updates the corresponding read-optimized database tables (e.g., updating a customer address table when an `AddressChanged` event is read), and commits the change.

---

## Consistency Realities and UI Design

Because read model updates happen asynchronously after the event store write is complete, systems built on Event Sourcing and CQRS are **eventually consistent**. There is a small latency window between the event being appended to the write log and the projector updating the read database.

This latency requires engineers to adapt their user interface designs:
* **Optimistic UI Updates**: The frontend immediately updates the UI layout assuming success when a user submits a command, rather than waiting for the read model projection to sync.
* **Command Validation Feedback**: The command API returns validation updates immediately, letting the user know the command was accepted, while the background workers handle final database alignment.

---

## Event Schema Evolution and Upcasting

Since event logs are immutable, they cannot be updated or restructured when application requirements change. If a developer alters an event schema (for example, splitting a `Name` string property into separate `FirstName` and `LastName` properties), legacy events in the database will crash modern deserializers.

To handle schema evolution, applications implement two patterns:

* **Upcasting**: An upcaster is a middleware component that intercepts old events during the database read operation before they reach the aggregate. The upcaster dynamically transforms the old JSON structure into the new schema format on the fly, avoiding data migrations.
* **Event Migration**: If upcasting introduces too much runtime overhead, background migrations copy, transform, and rewrite historical events to a new version of the event log database.

---

## Further Reading

* [Martin Fowler: Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) — The foundational article defining the patterns and trade-offs of event-driven architectures.
* [CQRS Documents by Greg Young](https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf) — Architectural whitepapers detailing the segregation of read and write responsibilities.
* [Microsoft Architecture Guide: CQRS Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs) — Best practices for implementing eventually consistent query models in cloud systems.
