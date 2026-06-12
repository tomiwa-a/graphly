---
title: Offset vs Cursor Pagination
slug: pagination-strategies
summary: "Compare offset-based and cursor-based pagination strategies, analyzing database seeks, performance scaling, and page drift anomalies."
difficulty: intermediate
chapterId: api-design
domain: API Design
estimatedMinutes: 12
prerequisites: [http, indexes]
related: [sql-joins]
seo_title: "Pagination Strategies: Offset vs. Cursor Performance"
seo_description: "Deep dive into API pagination. Compare SQL LIMIT OFFSET scans with cursor-based WHERE key seeks, evaluating execution plans and drift anomalies."
canonical_url: "/concepts/pagination-strategies"
citations:
  - title: "SQL Pagination: An Index-Friendly Approach"
    author: "Torsten Grust"
    chapter: "Database Query Engineering"
    page_range: "1-12"
    external_link: "https://sql-performance.com/2015/01/database-design/select-limit-offset-performance"
code_examples:
  - language: go
    title: "Pagination Benchmark: Offset Thrashing vs Cursor Seek Performance"
    code: |
      package main

      import (
          "fmt"
          "time"
      )

      // Record represents a simplified database row structure.
      type Record struct {
          ID   int
          Name string
      }

      // QueryPlan describes how the database planner processes a select request.
      type QueryPlan struct {
          Query        string
          ScanType     string
          RowsScanned  int
          RowsReturned int
      }

      type DatabaseSimulator struct {
          records []Record
      }

      // NewDatabaseSimulator initializes a simulated database table with a size.
      func NewDatabaseSimulator(size int) *DatabaseSimulator {
          records := make([]Record, size)
          for i := 0; i < size; i++ {
              records[i] = Record{
                  ID:   i + 1,
                  Name: fmt.Sprintf("User_%d", i+1),
              }
          }
          return &DatabaseSimulator{records: records}
      }

      // QueryOffset simulates: SELECT * FROM users LIMIT 10 OFFSET 90000
      func (db *DatabaseSimulator) QueryOffset(limit, offset int) ([]Record, QueryPlan, time.Duration) {
          start := time.Now()

          // Simulated Table Scan: loops through items sequentially to discard OFFSET rows.
          scanned := 0
          result := []Record{}

          for i := 0; i < len(db.records); i++ {
              scanned++
              if scanned > offset {
                  result = append(result, db.records[i])
                  if len(result) == limit {
                      break
                  }
              }
          }

          duration := time.Since(start)

          plan := QueryPlan{
              Query:        fmt.Sprintf("SELECT * FROM users LIMIT %d OFFSET %d", limit, offset),
              ScanType:     "SEQUENTIAL INDEX LEAF SCAN (O(N))",
              RowsScanned:  scanned,
              RowsReturned: len(result),
          }

          return result, plan, duration
      }

      // QueryCursor simulates: SELECT * FROM users WHERE id > 90000 ORDER BY id LIMIT 10
      func (db *DatabaseSimulator) QueryCursor(limit, lastSeenID int) ([]Record, QueryPlan, time.Duration) {
          start := time.Now()

          // Simulated B-Tree Index Seek: O(log N) operations to seek the node pointer,
          // then scans only the LIMIT contiguous leaf records.
          btreeLookupComparisons := 17 // log2(100000)
          scanned := btreeLookupComparisons

          result := []Record{}
          
          // Perform simulated binary search on primary key index
          low, high := 0, len(db.records)-1
          foundIdx := -1
          for low <= high {
              mid := (low + high) / 2
              if db.records[mid].ID == lastSeenID {
                  foundIdx = mid
                  break
              } else if db.records[mid].ID < lastSeenID {
                  low = mid + 1
              } else {
                  high = mid - 1
              }
          }

          if foundIdx != -1 {
              for i := foundIdx + 1; i < len(db.records); i++ {
                  scanned++
                  result = append(result, db.records[i])
                  if len(result) == limit {
                      break
                  }
              }
          }

          duration := time.Since(start)

          plan := QueryPlan{
              Query:        fmt.Sprintf("SELECT * FROM users WHERE id > %d ORDER BY id LIMIT %d", lastSeenID, limit),
              ScanType:     "INDEX SEEK + LEAF SCAN (O(log N))",
              RowsScanned:  scanned,
              RowsReturned: len(result),
          }

          return result, plan, duration
      }

      // SimulatePageDrift illustrates data duplicate/skipped anomalies in Offset paging
      func SimulatePageDrift() {
          fmt.Println("--- PAGE DRIFT CONCURRENT WRITE ANOMALY ---")
          
          // Initial db state
          records := []Record{
              {ID: 1, Name: "Alice"},
              {ID: 2, Name: "Bob"},
              {ID: 3, Name: "Charlie"},
              {ID: 4, Name: "David"},
              {ID: 5, Name: "Eve"},
          }

          // Client fetches Page 1 (limit 2, offset 0) -> Alice, Bob
          fmt.Println("Client fetches Page 1 (Offset: LIMIT 2 OFFSET 0):")
          for _, r := range records[0:2] {
              fmt.Printf("  -> %s\n", r.Name)
          }

          // Concurrent write inserts a row at position 0, shifting list items down
          fmt.Println("\n[Concurrent Event]: 'Zach' is inserted at the top!")
          shiftedRecords := []Record{
              {ID: 0, Name: "Zach"},
              {ID: 1, Name: "Alice"},
              {ID: 2, Name: "Bob"},
              {ID: 3, Name: "Charlie"},
              {ID: 4, Name: "David"},
              {ID: 5, Name: "Eve"},
          }

          // Client fetches Page 2 (limit 2, offset 2) -> Bob, Charlie (Bob is duplicate!)
          fmt.Println("Client fetches Page 2 (Offset: LIMIT 2 OFFSET 2):")
          for _, r := range shiftedRecords[2:4] {
              fmt.Printf("  -> %s\n", r.Name)
          }
          fmt.Println("Result: Bob was read twice! (Page Drift Anomaly)\n")

          // Cursor-based approach
          fmt.Println("Client fetches Page 1 (Cursor-based: LIMIT 2, initial query):")
          for _, r := range records[0:2] {
              fmt.Printf("  -> %s\n", r.Name)
          }
          lastSeenID := 2 // Last seen record is Bob (ID 2)

          // Client fetches Page 2 (WHERE ID > 2 LIMIT 2)
          fmt.Printf("Client fetches Page 2 (Cursor: WHERE id > %d LIMIT 2):\n", lastSeenID)
          count := 0
          for _, r := range shiftedRecords {
              if r.ID > lastSeenID {
                  fmt.Printf("  -> %s\n", r.Name)
                  count++
                  if count == 2 {
                      break
                  }
              }
          }
          fmt.Println("Result: Reads Charlie and David correctly. No duplicates!")
      }

      func main() {
          db := NewDatabaseSimulator(100000)

          // 1. Run Offset query at deep offset (row 90,000)
          offsetLimit := 10
          offsetValue := 90000
          _, planOffset, timeOffset := db.QueryOffset(offsetLimit, offsetValue)

          // 2. Run Cursor query at same depth
          cursorLimit := 10
          lastSeenID := 90000
          _, planCursor, timeCursor := db.QueryCursor(cursorLimit, lastSeenID)

          fmt.Printf("OFFSET QUERY:\n  SQL: %s\n  Plan: %s\n  Scanned Rows: %d\n  Time: %v\n\n",
              planOffset.Query, planOffset.ScanType, planOffset.RowsScanned, timeOffset)

          fmt.Printf("CURSOR QUERY:\n  SQL: %s\n  Plan: %s\n  Scanned Rows: %d\n  Time: %v\n\n",
              planCursor.Query, planCursor.ScanType, planCursor.RowsScanned, timeCursor)

          SimulatePageDrift()
      }
