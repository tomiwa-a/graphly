---
title: WAL & ARIES Recovery
slug: wal-aries-recovery
summary: "Learn the mechanisms of Write-Ahead Logging (WAL) and the ARIES algorithm used to restore database durability and transactional integrity after system crashes."
difficulty: advanced
chapterId: databases
domain: Databases
estimatedMinutes: 20
prerequisites: [acid-transactions-isolation, file-descriptors]
related: [b-plus-trees, mmap-page-cache]
seo_title: "WAL and ARIES Database Recovery Algorithms | Graphly"
seo_description: "Explore the Write-Ahead Logging (WAL) protocol and the three-phase ARIES recovery algorithm (Analysis, Redo, and Undo) used to restore databases after system crashes."
canonical_url: "/concepts/wal-aries-recovery"
citations:
  - title: "ARIES: A Transaction Recovery Method Supporting Fine-Granularity Locking and Partial Rollbacks Using Write-Ahead Logging"
    author: "C. Mohan, Don Haderle, Bruce Lindsay, Hamid Pirahesh, and Peter Schwarz"
    chapter: "ACM Transactions on Database Systems (TODS)"
    page_range: "94-162"
    external_link: "https://dl.acm.org/doi/10.1145/128765.128770"
  - title: "Database Management Systems"
    author: "Raghu Ramakrishnan and Johannes Gehrke"
    chapter: "Chapter 18: Crash Recovery"
    page_range: "579-610"
    external_link: "https://pages.cs.wisc.edu/~dbbook/"
