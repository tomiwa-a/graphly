---
title: "Domain Name System (DNS)"
slug: dns
summary: "Explore the hierarchical structure of DNS, recursive vs iterative resolution, record formats, cache management, Anycast routing, and transport boundaries."
difficulty: beginner
chapterId: foundations
domain: Foundations
estimatedMinutes: 10
prerequisites: [http]
related: [caching-strategies]
seo_title: "DNS Architecture and Resolution Protocols | Graphly"
seo_description: "Understand the Domain Name System: Root, TLD, and Authoritative nameservers, recursive vs iterative lookups, record types, caching, and UDP/TCP transport layers."
canonical_url: "/concepts/dns"
citations:
  - title: "Domain Names - Concepts and Facilities"
    author: "Paul Mockapetris"
    chapter: "IETF RFC 1034 / RFC 1035"
    page_range: "Section 3 & Section 4"
    external_link: "https://datatracker.ietf.org/doc/html/rfc1034"
code_examples:
  - language: go
    title: Raw UDP DNS Resolver Packet Constructor
    code: |
      package main

      import (
          "bytes"
          "encoding/binary"
          "fmt"
          "net"
          "time"
      )

      /* DNSHeader represents the standard 12-byte header of a DNS request/response */
      type DNSHeader struct {
          ID      uint16 /* Transaction Identifier */
          Flags   uint16 /* Query flags (e.g., Recursion Desired) */
          QDCount uint16 /* Number of questions */
          ANCount uint16 /* Number of answers */
          NSCount uint16 /* Number of authority records */
          ARCount uint16 /* Number of additional records */
      }

      func main() {
          /* 1. Resolve target DNS server address (Google Public DNS) */
          resolverAddr, err := net.ResolveUDPAddr("udp", "8.8.8.8:53")
          if err != nil {
              panic(err)
          }

          /* 2. Establish connection using raw UDP socket */
          conn, err := net.DialUDP("udp", nil, resolverAddr)
          if err != nil {
              panic(err)
          }
          defer conn.Close()

          /* 3. Construct the DNS query header */
          header := DNSHeader{
              ID:      0x1234, /* Arbitrary transaction identifier */
              Flags:   0x0100, /* 0x0100 sets the Recursion Desired (RD) bit */
              QDCount: 1,      /* Query contains exactly one question */
          }

          buf := new(bytes.Buffer)
          if err := binary.Write(buf, binary.BigEndian, header); err != nil {
              panic(err)
          }

          /* 4. Encode domain label format: "google.com" -> "\x06google\x03com\x00" */
          domain := "google.com"
          for _, label := range bytes.Split([]byte(domain), []byte(".")) {
              buf.WriteByte(byte(len(label)))
              buf.Write(label)
          }
          buf.WriteByte(0x00) /* Null byte terminating the domain name field */

          /* 5. Set Record Type to A (0x0001) and Class to IN (0x0001) */
          binary.Write(buf, binary.BigEndian, uint16(1)) /* Type A (IPv4 Address) */
          binary.Write(buf, binary.BigEndian, uint16(1)) /* Class IN (Internet) */

          conn.SetDeadline(time.Now().Add(5 * time.Second))

          /* 6. Write raw byte array directly to target resolver port 53 */
          _, err = conn.Write(buf.Bytes())
          if err != nil {
              panic(err)
          }

          /* 7. Receive response packet */
          response := make([]byte, 512)
          n, err := conn.Read(response)
          if err != nil {
              panic(err)
          }

          fmt.Printf("Received raw DNS response: %d bytes\n", n)

          /* 8. Skip Header (12 bytes) and Question Section to locate Answers */
          /* Question length: label length markers (2) + domain string length + null terminator (1) + type (2) + class (2) */
          questionLen := 12 + len(domain) + 2 + 1 + 2 + 2

          if n > questionLen {
              /*
               * Read IPv4 bytes from the trailing segment of the A record.
               * Format of A answer: Name (compression pointer), Type (2), Class (2), TTL (4), RData Len (2), IP (4)
               */
              ipBytes := response[n-4 : n]
              ttlBytes := response[n-10 : n-6]
              ttl := binary.BigEndian.Uint32(ttlBytes)
              fmt.Printf("Resolved IP: %d.%d.%d.%d (TTL: %d seconds)\n", ipBytes[0], ipBytes[1], ipBytes[2], ipBytes[3], ttl)
          }
      }