---

## What is Pagination?

**Pagination** is the technique of partitioning a massive database query result set into discrete, manageable blocks (pages) before returning them to the client. 

If an application database table contains millions of rows, returning the entire dataset in a single HTTP response will trigger Out-Of-Memory (OOM) crashes, choke network bandwidth, and crash client browsers.

### Real-World Analogy
Imagine reading a massive 1000-page encyclopedia. 
* **Offset pagination** is like someone instructing you: "Go read the entries starting on page 800." Because you do not have bookmarks, you must open the encyclopedia to page 1 and turn every page one-by-one until you reach page 800. If someone slides a new page into page 200 before you finish, the page numbers shift, and you will end up reading the same page twice or skipping an entry entirely.
* **Cursor pagination** is like using a physical bookmark ribbon. You read up to page 50, place the ribbon there, and when you return, you open directly to the bookmark and read from page 51, regardless of how many new pages were inserted or deleted earlier in the book.

---

## Offset Pagination: LIMIT & OFFSET

**Offset-based pagination** is the traditional pagination strategy. It relies on two numeric parameters: `LIMIT` (the page size) and `OFFSET` (the number of rows to skip).

A typical client SQL request looks like:

```sql
SELECT * FROM users ORDER BY created_at DESC LIMIT 10 OFFSET 90000;
```

