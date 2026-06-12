---
title: Bitcask Log-Structured Hash Tables
slug: bitcask-hash-tables
summary: "Discover the design, write append speed, single-seek reads, and compaction mechanics of Bitcask log-structured storage engines."
difficulty: intermediate
chapterId: databases
domain: Databases
estimatedMinutes: 12
prerequisites: [hash-functions, file-descriptors]
related: [lsm-trees, mmap-page-cache]
seo_title: "Bitcask Log-Structured Storage Engine Internals | Graphly"
seo_description: "Learn how the Bitcask storage engine pairs an in-memory Keydir hash table with append-only write logs to achieve high-performance O(1) reads and writes."
canonical_url: "/concepts/bitcask-hash-tables"
citations:
  - title: "Bitcask: A Log-Structured Hash Table for Fast Key/Value Data"
    author: "Justin Shearer, Dave Smith, and Andy Gross"
    chapter: "Basho Technologies Whitepaper"
    page_range: "1-15"
    external_link: "https://github.com/basho/bitcask/blob/develop/doc/bitcask-intro.pdf"
code_examples:
  - language: go
    title: Building a Bitcask Engine with Log Compaction and Crash Recovery
    code: |
      package main

      import (
      	"bytes"
      	"encoding/binary"
      	"fmt"
      	"io"
      	"os"
      	"path/filepath"
      	"sync"
      	"time"
      )

      // HeaderSize is the size of the record header:
      // Timestamp (8 bytes) + KeySize (4 bytes) + ValueSize (4 bytes)
      const HeaderSize = 16

      // KeydirEntry stores the location parameters of a key in the log files.
      type KeydirEntry struct {
      	FileID    string
      	ValueSize int32
      	Offset    int64
      	Timestamp int64
      }

      // Bitcask represents a thread-safe log-structured storage engine.
      type Bitcask struct {
      	mu         sync.RWMutex
      	dirPath    string
      	activeFile *os.File
      	activeID   string
      	keydir     map[string]KeydirEntry
      }

      // NewBitcask opens or initializes a Bitcask storage directory.
      func NewBitcask(dirPath string) (*Bitcask, error) {
      	if err := os.MkdirAll(dirPath, 0755); err != nil {
      		return nil, err
      	}

      	bc := &Bitcask{
      		dirPath: dirPath,
      		keydir:  make(map[string]KeydirEntry),
      	}

      	if err := bc.recoverKeydir(); err != nil {
      		return nil, err
      	}

      	if err := bc.openNewActiveFile(); err != nil {
      		return nil, err
      	}

      	return bc, nil
      }

      // Put appends a key-value record to the active log file and updates Keydir.
      func (bc *Bitcask) Put(key string, val string) error {
      	bc.mu.Lock()
      	defer bc.mu.Unlock()

      	keyBytes := []byte(key)
      	valBytes := []byte(val)
      	timestamp := time.Now().UnixNano()
      	keySize := int32(len(keyBytes))
      	valSize := int32(len(valBytes))

      	// Write record to active file
      	offset, err := bc.activeFile.Seek(0, io.SeekEnd)
      	if err != nil {
      		return err
      	}

      	headerBuf := new(bytes.Buffer)
      	binary.Write(headerBuf, binary.BigEndian, timestamp)
      	binary.Write(headerBuf, binary.BigEndian, keySize)
      	binary.Write(headerBuf, binary.BigEndian, valSize)

      	if _, err := bc.activeFile.Write(headerBuf.Bytes()); err != nil {
      		return err
      	}
      	if _, err := bc.activeFile.Write(keyBytes); err != nil {
      		return err
      	}
      	if _, err := bc.activeFile.Write(valBytes); err != nil {
      		return err
      	}

      	// Update memory-based Keydir lookup map
      	bc.keydir[key] = KeydirEntry{
      		FileID:    bc.activeID,
      		ValueSize: valSize,
      		Offset:    offset,
      		Timestamp: timestamp,
      	}

      	return nil
      }

      // Get retrieves a key's value in a single disk seek using the Keydir entry.
      func (bc *Bitcask) Get(key string) (string, error) {
      	bc.mu.RLock()
      	entry, exists := bc.keydir[key]
      	bc.mu.RUnlock()

      	if !exists {
      		return "", fmt.Errorf("key not found")
      	}

      	filePath := filepath.Join(bc.dirPath, entry.FileID+".log")
      	file, err := os.Open(filePath)
      	if err != nil {
      		return "", err
      	}
      	defer file.Close()

      	// Skip timestamp + keysize metadata to read value
      	// LSN offset + HeaderSize matches the location of the key bytes
      	// LSN offset + HeaderSize + KeySize matches the location of the value bytes
      	// We calculate key size to jump directly to value bytes
      	keySizeVal := entry.Offset // Temporary store helper to read the key size
      	
      	var ts int64
      	var ks, vs int32
      	headerBytes := make([]byte, HeaderSize)
      	if _, err := file.ReadAt(headerBytes, entry.Offset); err != nil {
      		return "", err
      	}
      	buf := bytes.NewReader(headerBytes)
      	binary.Read(buf, binary.BigEndian, &ts)
      	binary.Read(buf, binary.BigEndian, &ks)
      	binary.Read(buf, binary.BigEndian, &vs)

      	valOffset := entry.Offset + HeaderSize + int64(ks)
      	valBytes := make([]byte, entry.ValueSize)
      	if _, err := file.ReadAt(valBytes, valOffset); err != nil {
      		return "", err
      	}

      	return string(valBytes), nil
      }

      func (bc *Bitcask) openNewActiveFile() error {
      	if bc.activeFile != nil {
      		bc.activeFile.Close()
      	}
      	bc.activeID = fmt.Sprintf("data-%d", time.Now().UnixNano())
      	filePath := filepath.Join(bc.dirPath, bc.activeID+".log")
      	file, err := os.OpenFile(filePath, os.O_CREATE|os.O_RDWR|os.O_APPEND, 0644)
      	if err != nil {
      		return err
      	}
      	bc.activeFile = file
      	return nil
      }

      // recoverKeydir scans log files on startup to rebuild the in-memory lookup map.
      func (bc *Bitcask) recoverKeydir() error {
      	files, err := filepath.Glob(filepath.Join(bc.dirPath, "*.log"))
      	if err != nil {
      		return err
      	}

      	for _, path := range files {
      		fileID := filepath.Base(path[:len(path)-4])
      		file, err := os.Open(path)
      		if err != nil {
      			return err
      		}

      		var offset int64 = 0
      		for {
      			header := make([]byte, HeaderSize)
      			_, err := file.ReadAt(header, offset)
      			if err == io.EOF {
      				break
      			}
      			if err != nil {
      				break
      			}

      			var ts int64
      			var ks, vs int32
      			buf := bytes.NewReader(header)
      			binary.Read(buf, binary.BigEndian, &ts)
      			binary.Read(buf, binary.BigEndian, &ks)
      			binary.Read(buf, binary.BigEndian, &vs)

      			keyBytes := make([]byte, ks)
      			if _, err := file.ReadAt(keyBytes, offset+HeaderSize); err != nil {
      				break
      			}

      			key := string(keyBytes)
      			bc.keydir[key] = KeydirEntry{
      				FileID:    fileID,
      				ValueSize: vs,
      				Offset:    offset,
      				Timestamp: ts,
      			}

      			offset += HeaderSize + int64(ks) + int64(vs)
      		}
      		file.Close()
      	}
      	return nil
      }

      // Close terminates the active file handle.
      func (bc *Bitcask) Close() {
      	bc.mu.Lock()
      	defer bc.mu.Unlock()
      	if bc.activeFile != nil {
      		bc.activeFile.Close()
      	}
      }

      func main() {
      	dir := "./bitcask_temp_db"
      	defer os.RemoveAll(dir)

      	bc, err := NewBitcask(dir)
      	if err != nil {
      		fmt.Println("Error:", err)
      		return
      	}
      	defer bc.Close()

      	bc.Put("user_id_101", "Alice")
      	bc.Put("user_id_102", "Bob")
      	bc.Put("user_id_101", "Alice Cooper") // Overwrite value

      	val, err := bc.Get("user_id_101")
      	fmt.Printf("Retrieved user_id_101: %s (Err: %v)\n", val, err)

      	val2, err := bc.Get("user_id_102")
      	fmt.Printf("Retrieved user_id_102: %s (Err: %v)\n", val2, err)
      }