---

## The Hierarchical DNS Structure

The **Domain Name System** (DNS) is the distributed hierarchical database that translates human-readable hostnames like `example.com` into machine-routable IP addresses. Instead of relying on a single centralized database, which would quickly crash under the load of global internet traffic, DNS divides its namespace into a tree hierarchy.

This structure can be compared to a corporate directory system. If you want to contact an employee in a massive multinational corporation, you do not ask a single front-desk receptionist who has memorized all 100,000 employees' phone extensions. Instead, you ask the front desk receptionist (Root), who points you to the sales department floor directory (Top-Level Domain), who finally points you to the sales department administrator (Authoritative Nameserver) who maintains the specific desk list.

The tree hierarchy consists of three primary layers of nameservers:
* **Root Nameservers**: The root zone sits at the top of the hierarchy, represented as a trailing dot in a domain name (e.g., `example.com.`). There are 13 logical root server IP addresses globally, operated by organizations like ICANN, NASA, and the US Army, and distributed across hundreds of physical locations using Anycast routing. Root servers do not store IP addresses, they point resolvers to the appropriate Top-Level Domain (TLD) servers.
* **Top-Level Domain (TLD) Nameservers**: These servers manage specific extensions like `.com`, `.org`, and `.net` (generic TLDs), or `.uk` and `.de` (country code TLDs). The TLD servers maintain registry lists pointing to the authoritative nameservers for individual domains.
* **Authoritative Nameservers**: The final authority for a domain. These servers store the actual mapping records (such as IP addresses) for specific hostnames. When you configure DNS records at a domain registrar, you are defining which authoritative nameservers hold the records for your domain.

---

## DNS Resolution Flow: Recursive vs Iterative

Locating an IP address involves two distinct querying modes: recursive and iterative resolution.

A **recursive resolver** (typically operated by your ISP, or public resolvers like Cloudflare's `1.1.1.1` and Google's `8.8.8.8`) act as an agent on behalf of the client. The client machine sends a single recursive query: "Give me the IP address for `example.com`, do not return intermediate pointers." The recursive resolver manages the entire resolution loop, caching the results to accelerate subsequent lookups.

If the recursive resolver does not have the mapping cached, it executes an **iterative resolution** flow, querying each level of the DNS tree step by step:

1. The resolver queries a Root Nameserver, requesting the IP of `example.com`.
2. The Root Nameserver returns the IP addresses of the `.com` TLD Nameservers.
3. The resolver queries the `.com` TLD Nameserver for `example.com`.
4. The TLD Nameserver returns the IP addresses of the Authoritative Nameservers for `example.com`.
5. The resolver queries the Authoritative Nameserver.
6. The Authoritative Nameserver returns the A record containing the IP address (e.g., `93.184.216.34`).
7. The resolver returns this IP to the client.

