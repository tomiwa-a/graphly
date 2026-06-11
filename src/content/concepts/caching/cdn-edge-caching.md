---
title: CDN & Edge Caching
slug: cdn-edge-caching
summary: "Reducing global latency by distributing static and dynamic content across Anycast-routed edge locations with granular cache keys and serverless code execution."
difficulty: intermediate
chapterId: caching
domain: Caching
estimatedMinutes: 10
prerequisites: [caching-strategies, dns]
related: [http]
seo_title: "CDN & Edge Caching: Global Latency Reduction and Cache Controls"
seo_description: "Learn how CDNs and edge caching reduce latency. Master Anycast routing, Cache-Control headers (s-maxage, stale-while-revalidate), surrogate keys, and edge computing."
canonical_url: "/concepts/cdn-edge-caching"
citations:
  - title: "Hypertext Transfer Protocol (HTTP/1.1): Caching"
    author: "Roy T. Fielding, Mark Nottingham, and Julian Reschke"
    chapter: "RFC 7234"
    page_range: "Section 4"
    external_link: "https://datatracker.ietf.org/doc/html/rfc7234"
code_examples:
  - language: typescript
    title: Custom Edge Cache Routing and Surrogate Key Mapping
    code: |
      interface Env {
        ORIGIN_URL: string;
      }

      export default {
        async fetch(
          request: Request,
          env: Env,
          ctx: ExecutionContext
        ): Promise<Response> {
          const url = new URL(request.url);

          // Only cache GET and HEAD requests
          if (request.method !== "GET" && request.method !== "HEAD") {
            return fetch(`${env.ORIGIN_URL}${url.pathname}${url.search}`, request);
          }

          const cache = caches.default;
          // Look up request in the local edge cache
          let response = await cache.match(request);

          if (!response) {
            // Cache miss: forward request to the origin server
            const originUrl = `${env.ORIGIN_URL}${url.pathname}${url.search}`;
            const originResponse = await fetch(originUrl, {
              headers: request.headers,
            });

            // Clone the response to modify headers and write to cache
            const newHeaders = new Headers(originResponse.headers);

            // Configure cache lifetime (s-maxage) and background refresh window
            newHeaders.set(
              "Cache-Control",
              "public, s-maxage=3600, stale-while-revalidate=60"
            );

            // Establish tag-based invalidation via Surrogate-Keys
            const tags = originResponse.headers.get("X-Cache-Tags") || "all-assets";
            newHeaders.set("Surrogate-Key", tags);

            response = new Response(originResponse.body, {
              status: originResponse.status,
              statusText: originResponse.statusText,
              headers: newHeaders,
            });

            // Cache response asynchronously to avoid blocking the client response
            ctx.waitUntil(cache.put(request, response.clone()));
          }

          return response;
        },
      };
---

## Geography-Based Latency Reduction

Even with high-speed internet, the speed of light limits network latency. A round-trip request between San Francisco and London takes roughly 70 to 80 milliseconds under ideal conditions. When a webpage requires dozens of assets, these round-trips quickly accumulate, resulting in noticeable page load delays.

A **Content Delivery Network (CDN)** solves this problem by moving content closer to users. CDNs deploy small datacenters, known as **Points of Presence (PoPs)**, in hundreds of cities worldwide. 

To route users to the nearest PoP, CDNs use **Anycast routing**. In an Anycast network, multiple edge servers across different locations share the exact same IP address. Routers on the internet automatically send a user's packets to the path that is topologically closest in the BGP routing table. This reduces network transit time, often dropping connection setup latency from hundreds of milliseconds to single digits.

---

## CDN Caching Hierarchy

Rather than forwarding every cache miss back to the primary database, CDNs organize their storage into a structured hierarchy:

* **Edge Servers**: These are the servers closest to the user. They handle client TLS termination and serve cached content directly.
* **Regional Caches**: If the edge server has a cache miss, it queries a larger, regional cache container that pools requests from multiple nearby edge PoPs.
* **Origin Shield**: A dedicated caching layer situated directly in front of the origin infrastructure. The origin shield consolidates misses from regional caches, protecting the main application database from spikes in traffic.
* **Origin Server**: The authoritative application server where the dynamic code runs and the primary database resides.

This tiered hierarchy ensures that even when edge nodes expire cache keys, requests are absorbed by intermediate cache shields, minimizing expensive database queries at the origin.