### The Database Scan Mechanism
To execute a `LIMIT M OFFSET N` statement, the database storage engine cannot simply jump directly to row `N`. Instead, it must:
1. Access the index or table heap file.
2. Read and discard `N` rows sequentially.
3. Keep the next `M` rows and return them to the client.

This sequential scan results in **`O(N)` execution scaling**, where each subsequent page request becomes slower as the client requests deeper pages.

---

## The Performance Degradation of Offset

As the offset value `N` grows into hundreds of thousands, query performance degrades significantly. 

Even if the sorting column (e.g. `created_at`) is indexed, the database planner must traverse the index leaf pointers sequentially to count up to the offset value, consuming massive CPU and disk I/O cycles. 

In production environments, deep offset paging queries often trigger database thread pool starvation and application timeouts.

---

## Page Drift Anomalies

In addition to poor performance, offset pagination suffers from **page drift** (inconsistent results) caused by concurrent write events:

### Insertion Shift (Duplicates)
1. Client fetches Page 1 (`LIMIT 5 OFFSET 0`) containing items 1 to 5.
2. An admin inserts a new item `0` at the beginning of the table. All existing rows shift down by one index position (item 5 shifts to index position 5).
3. Client requests Page 2 (`LIMIT 5 OFFSET 5`). The database skips indices 0 to 4 (which now includes items `0` to 4) and returns item 5 (which was already read on Page 1). The client sees a duplicate item.

### Deletion Shift (Skipped Items)
1. Client fetches Page 1 (`LIMIT 5 OFFSET 0`) containing items 1 to 5.
2. An admin deletes item 2. All items shift up by one index position (item 6 shifts to index position 4).
3. Client requests Page 2 (`LIMIT 5 OFFSET 5`). The database skips indices 0 to 4, which now contain items 1, 3, 4, 5, 6. The query returns starting from item 7. Item 6 is skipped and never displayed to the user.

---

## Cursor Pagination: Seeking Directly

**Cursor-based pagination** resolves performance and consistency issues by using an immutable, unique, and sequential column (like a primary key ID or UUID combined with a timestamp) as a pointer.

Instead of passing an abstract page offset, the client requests data relative to the last seen record from the previous page:

```sql
SELECT * FROM users WHERE id > 90000 ORDER BY id LIMIT 10;
```