<svg viewBox="0 0 580 430" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="24" fill="#88c0d0" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Recursive vs. Iterative DNS Resolution Flow</text>
  <rect x="20" y="200" width="100" height="60" rx="6" fill="#2e3440" stroke="#88c0d0" stroke-width="1.5"/>
  <text x="70" y="225" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Client Machine</text>
  <text x="70" y="240" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Browser / OS</text>
  <path d="M 120 220 L 210 220" stroke="#88c0d0" stroke-width="1.5" marker-end="url(#arr3)"/>
  <text x="165" y="212" fill="#88c0d0" font-family="sans-serif" font-size="8" text-anchor="middle">1. Recursive Query</text>
  <path d="M 210 240 L 120 240" stroke="#a3be8c" stroke-width="1.5" marker-end="url(#arr3)"/>
  <text x="165" y="252" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">8. A Record (IP)</text>
  <rect x="220" y="170" width="120" height="120" rx="8" fill="#3b4252" stroke="#ebcb8b" stroke-width="1.5"/>
  <text x="280" y="195" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Recursive Resolver</text>
  <text x="280" y="210" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle">ISP / 8.8.8.8</text>
  <rect x="235" y="235" width="90" height="40" rx="4" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="280" y="250" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Cache Check</text>
  <text x="280" y="262" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">(TTL Expiry?)</text>
  <rect x="440" y="50" width="110" height="50" rx="6" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="495" y="72" fill="#eceff4" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">Root Nameservers</text>
  <text x="495" y="86" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">"."</text>
  <rect x="440" y="190" width="110" height="50" rx="6" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="495" y="212" fill="#eceff4" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">TLD Nameservers</text>
  <text x="495" y="226" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">".com"</text>
  <rect x="440" y="330" width="110" height="50" rx="6" fill="#2e3440" stroke="#a3be8c" stroke-width="1"/>
  <text x="495" y="352" fill="#eceff4" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">Authoritative NS</text>
  <text x="495" y="366" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">example.com</text>
  <path d="M 330 185 L 435 95" stroke="#ebcb8b" stroke-width="1.2" fill="none" marker-end="url(#arr3)"/>
  <text x="365" y="130" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">2. Iterative</text>
  <path d="M 435 100 L 335 195" stroke="#eceff4" stroke-width="1.2" stroke-dasharray="2" fill="none" marker-end="url(#arr3)"/>
  <text x="395" y="160" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">3. TLD Refer</text>
  <path d="M 340 220 L 430 220" stroke="#ebcb8b" stroke-width="1.2" fill="none" marker-end="url(#arr3)"/>
  <text x="385" y="212" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">4. Iterative</text>
  <path d="M 430 230 L 340 230" stroke="#eceff4" stroke-width="1.2" stroke-dasharray="2" fill="none" marker-end="url(#arr3)"/>
  <text x="385" y="245" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">5. Auth Refer</text>
  <path d="M 330 275 L 435 340" stroke="#ebcb8b" stroke-width="1.2" fill="none" marker-end="url(#arr3)"/>
  <text x="360" y="320" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">6. Iterative</text>
  <path d="M 435 345 L 335 285" stroke="#a3be8c" stroke-width="1.2" stroke-dasharray="2" fill="none" marker-end="url(#arr3)"/>
  <text x="400" y="300" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">7. Resolve A</text>
  <defs>
    <marker id="arr3" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#81a1c1"/>
    </marker>
  </defs>
  <rect x="20" y="390" width="540" height="30" rx="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="290" y="408" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Clients make a single recursive request; the resolver resolves iterative hops in the background.</text>
</svg>

---

## Common DNS Record Types

DNS hosts store maps called **resource records** (RRs). The most common record types used in web infrastructure are:

* **A** (Address): Maps a hostname to an IPv4 address (e.g., `example.com` -> `93.184.216.34`).
* **AAAA** (IPv6 Address): Maps a hostname to a 128-bit IPv6 address (e.g., `example.com` -> `2606:2800:220:1:248:1893:25c8:1946`).
* **CNAME** (Canonical Name): Creates an alias pointing one hostname to another. A CNAME lookup forces the resolver to restart its query sequence using the target hostname.
* **NS** (Nameserver): Identifies which authoritative nameservers hold records for the domain.
* **MX** (Mail Exchange): Directs email traffic to the appropriate mail servers.
* **TXT** (Text): Stores arbitrary text-based metadata, often used to verify domain ownership (e.g., SPF, DKIM, and Google Site Verification).

---

## DNS Caching Levels and TTL Expiration

