---
title: "Markdown System Test Playground"
summary: "Interactive test playground showcasing Phase 3 and Phase 4 systems in action."
video_embed:
  platform: "youtube"
  id: "dQw4w9WgXcQ"
  title: "Graphy Walkthrough Video"
---

# Interactive Markdown Systems Test

Welcome to the **Graphy Markdown Compiler** playground. This document is rendered entirely on the server using build-time HTML compilations, resulting in a lightweight, high-performance page with interactive client-side overlays.

---

## 1. Code Blocks (Phase 4 Step 1)

These blocks are parsed and highlighted at build-time using **Shiki**. Use the copy button to copy the snippet, or toggle the line numbers by clicking the `123` button in the headers.

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

### Go with Line Highlights (lines 3 and 6-7)

```go {3,6-7}
package main

import "fmt"

func main() {
    message := "Graphy is theory-first!"
    fmt.Println(message)
}
```

---

## 2. Interactive SVG & Mermaid Diagrams

Here is a raw SVG system architecture flowchart. It is center-aligned, responsive, and styled with high-contrast borders and a subtle shadow.

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

## 3. Video Embeds (Phase 3 Shortcode)

Below is an inline supplement video loaded dynamically using our shortcode:

[[video platform="youtube" id="dQw4w9WgXcQ" title="Never Gonna Give You Up"]]

---

## 4. Inline Images & Captions

Images are compiled into semantic markup with responsive constraints and block captions:

![A premium visualization of distributed message queuing topologies.](https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80)

---

## 5. Rich Markdown & Task Checklists

Verify formatting, blockquotes, admonitions, and standard checklists:

- [x] Phase 1: Chapter-Grouped Directories
- [x] Phase 2: Admonitions & Tables
- [ ] Phase 3: High-contrast SVGs & Video Shortcodes
- [ ] Phase 4: Shiki Highlight & Playgrounds

> [!TIP]
> Hover over any code block to reveal the interactive Copy/Line-number controls.