<svg viewBox="0 0 580 240" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="22" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Offset Pagination vs. Cursor Pagination Database Seek</text>
  <text x="145" y="52" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Offset-Based: LIMIT 10 OFFSET 50</text>
  <rect x="50" y="65" width="190" height="70" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1.5"/>
  <text x="145" y="95" fill="#81a1c1" font-family="sans-serif" font-size="10" text-anchor="middle">Scanned &amp; Discarded (50 Rows)</text>
  <text x="145" y="110" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle">O(N) CPU &amp; Disk Reads</text>
  <rect x="50" y="140" width="190" height="35" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="145" y="162" fill="#a3be8c" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Returned: Rows 51 to 60</text>
  <text x="435" y="52" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Cursor-Based: WHERE ID &gt; 50 LIMIT 10</text>
  <rect x="340" y="65" width="190" height="70" rx="4" fill="#2e3440" stroke="#4c566a" stroke-width="1.5" stroke-dasharray="3,3"/>
  <text x="435" y="102" fill="#4c566a" font-family="sans-serif" font-size="10" text-anchor="middle">Skipped Entirely (0 Reads)</text>
  <path d="M 310 65 L 340 145" stroke="#88c0d0" stroke-width="2" fill="none" marker-end="url(#arr3)"/>
  <text x="300" y="105" fill="#88c0d0" font-family="sans-serif" font-size="9" text-anchor="middle" transform="rotate(70, 300, 105)">O(log N) Seek</text>
  <rect x="340" y="140" width="190" height="35" rx="4" fill="#3b4252" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="435" y="162" fill="#a3be8c" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Returned: Rows 51 to 60</text>
  <text x="145" y="200" fill="#bf616a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Total Scanned: 60 Records</text>
  <text x="435" y="200" fill="#a3be8c" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Total Scanned: 10 Records</text>
  <defs>
    <marker id="arr3" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#88c0d0"/>
    </marker>
  </defs>
</svg>

### The Index Seek Advantage
Because the query filter uses a strict inequality comparison (`WHERE id > 90000`) on an indexed column, the database performs an **`O(log N)` B-Tree index seek**. It traverses direct parent-to-child nodes to find the node pointing to `id=90000` in microseconds, then scans exactly the next `LIMIT` rows sequentially from that leaf. 

This guarantees constant-time page lookup speeds regardless of query depth.

---

## Statelessness and State Propagation

Cursor-based pagination enforces clean stateless REST standards by embedding state indicators inside server response bodies. 

Instead of forcing the client application to calculate offset numbers dynamically, the server generates the URL for the next page of data, encoding the last record's ID into the query string:

```json
{
  "data": [
    {"id": 90009, "name": "User_90009"},
    {"id": 90010, "name": "User_90010"}
  ],
  "paging": {
    "next": "/api/users?limit=10&cursor=90010"
  }
}
```

This self-describing response model isolates pagination execution details on the server. If the cursor structure changes later (e.g. switching from integer IDs to encrypted tokens), client code remains unchanged.

---

## Real-World Limits of Cursors

While cursor pagination is faster and more reliable, it introduces trade-offs:

* **No Random Page Jumps**: Under cursor pagination, a client cannot jump directly to an arbitrary page (e.g. "Go directly to Page 42"). To display Page 42, the client must traverse pages 1 through 41 to obtain the cursor value for page 42. This makes cursors ideal for infinite scrolls (like social media feeds) but unsuitable for tabular search panels that require jumps.
* **Complex Multi-Column Sorts**: If sorting by multiple columns (e.g. sorting by name, then by updated timestamp), the cursor must combine both values (e.g. encoding name and timestamp into a single base64 string). The database query must then construct compound inequality clauses (e.g. `WHERE (name > last_name) OR (name = last_name AND timestamp > last_timestamp)`), which requires complex composite index designs.

---

## Further Reading

- [SQL Pagination: An Index-Friendly Approach](https://sql-performance.com/2015/01/database-design/select-limit-offset-performance) — Markus Winand's analysis of index usage in LIMIT-OFFSET queries vs Keyset paging.
- [Database Indexing Mechanics](https://use-the-index-luke.com/) — A guide on B-Tree index traversal, compound columns, and query planners.
- [API Design Guidelines on Pagination](https://google.aip.dev/158) — Google API Design Standard guidelines for cursor-based collection streaming.