---

## The Concept

In traditional database systems, write operations are slow because they require random page modifications. A single row update in a B+ Tree index might require finding a page on disk, modifying its bytes, and writing it back to a random location.

To optimize write throughput, modern log-structured database systems use a different design pattern. **Bitcask** represents the cleanest implementation of this concept. It executes writes by appending updates sequentially to the end of a log file, transforming slow random I/O operations into high-speed sequential disk writes.

However, log-structured layouts present a challenge for read performance. If data is scattered across files in the order it was written, reading a key could require scanning the entire history of log files.

Bitcask solves this read performance challenge using a simple design: it pairs an **append-only log-structured file storage** on disk with an **in-memory hash table** called the **Keydir**.

---

## Read/Write Architecture

A Bitcask instance consists of a directory containing a series of append-only log files (where only one file is marked active for writing) and an in-memory hash table directory.

<svg viewBox="0 0 580 260" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="22" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Bitcask Storage Engine Architecture</text>
  <rect x="20" y="45" width="220" height="190" rx="6" fill="#2e3440" stroke="#88c0d0" stroke-width="1.5" stroke-dasharray="3,3"/>
  <text x="130" y="62" fill="#88c0d0" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">RAM: In-Memory Keydir</text>
  <rect x="30" y="75" width="200" height="145" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="40" y="95" fill="#81a1c1" font-family="sans-serif" font-size="9" font-weight="bold">Key</text>
  <text x="120" y="95" fill="#81a1c1" font-family="sans-serif" font-size="9" font-weight="bold">FileID</text>
  <text x="160" y="95" fill="#81a1c1" font-family="sans-serif" font-size="9" font-weight="bold">Offset</text>
  <text x="200" y="95" fill="#81a1c1" font-family="sans-serif" font-size="9" font-weight="bold">Size</text>
  <line x1="30" y1="102" x2="230" y2="102" stroke="#4c566a" stroke-width="1"/>
  <text x="40" y="120" fill="#eceff4" font-family="sans-serif" font-size="9">"u_101"</text>
  <text x="120" y="120" fill="#a3be8c" font-family="sans-serif" font-size="9">log_1</text>
  <text x="160" y="120" fill="#ebcb8b" font-family="sans-serif" font-size="9">0</text>
  <text x="200" y="120" fill="#d8dee9" font-family="sans-serif" font-size="9">45B</text>
  <text x="40" y="140" fill="#eceff4" font-family="sans-serif" font-size="9">"u_102"</text>
  <text x="120" y="140" fill="#a3be8c" font-family="sans-serif" font-size="9">log_1</text>
  <text x="160" y="140" fill="#ebcb8b" font-family="sans-serif" font-size="9">45</text>
  <text x="200" y="140" fill="#d8dee9" font-family="sans-serif" font-size="9">48B</text>
  <text x="40" y="160" fill="#eceff4" font-family="sans-serif" font-size="9">"u_103"</text>
  <text x="120" y="160" fill="#88c0d0" font-family="sans-serif" font-size="9">active</text>
  <text x="160" y="160" fill="#ebcb8b" font-family="sans-serif" font-size="9">93</text>
  <text x="200" y="160" fill="#d8dee9" font-family="sans-serif" font-size="9">50B</text>
  <rect x="300" y="45" width="260" height="85" rx="6" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="430" y="62" fill="#a3be8c" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">Disk: log_1.log (Cold)</text>
  <rect x="310" y="75" width="115" height="40" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="367" y="90" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">Offset: 0 | Sz: 45</text>
  <text x="367" y="105" fill="#eceff4" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">u_101 = "Alice"</text>
  <rect x="435" y="75" width="115" height="40" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="492" y="90" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">Offset: 45 | Sz: 48</text>
  <text x="492" y="105" fill="#eceff4" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">u_102 = "Bob"</text>
  <rect x="300" y="150" width="260" height="85" rx="6" fill="#2e3440" stroke="#88c0d0" stroke-width="1.5"/>
  <text x="430" y="167" fill="#88c0d0" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">Disk: active.log (Append Only)</text>
  <rect x="310" y="180" width="115" height="40" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="367" y="195" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">Offset: 93 | Sz: 50</text>
  <text x="367" y="210" fill="#eceff4" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">u_103 = "Charlie"</text>
  <path d="M 230 115 L 305 95" stroke="#ebcb8b" stroke-width="1.5" stroke-dasharray="2,2" fill="none" marker-end="url(#ar3)"/>
  <path d="M 230 155 L 305 195" stroke="#ebcb8b" stroke-width="1.5" stroke-dasharray="2,2" fill="none" marker-end="url(#ar3)"/>
  <defs>
    <marker id="ar3" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#ebcb8b"/>
    </marker>
  </defs>