code_examples:
  - language: go
    title: Three-Phase ARIES Recovery Engine Simulator
    code: |
      package main

      import (
      	"fmt"
      )

      type LogType string

      const (
      	BEGIN      LogType = "BEGIN"
      	UPDATE     LogType = "UPDATE"
      	COMMIT     LogType = "COMMIT"
      	ABORT      LogType = "ABORT"
      	CLR        LogType = "CLR" // Compensation Log Record
      	CHECKPOINT LogType = "CHECKPOINT"
      )

      type LogRecord struct {
      	LSN         int
      	TxID        string
      	Type        LogType
      	PageID      int
      	RedoInfo    string
      	UndoInfo    string
      	PrevLSN     int
      	UndoNextLSN int // Used in CLR to skip already undone operations
      }

      type TxInfo struct {
      	TxID    string
      	LastLSN int
      	Status  string // "active" or "committed"
      }

      func simulateRecovery(log []LogRecord, startCheckpointLSN int) {
      	fmt.Println("--- STARTING ARIES RECOVERY PROCESS ---")

      	// 1. ANALYSIS PHASE
      	fmt.Println("\n[Phase 1] Entering Analysis Phase...")
      	txTable := make(map[string]*TxInfo)
      	dpt := make(map[int]int) // Dirty Page Table: PageID -> RecLSN

      	// Scan forward from checkpoint LSN
      	for i := 0; i < len(log); i++ {
      		rec := log[i]
      		if rec.LSN < startCheckpointLSN {
      			continue
      		}

      		fmt.Printf("Analyzing Log LSN %d (Type: %s, Tx: %s)\n", rec.LSN, rec.Type, rec.TxID)

      		if rec.Type == CHECKPOINT {
      			// In a real DB, checkpoint contains active transactions and dirty page tables
      			continue
      		}

      		// Update Transaction Table
      		if rec.Type == BEGIN {
      			txTable[rec.TxID] = &TxInfo{TxID: rec.TxID, LastLSN: rec.LSN, Status: "active"}
      		} else if rec.Type == COMMIT {
      			if info, exists := txTable[rec.TxID]; exists {
      				info.Status = "committed"
      				info.LastLSN = rec.LSN
      			}
      		} else if rec.Type == ABORT {
      			if info, exists := txTable[rec.TxID]; exists {
      				info.LastLSN = rec.LSN
      			}
      		} else {
      			// Update or CLR record
      			if _, exists := txTable[rec.TxID]; !exists && rec.TxID != "" {
      				txTable[rec.TxID] = &TxInfo{TxID: rec.TxID, LastLSN: rec.LSN, Status: "active"}
      			} else if rec.TxID != "" {
      				txTable[rec.TxID].LastLSN = rec.LSN
      			}

      			// Update Dirty Page Table
      			if rec.PageID != 0 {
      				if _, exists := dpt[rec.PageID]; !exists {
      					dpt[rec.PageID] = rec.LSN // RecLSN is the first LSN that dirtied this page
      				}
      			}
      		}
      	}

      	// Filter out committed transactions to find "Loser" transactions
      	losers := make(map[string]int) // Loser TxID -> LastLSN
      	for txID, tx := range txTable {
      		if tx.Status == "active" {
      			losers[txID] = tx.LastLSN
      		}
      	}

      	fmt.Println("Analysis Complete.")
      	fmt.Printf("Dirty Page Table: %v\n", dpt)
      	fmt.Printf("Loser Transactions (to undo): %v\n", losers)

      	// 2. REDO PHASE (REPEATING HISTORY)
      	fmt.Println("\n[Phase 2] Entering Redo Phase...")
      	
      	// Find the smallest RecLSN in the Dirty Page Table
      	minRecLSN := 999999
      	for _, recLSN := range dpt {
      		if recLSN < minRecLSN {
      			minRecLSN = recLSN
      		}
      	}
      	if len(dpt) == 0 {
      		minRecLSN = startCheckpointLSN
      	}

      	fmt.Printf("Replaying history starting from LSN %d...\n", minRecLSN)
      	for i := 0; i < len(log); i++ {
      		rec := log[i]
      		if rec.LSN < minRecLSN {
      			continue
      		}

      		if rec.Type == UPDATE || rec.Type == CLR {
      			fmt.Printf("Redoing action: LSN %d, Re-applying: %s on Page %d\n", rec.LSN, rec.RedoInfo, rec.PageID)
      		}
      	}
      	fmt.Println("Redo Phase Complete. Database state is now synchronized with crash point.")

      	// 3. UNDO PHASE (ROLLING BACK LOSERS)
      	fmt.Println("\n[Phase 3] Entering Undo Phase...")
      	
      	// Keep track of the next LSN to undo for each active transaction
      	toUndo := make(map[string]int)
      	for txID, lastLSN := range losers {
      		toUndo[txID] = lastLSN
      	}

      	// Process backwards
      	for len(toUndo) > 0 {
      		// Find the maximum LSN among all transactions we need to undo
      		maxLSN := -1
      		var maxTxID string
      		for txID, lsn := range toUndo {
      			if lsn > maxLSN {
      				maxLSN = lsn
      				maxTxID = txID
      			}
      		}

      		if maxLSN == -1 {
      			break
      		}

      		// Find the corresponding log record
      		var rec LogRecord
      		found := false
      		for _, r := range log {
      			if r.LSN == maxLSN {
      				rec = r
      				found = true
      				break
      			}
      		}

      		if !found {
      			delete(toUndo, maxTxID)
      			continue
      		}

      		fmt.Printf("Undoing record: LSN %d (Tx: %s, Type: %s)\n", rec.LSN, rec.TxID, rec.Type)

      		if rec.Type == UPDATE {
      			// Undo update and write CLR
      			clrLSN := len(log) + 100 // Simulated new LSN
      			fmt.Printf("  -> Undoing change: %s on Page %d. Appending CLR LSN %d (UndoNextLSN: %d)\n", 
      				rec.UndoInfo, rec.PageID, clrLSN, rec.PrevLSN)
      			
      			if rec.PrevLSN == 0 {
      				// Finished undoing this transaction
      				fmt.Printf("Transaction %s fully rolled back.\n", rec.TxID)
      				delete(toUndo, maxTxID)
      			} else {
      				toUndo[maxTxID] = rec.PrevLSN
      			}
      		} else if rec.Type == CLR {
      			// Skip already undone steps using UndoNextLSN
      			if rec.UndoNextLSN == 0 {
      				fmt.Printf("CLR LSN %d points to start. Transaction %s fully rolled back.\n", rec.LSN, rec.TxID)
      				delete(toUndo, maxTxID)
      			} else {
      				fmt.Printf("  -> Skipping to LSN %d (UndoNextLSN)\n", rec.UndoNextLSN)
      				toUndo[maxTxID] = rec.UndoNextLSN
      			}
      		} else if rec.Type == BEGIN {
      			// Reached the start of the transaction
      			fmt.Printf("Transaction %s reached BEGIN. Fully rolled back.\n", rec.TxID)
      			delete(toUndo, maxTxID)
      		} else {
      			// For commits or non-updates, follow PrevLSN back
      			if rec.PrevLSN == 0 {
      				delete(toUndo, maxTxID)
      			} else {
      				toUndo[maxTxID] = rec.PrevLSN
      			}
      		}
      	}
      	fmt.Println("\nUndo Phase Complete. Recovery Finished successfully.")
      }

      func main() {
      	// Simulated log history leading to a crash
      	logHistory := []LogRecord{
      		{LSN: 10, TxID: "T1", Type: BEGIN, PrevLSN: 0},
      		{LSN: 20, TxID: "T1", Type: UPDATE, PageID: 1, RedoInfo: "val=A", UndoInfo: "val=oldA", PrevLSN: 10},
      		{LSN: 30, TxID: "T2", Type: BEGIN, PrevLSN: 0},
      		{LSN: 40, TxID: "T2", Type: UPDATE, PageID: 2, RedoInfo: "val=B", UndoInfo: "val=oldB", PrevLSN: 30},
      		{LSN: 50, TxID: "T1", Type: COMMIT, PrevLSN: 20}, // T1 is committed
      		{LSN: 60, TxID: "", Type: CHECKPOINT, PrevLSN: 0}, // Fuzzy Checkpoint LSN 60
      		{LSN: 70, TxID: "T3", Type: BEGIN, PrevLSN: 0},
      		{LSN: 80, TxID: "T3", Type: UPDATE, PageID: 1, RedoInfo: "val=C", UndoInfo: "val=A", PrevLSN: 70},
      		{LSN: 90, TxID: "T2", Type: UPDATE, PageID: 3, RedoInfo: "val=D", UndoInfo: "val=oldD", PrevLSN: 40},
      		// <-- SYSTEM CRASHES HERE (T2 and T3 are active loser transactions)
      	}

      	simulateRecovery(logHistory, 60)
      }