To prevent network bottlenecking, DNS relies heavily on multi-level caching. When a resolver receives a record, it stores it locally for a duration defined by the record's **Time-To-Live** (TTL) value, expressed in seconds.

DNS records are cached at several layers:
* **Browser Cache**: Web browsers store records to avoid system-level calls.
* **OS Cache**: The operating system kernel maintains a local cache (accessible via commands like `ipconfig /displaydns` or systemd-resolved).
* **Local Router Cache**: Home or office routers cache lookups for local network speed.
* **Recursive Resolver Cache**: Managed by your ISP or DNS provider.

### Propagation Delays and Cache-Busting
When you update a DNS record, it does not instantly apply worldwide. Resolvers that have cached the old record will continue serving it until their local TTL timers expire, a phenomenon known as **DNS propagation delay**. 

If you plan to migrate server IPs, you should lower the TTL of the target records (e.g., from 86,400 seconds to 300 seconds) a few days in advance. This ensures that when you execute the migration, resolvers will fetch the new IP address within 5 minutes rather than caching the old one for a full day.

---

## Routing: Geolocation and Anycast

DNS can be used to optimize global traffic routing before a client ever connects to an application server.

### Geolocation-Based Routing
Authoritative nameservers can evaluate the incoming IP address of the recursive resolver. Using IP geolocation databases, the nameserver responds with the IP address of the data center physically closest to the client, minimizing network latency.

### Anycast DNS
With **Anycast**, multiple physical nameservers distributed worldwide advertise the exact same IP address using the Border Gateway Protocol (BGP). The internet routing infrastructure automatically routes the client's UDP packets to the topologically closest server instance, enhancing reliability and DDoS resistance.

---

## Transport Protocols: UDP, EDNS0, and TCP Fallback

DNS historically operated almost exclusively over UDP on port 53.

### The 512-Byte Limit and TCP Fallback
The original DNS specification limited UDP packet payloads to **512 bytes** to prevent packet fragmentation over early WAN infrastructure. If a DNS response (such as a query returning multiple IPv6 records and DNSSEC signatures) exceeded 512 bytes, the nameserver truncated the packet and set the truncation (`TC`) flag in the header. Upon seeing this flag, the resolver fell back to establish a TCP connection on port 53 to retry the query.

### EDNS0
To prevent the latency overhead of TCP handshakes, the **Extension Mechanisms for DNS** (EDNS0) protocol was introduced. EDNS0 allows resolvers to advertise their supported buffer size in the query, enabling nameservers to send UDP payloads up to 4,096 bytes without truncation.

---

## Secure DNS: DoT and DoH

Traditional DNS queries are sent in plaintext, making them vulnerable to eavesdropping, tampering, and ISP injection attacks. Modern security protocols encrypt this traffic:

* **DNS over TLS (DoT)**: Wraps raw DNS queries inside a TLS tunnel on port 853, encrypting all traffic between the resolver and the client.
* **DNS over HTTPS (DoH)**: Encapsulates DNS queries as standard HTTP/2 or HTTP/3 request streams on port 443. Because DoH traffic looks identical to standard HTTPS web traffic, it bypasses network firewalls and prevents ISPs from monitoring lookup history.

---

## Further Reading

* [RFC 1034: Domain Names - Concepts and Facilities](https://datatracker.ietf.org/doc/html/rfc1034) — The primary RFC establishing the architectural principles of DNS.
* [RFC 1035: Domain Names - Implementation and Specification](https://datatracker.ietf.org/doc/html/rfc1035) — Detailed specifications for packet formats and resolution algorithms.
* [How Anycast Works](https://www.cloudflare.com/learning/cdn/glossary/anycast-rfc/) — Architectural overview of Anycast routing for globally distributed DNS resolvers.
* [RFC 6891: Extension Mechanisms for DNS (EDNS0)](https://datatracker.ietf.org/doc/html/rfc6891) — Standard specifications for high-capacity UDP DNS packets.