<svg viewBox="0 0 580 260" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="20" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">CDN Caching Hierarchy</text>
  <rect x="20" y="50" width="100" height="40" rx="4" fill="#2e3440" stroke="#88c0d0" stroke-width="1.5"/>
  <text x="70" y="70" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Global Users</text>
  <text x="70" y="82" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Anycast routed</text>
  <rect x="160" y="50" width="100" height="40" rx="4" fill="#2e3440" stroke="#ebcb8b" stroke-width="1.5"/>
  <text x="210" y="70" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Edge PoP</text>
  <text x="210" y="82" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">Cache Hit (Fast)</text>
  <rect x="300" y="50" width="100" height="40" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="350" y="70" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Origin Shield</text>
  <text x="350" y="82" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">Regional Cache</text>
  <rect x="440" y="50" width="110" height="40" rx="4" fill="#2e3440" stroke="#bf616a" stroke-width="1.5"/>
  <text x="495" y="70" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Origin Infrastructure</text>
  <text x="495" y="82" fill="#bf616a" font-family="sans-serif" font-size="8" text-anchor="middle">App & Database</text>
  <path d="M 120 70 L 155 70" stroke="#eceff4" stroke-width="1.5" marker-end="url(#arr)"/>
  <path d="M 260 70 L 295 70" stroke="#eceff4" stroke-width="1.5" marker-end="url(#arr)"/>
  <text x="280" y="62" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Miss</text>
  <path d="M 400 70 L 435 70" stroke="#eceff4" stroke-width="1.5" marker-end="url(#arr)"/>
  <text x="418" y="62" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Miss</text>
  <path d="M 210 90 C 210 180, 495 180, 495 95" stroke="#a3be8c" stroke-width="1.5" stroke-dasharray="3" fill="none" marker-end="url(#arr)"/>
  <text x="350" y="190" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Persistent Connection Reuse (Fast HTTP/2 Multiplexing)</text>
  <defs>
    <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#d8dee9"/>
    </marker>
  </defs>
</svg>

---

## Cache-Control Headers on the Edge

To manage how edge servers store content, HTTP provides cache-control instructions:

* **`s-maxage`**: This directive specifically instructs shared caches (like CDNs and proxies) how long to store an asset in seconds, ignoring client-specific `max-age` values.
* **`stale-while-revalidate`**: This allows the CDN to serve a stale asset from its cache immediately if the request falls within a specified window. The CDN then fetches the fresh asset from the origin in the background, keeping edge lookups fast.
* **`Surrogate-Key` (or `Cache-Tag`)**: An HTTP response header sent by the origin to associate cache keys with specific tags. For example, a response can have the header `Surrogate-Key: product-1002 author-42`. If product 1002 is updated, the application sends a purge request for tag `product-1002`, instantly invalidating all matching edge cache objects across the entire network.

---

## Cache Invalidation at Scale

Evicting assets from a globally distributed network is a major operational challenge. CDNs provide several purge models:

* **Instant Purging**: The CDN controller broadcasts a key invalidation request to all active edge PoPs. Most modern CDNs complete this global invalidation in under 150 milliseconds.
* **Path and Wildcard Purging**: Invalidating content using URL paths (such as `/images/products/*`), which clears large collections of static files at once.
* **Soft Purging**: Rather than deleting the asset outright, the CDN marks the item as stale. The next request receives the stale asset while the edge server triggers a background fetch to validate the content with the origin.

---

## Edge Computing

Modern CDNs go beyond serving static files. They allow developers to run serverless functions directly on edge nodes. These scripts run in V8 isolates, which start in microseconds and consume far less memory than full container sandboxes.

With edge computing, you can:

* **Inspect and modify headers**: Enforce security rules or inspect user locations to perform redirect logic.
* **Perform A/B testing**: Serve different variants of a page based on user cookies directly at the edge, avoiding database reads.
* **Assemble pages dynamic**: Combine static HTML fragments with user-specific data from local edge key-value databases, serving personalized pages with minimal latency.

---

## Further Reading

* [RFC 7234: HTTP/1.1 Caching](https://datatracker.ietf.org/doc/html/rfc7234) — The formal IETF specification defining how cache-control headers work.
* [Caching Tutorial for Web Authors and Administrators](https://www.mnot.net/cache_docs/) — Mark Nottingham's classic guide to web caching design.
* [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/) — Guides on running javascript serverless functions on CDNs.