---

## The Concept

Modern databases prioritize durability: once a transaction commits, its changes must survive power loss, operating system crashes, or hardware failure. However, writing every modified memory page directly to disk at commit time is too slow. Disk writes are slow, random operations, and forcing them immediately would bottleneck database throughput.

To achieve fast transaction processing alongside data safety, databases use a hybrid model:
1. They keep active data pages in volatile RAM inside a **buffer pool**.
2. They append transaction records sequentially to an append-only file on disk called the **Write-Ahead Log (WAL)**.

Because sequential disk appends are orders of magnitude faster than random writes to data pages, the database can safely return a success response to the client once the log records are flushed to disk. The actual modified pages in RAM (called **dirty pages**) are written back to disk asynchronously in the background.

If the system crashes before dirty pages are flushed to disk, the database uses the WAL to rebuild the in-memory state during startup. The industry standard protocol for coordinating this process is the **ARIES** (Algorithms for Recovery and Isolation Exploiting Semantics) recovery method.

---

## The WAL Protocol: Steal and No-Force

To balance performance and crash recovery, databases choose specific buffer pool management policies:

* **Steal vs. No-Steal**: A **steal** policy allows the buffer pool manager to evict a dirty page containing uncommitted transaction modifications to make room for other queries. A **no-steal** policy forbids this. A steal policy yields better memory utilization but requires a mechanism to undo uncommitted changes if the system crashes.
* **Force vs. No-Force**: A **no-force** policy allows a transaction to commit without forcing its modified pages to be flushed to disk immediately. A **force** policy requires flushing all modified pages before returning success. A no-force policy increases write performance but requires a redo mechanism to recover committed updates that were only stored in volatile RAM.

Most production databases choose a **Steal/No-Force** engine layout because it maximizes performance and memory utilization. The recovery engine relies on the WAL to handle the complexity:
* **Redo**: Replays committed updates that were lost because of the No-Force policy.
* **Undo**: Reverses uncommitted changes that were written to disk because of the Steal policy.

### The Rule of Write-Ahead Logging
For a Steal/No-Force system to remain safe, it must enforce the fundamental WAL invariant:
> **The database must flush the log record representing a page update to disk before the actual modified data page is written to disk.**

If this invariant is violated, and the database writes the modified page to disk but crashes before writing the corresponding log record, the database cannot undo the uncommitted change during recovery, violating atomicity.

---

## ARIES Crash Recovery

When a database using ARIES restarts after a crash, it reads the log file to reconstruct the state of the database at the moment of the crash. The ARIES protocol does this in three successive phases.