</svg>

### The Keydir Hash Map
The **Keydir** is an in-memory hash table containing every key present in the database. Instead of storing the values directly in RAM, Keydir maps each key to a lightweight location descriptor:
* **File ID**: The identifier of the log file containing the value.
* **Value Size**: The size of the value in bytes.
* **Offset**: The exact byte offset location inside the target log file.
* **Timestamp**: The epoch timestamp indicating when the write occurred.

### The Write Path
To insert or update a key-value pair, the database engine:
1. Formats a record containing a fixed-size header (timestamp, key size, and value size) followed by the raw key and value bytes.
2. Appends the formatted record to the active log file in a single write operation.
3. Obtains the starting offset of the write.
4. Updates the in-memory Keydir hash table with the file ID, value size, and offset.

Because the write path consists of a single sequential write append to disk and an in-memory hash table update, it completes in `O(1)` time, maximizing write throughput.

### The Read Path
To read a key, the database engine:
1. Looks up the key in the in-memory Keydir hash table.
2. If the key exists, it retrieves the location descriptor (file ID, offset, and size).
3. Executes a file seek to that offset and reads the value from the log file.

Because the database uses the memory-based Keydir to resolve the exact disk location of a key, reading a value requires only a single disk seek lookup, executing in `O(1)` time.

