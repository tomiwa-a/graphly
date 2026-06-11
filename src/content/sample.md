---
title: "Ultimate Markdown Systems Playground"
summary: "A comprehensive test catalog of all markdown features available in Graphly."
video_embed:
  platform: "youtube"
  id: "dQw4w9WgXcQ"
  title: "Graphly Walkthrough Video"
citations:
  - title: "HTTP: The Definitive Guide"
    author: "David Gourley, Brian Totty"
    chapter: "Chapter 4"
    page_range: "83-112"
    external_link: "https://www.oreilly.com/library/view/http-the-definitive/1565925092/"
---

# Ultimate Markdown Playground

This page acts as a comprehensive sandbox exercising all markdown parser features, layout rules, and Interactive Client Overlays available in Graphly.

---

## 1. Text & Basic Formatting

You can apply **bold**, *italic*, and ***bold-italic*** styling to any text block. You can also reference inline code snippets like `const connection = new Socket();` using single backticks.

---

## 2. Lists & Task Checklists

### Unordered List
- Layer 7: Application (HTTP, DNS)
- Layer 4: Transport (TCP, UDP)
  - Nested protocols (TLS, QUIC)
- Layer 3: Network (IP, ICMP)

### Ordered List
1. Establish a TCP three-way handshake.
2. Perform a TLS cryptographic key exchange.
3. Transmit the application layer request frames.

### Interactive GFM Checklists
- [x] Phase 1: Chapter-Grouped Directories & SEO Layouts
- [x] Phase 2: Tables, Citations, and Admonitions
- [x] Phase 3: SVG Flowcharts and Video Embeds
- [ ] Phase 4: Full Interactive Code Playgrounds

---

## 3. Admonitions & Callout Cards

> [!NOTE]
> This is a general note callout card. Use it to highlight additional context that isn't critical but helps understanding.

> [!TIP]
> This is a helper tip. Use it for best practices, optimization advice, and productivity shortcuts.
> 
> ```typescript {2}
> // You can even nest code blocks inside tips!
> console.log("Nested tip code works!");
> ```

> [!WARNING]
> This is a warning box. Use it to alert users to potential pitfalls, edge cases, or common configuration bugs.

> [!CAUTION]
> This is a caution callout. Use it to prevent serious issues such as data loss, race conditions, or infinite recursion.

---

## 4. Code Blocks (Shiki Build-time Highlights)

These blocks support line highlights (defined in meta curly brackets) and toggleable line numbering.

### TypeScript with Line Highlights (lines 2 and 5)

```typescript {2,5}
interface DatabaseNode {
  id: string;
  role: "leader" | "follower";
  syncLagMs: number;
}

function checkHealth(node: DatabaseNode): boolean {
  return node.syncLagMs < 1000;
}
```

### Go with Line Highlights (lines 3, 7-8)

```go {3,7-8}
package main

import "fmt"

func main() {
    message := "Graphly handles concurrency beautifully!"
    fmt.Println(message)
}
```

### SQL Database Queries

```sql {4}
SELECT name, role, sync_lag_ms
FROM database_nodes
WHERE sync_lag_ms > 1000
ORDER BY sync_lag_ms DESC;
```

---

## 5. Rich System Design Diagrams (SVG)

Here is a raw inline SVG flowchart. It is center-aligned, responsive, and styled with high-contrast borders:

<svg viewBox="0 0 600 120" xmlns="http://www.w3.org/2000/svg">
  <!-- Client Node -->
  <rect x="10" y="30" width="100" height="60" rx="10" fill="#0ea5e9" stroke="#0284c7" stroke-width="2" />
  <text x="60" y="65" fill="#ffffff" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Client</text>

  <!-- Arrow 1 -->
  <path d="M 110 60 L 190 60" stroke="#94a3b8" stroke-width="3" fill="none" marker-end="url(#arrow)" />
  <text x="150" y="50" fill="#94a3b8" font-family="sans-serif" font-size="10" text-anchor="middle">HTTP/2</text>

  <!-- Load Balancer Node -->
  <rect x="200" y="30" width="150" height="60" rx="10" fill="#10b981" stroke="#059669" stroke-width="2" />
  <text x="275" y="65" fill="#ffffff" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Load Balancer</text>

  <!-- Arrow 2 -->
  <path d="M 350 60 L 480 60" stroke="#94a3b8" stroke-width="3" fill="none" />
  <text x="415" y="50" fill="#94a3b8" font-family="sans-serif" font-size="10" text-anchor="middle">gRPC</text>

  <!-- Backend Servers -->
  <rect x="490" y="10" width="100" height="40" rx="5" fill="#6366f1" stroke="#4f46e5" stroke-width="2" />
  <text x="540" y="35" fill="#ffffff" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">API Node A</text>

  <rect x="490" y="70" width="100" height="40" rx="5" fill="#6366f1" stroke="#4f46e5" stroke-width="2" />
  <text x="540" y="95" fill="#ffffff" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">API Node B</text>

  <!-- Branch lines -->
  <path d="M 450 60 L 450 30 L 490 30" stroke="#94a3b8" stroke-width="2" fill="none" />
  <path d="M 450 60 L 450 90 L 490 90" stroke="#94a3b8" stroke-width="2" fill="none" />
</svg>

---

## 6. GFM Tables

Tables are compiled to stretch across full-width columns and break lines naturally:

| Protocol | OSI Layer | Transport | Flow Control | Primary Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **HTTP/1.1** | Layer 7 | TCP | TCP Windows | Simple Web Browsing, Legacy APIs |
| **HTTP/2** | Layer 7 | TCP | Multiplexing Stream Frames | Modern Web, Bidirectional gRPC |
| **HTTP/3** | Layer 7 | QUIC (UDP) | Connection ID Flow Control | High Packet-Loss Mobile Networks |

---

## 7. Media Supplements (Video Embeds & Captions)

### Video Embed Shortcode
[[video platform="youtube" id="dQw4w9WgXcQ" title="Rick Astley - Never Gonna Give You Up"]]

### Image with Responsive Figcaption
![A clean visualization of distributed message queuing topologies in a datacenter cluster.](https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80)