<svg viewBox="0 0 580 240" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="22" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Three-Phase ARIES Recovery Timeline</text>
  <line x1="50" y1="100" x2="530" y2="100" stroke="#4c566a" stroke-width="2"/>
  <circle cx="100" cy="100" r="5" fill="#ebcb8b"/>
  <text x="100" y="85" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle">Fuzzy Checkpoint</text>
  <circle cx="180" cy="100" r="5" fill="#a3be8c"/>
  <text x="180" y="85" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Min RecLSN</text>
  <circle cx="450" cy="100" r="5" fill="#bf616a"/>
  <text x="450" y="85" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle">System Crash</text>
  <circle cx="140" cy="100" r="4" fill="#81a1c1"/>
  <text x="140" y="115" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Loser Tx Begin</text>
  <path d="M 100 135 L 450 135" stroke="#88c0d0" stroke-width="2" fill="none" marker-end="url(#ar1)"/>
  <text x="275" y="130" fill="#88c0d0" font-family="sans-serif" font-size="9" text-anchor="middle">1. Analysis Phase (Scan Forward)</text>
  <path d="M 180 165 L 450 165" stroke="#a3be8c" stroke-width="2" fill="none" marker-end="url(#ar1)"/>
  <text x="315" y="160" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">2. Redo Phase (Scan Forward - Repeat History)</text>
  <path d="M 450 195 L 140 195" stroke="#bf616a" stroke-width="2" fill="none" marker-end="url(#ar1)"/>
  <text x="295" y="190" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle">3. Undo Phase (Scan Backward - Rollback Losers)</text>
  <defs>
    <marker id="ar1" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#d8dee9"/>
    </marker>
  </defs>
</svg>

### 1. The Analysis Phase
The analysis phase reconstructs the state of the database at the time of the crash. It scans the log **forward** starting from the last checkpoint record. During this scan, it builds two key dynamic tables:
* **Transaction Table**: Lists all transactions that were active when the system crashed.
* **Dirty Page Table (DPT)**: Lists all pages in RAM that were modified but not flushed to disk at the time of the crash. For each page, it tracks the oldest unwritten log sequence number, the `RecLSN` (Recovery LSN).

At the end of this phase, transactions marked as active are classified as **loser transactions** because they did not write a commit log before the crash. These transactions will be rolled back in the Undo phase.

### 2. The Redo Phase (Repeating History)
The redo phase restores the database state to the exact moment of the crash. Starting at the oldest unwritten modification identified in the Analysis phase (the minimum `RecLSN` in the DPT), ARIES scans the log **forward** and replays all updates.

This is called **repeating history** because the engine replays updates for all transactions, including those that were eventually aborted or uncommitted at the crash point. This ensures that any page splits, allocation steps, or changes are restored to their physical state before rollback operations begin, simplifying recovery logic.

To avoid redundant disk writes, ARIES skips redoing a log record if:
* The page is not listed in the Dirty Page Table.
* The page is in the DPT, but the log record LSN is less than the page's `RecLSN`.
* The actual page LSN retrieved from disk matches or exceeds the log record LSN, indicating the change was already written.

### 3. The Undo Phase (Rolling Back Losers)
Once the database state is restored to the crash point, ARIES reverses the changes made by loser transactions. The engine scans the log **backward** from the crash point, processing records for all uncommitted transactions.

As ARIES rolls back changes, it performs the inverse of each update operation and writes a **Compensation Log Record (CLR)** to the log. A CLR record contains:
* The details of the undone operation.
* An `UndoNextLSN` field pointing to the next LSN that needs to be undone for the transaction. This pointer is copied from the undone record's `PrevLSN`.

The `UndoNextLSN` field prevents duplicate rollback work. If the database crashes again during the recovery process, the next recovery run will read the CLRs in the Redo phase, and the Undo phase will use the `UndoNextLSN` pointers to resume rollback from where it left off, avoiding repeating previous undo operations.

---

## Recovery Optimizations

### Fuzzy Checkpointing
Parsing a log file from start to finish is slow on large databases. To limit recovery time, databases write periodic checkpoints. A naive checkpoint pauses all transactions, flushes all dirty pages to disk, and writes a checkpoint record. This degrades transaction throughput.

To avoid write spikes, ARIES uses **fuzzy checkpointing**:
1. A checkpoint record is written containing the current Transaction Table and Dirty Page Table, but the database does not force dirty pages to disk.
2. The database continues processing active transactions.
3. The background writer thread continues flushing dirty pages to disk over time.

During crash recovery, ARIES only needs to scan back to the oldest `RecLSN` listed in the checkpoint's Dirty Page Table. Any updates before this point are guaranteed to be flushed to disk, limiting the log segment that must be parsed.

---

## Further Reading

* [The ARIES Recovery Method Paper](https://dl.acm.org/doi/10.1145/128765.128770) — C. Mohan's seminal research paper introducing the ARIES recovery algorithm.
* [Database System Concepts: Crash Recovery](https://db-book.com/) — Textbook chapter detailing WAL protocols, checkpoints, and ARIES recovery steps.
* [PostgreSQL WAL Internals](https://www.postgresql.org/docs/current/wal-internals.html) — The official PostgreSQL guide explaining the design of write-ahead logging.