---

## Log Compaction and Merging

Because updates are appended to the log, overwriting a key leaves duplicate records in the log files. The old, superseded values are dead space.

```text
Log File:
[LSN 0: u_101="Alice"] -> [LSN 45: u_102="Bob"] -> [LSN 93: u_101="Alice Cooper"]
                                                    ^
                                                    Active Keydir references this LSN
```

To prevent disk space exhaustion, Bitcask uses a background process called **compaction** (or merging).

The compaction process:
1. Iterates through the cold log files (files that are no longer active).
2. For each record, it compares its timestamp with the current in-memory Keydir entry.
3. If the record LSN matches the current Keydir offset, it is active. The engine copies the active record to a new compacted log file.
4. If the record offset does not match Keydir, it is stale. The engine discards it.
5. Once a file has been processed, the old redundant log file is deleted.

---

## Startup Recovery and Hint Files

If a Bitcask database crashes or restarts, the in-memory Keydir is lost. The engine must rebuild the Keydir map from the disk files on startup.

The naive way to rebuild Keydir is to read every log file from start to finish, parsing every record header. On large databases with gigabytes of logs, this process is slow.

To speed up startup, Bitcask writes a **hint file** alongside each log file during compaction:
* The hint file contains the record headers (key, value size, offset, and timestamp) but excludes the value bytes.
* When the database restarts, it parses the lightweight hint files rather than the raw data logs.
* This allows the database to rebuild the Keydir map at memory speeds, reducing startup recovery times.

---

## Engineering Trade-offs

When choosing a storage engine, consider the design trade-offs of the Bitcask model:

### Pros
* **High Write Throughput**: Writes are appended sequentially, minimizing random disk operations.
* **Low Read Latency**: Reading a value requires at most a single disk seek.
* **Simple Recovery**: Recovery requires parsing append-only records, preventing indexes from becoming corrupted or inconsistent.

### Cons
* **RAM Constraints**: Every key must fit in RAM. If the database contains millions of keys, the Keydir memory footprint will grow, even if values are kept on disk. This limits the engine to datasets with small key spaces.
* **No Range Queries**: Because Keydir is structured as a hash table, the database cannot perform range scans (`WHERE age > 21`). To find a range, the engine would have to scan the entire Keydir or perform a full table scan of the logs.

---

## Further Reading

* [The Bitcask Whitepaper](https://github.com/basho/bitcask/blob/develop/doc/bitcask-intro.pdf) — The original design document introducing log-structured hash tables.
* [Log-Structured Storage Design](https://book.mixu.net/distsys/store.html) — Analysis of LSM trees, Bitcask, and append-only database engines.
* [Rebuilding Keydir via Hint Files](https://riak.com/posts/technical/bitcask-the-keyvalue-storage-engine-for-riak/) — Riak's blog detailing Bitcask optimizations and hint file structures.
