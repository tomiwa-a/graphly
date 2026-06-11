---
title: WebSockets & SSE
slug: websockets-sse
summary: "Compare persistent bidirectional WebSockets and unidirectional Server-Sent Events (SSE), including handshakes, wire framing, and infrastructure scaling."
difficulty: intermediate
chapterId: api-design
domain: API Design
estimatedMinutes: 12
prerequisites: [http, network-sockets-tcp-udp]
related: [grpc, message-queues]
seo_title: "WebSockets and Server-Sent Events (SSE) Deep Dive"
seo_description: "Learn WebSockets connection upgrades and framing, Server-Sent Events unidirectional streams, and scaling real-time web infrastructure."
canonical_url: "/concepts/websockets-sse"
code_examples:
  - language: go
    title: WebSocket Upgrade Handshake and Raw Frame Parser
    code: |
      package main

      import (
          "crypto/sha1"
          "encoding/base64"
          "errors"
          "fmt"
          "io"
          "net"
          "net/http"
      )

      const wsGUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

      func PerformHandshake(w http.ResponseWriter, r *http.Request) (net.Conn, error) {
          if r.Header.Get("Upgrade") != "websocket" || r.Header.Get("Connection") != "Upgrade" {
              http.Error(w, "Not a WebSocket upgrade request", http.StatusBadRequest)
              return nil, errors.New("invalid headers")
          }

          key := r.Header.Get("Sec-WebSocket-Key")
          if key == "" {
              http.Error(w, "Missing Sec-WebSocket-Key", http.StatusBadRequest)
              return nil, errors.New("missing key")
          }

          hasher := sha1.New()
          hasher.Write([]byte(key + wsGUID))
          acceptKey := base64.StdEncoding.EncodeToString(hasher.Sum(nil))

          hijacker, ok := w.(http.Hijacker)
          if !ok {
              http.Error(w, "Hijacking not supported", http.StatusInternalServerError)
              return nil, errors.New("hijack unsupported")
          }
          conn, bufrw, err := hijacker.Hijack()
          if err != nil {
              return nil, err
            }

          bufrw.WriteString("HTTP/1.1 101 Switching Protocols\r\n")
          bufrw.WriteString("Upgrade: websocket\r\n")
          bufrw.WriteString("Connection: Upgrade\r\n")
          bufrw.WriteString("Sec-WebSocket-Accept: " + acceptKey + "\r\n\r\n")
          bufrw.Flush()

          return conn, nil
      }

      type WSFrame struct {
          Fin     bool
          Opcode  byte
          Masked  bool
          Payload []byte
      }

      func ReadFrame(r io.Reader) (*WSFrame, error) {
          header := make([]byte, 2)
          _, err := io.ReadFull(r, header)
          if err != nil {
              return nil, err
          }

          fin := (header[0] & 0x80) != 0
          opcode := header[0] & 0x0F

          masked := (header[1] & 0x80) != 0
          payloadLen := int(header[1] & 0x7F)

          var actualLen int64
          if payloadLen == 126 {
              extLen := make([]byte, 2)
              if _, err := io.ReadFull(r, extLen); err != nil {
                  return nil, err
              }
              actualLen = int64(extLen[0])<<8 | int64(extLen[1])
          } else if payloadLen == 127 {
              extLen := make([]byte, 8)
              if _, err := io.ReadFull(r, extLen); err != nil {
                  return nil, err
              }
              actualLen = 0
              for i := 0; i < 8; i++ {
                  actualLen = (actualLen << 8) | int64(extLen[i])
              }
          } else {
              actualLen = int64(payloadLen)
          }

          var maskingKey []byte
          if masked {
              maskingKey = make([]byte, 4)
              if _, err := io.ReadFull(r, maskingKey); err != nil {
                  return nil, err
              }
          }

          payload := make([]byte, actualLen)
          if _, err := io.ReadFull(r, payload); err != nil {
              return nil, err
          }

          if masked {
              for i := 0; i < len(payload); i++ {
                  payload[i] ^= maskingKey[i%4]
              }
          }

          return &WSFrame{
              Fin:     fin,
              Opcode:  opcode,
              Masked:  masked,
              Payload: payload,
          }, nil
      }
---

## The Concept

Traditionally, client-server web applications communicate using a request-response model where the client initiates all exchanges. If a client needs real-time state updates from the server, it must use **polling** (sending regular HTTP requests, e.g. every 2 seconds) or **long polling** (the server holds the request open until new data is available). Both options introduce high network overhead due to repeatedly parsing headers and establishing TCP sessions.

To solve this, two main persistent push technologies are used on the web:
* **WebSockets**: A persistent, full-duplex TCP-based connection enabling simultaneous bidirectional binary and text frame exchange.
* **Server-Sent Events (SSE)**: A lightweight, unidirectional connection stream using the standard HTTP protocol to push text data from server to client.

```xml
<svg viewBox="0 0 580 340" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="145" y="25" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">WebSocket (Bidirectional, Duplex)</text>
  <line x1="60" y1="60" x2="60" y2="300" stroke="#4c566a" stroke-width="1.5"/>
  <line x1="220" y1="60" x2="220" y2="300" stroke="#4c566a" stroke-width="1.5"/>
  <text x="60" y="52" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Client</text>
  <text x="220" y="52" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Server</text>
  <path d="M 60 80 L 220 100" stroke="#eceff4" stroke-width="1" marker-end="url(#arr-gray)"/>
  <text x="140" y="86" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">HTTP Upgrade Handshake</text>
  <path d="M 220 110 L 60 130" stroke="#a3be8c" stroke-width="1.2" marker-end="url(#arr-green)"/>
  <text x="140" y="116" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">101 Switching Protocols</text>
  <path d="M 60 160 L 220 180" stroke="#88c0d0" stroke-width="1.5" marker-end="url(#arr-blue)"/>
  <text x="140" y="166" fill="#88c0d0" font-family="sans-serif" font-size="8" text-anchor="middle">Frame (Client -> Server)</text>
  <path d="M 220 200 L 60 220" stroke="#88c0d0" stroke-width="1.5" marker-end="url(#arr-blue)"/>
  <text x="140" y="206" fill="#88c0d0" font-family="sans-serif" font-size="8" text-anchor="middle">Frame (Server -> Client)</text>
  <path d="M 60 250 L 220 270" stroke="#ebcb8b" stroke-width="1" marker-end="url(#arr-yellow)"/>
  <text x="140" y="256" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">Ping Frame (Keep-Alive)</text>
  <path d="M 220 275 L 60 295" stroke="#ebcb8b" stroke-width="1" marker-end="url(#arr-yellow)"/>
  <text x="140" y="281" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">Pong Frame (Ack)</text>
  <text x="435" y="25" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Server-Sent Events (Unidirectional)</text>
  <line x1="350" y1="60" x2="350" y2="300" stroke="#4c566a" stroke-width="1.5"/>
  <line x1="510" y1="60" x2="510" y2="300" stroke="#4c566a" stroke-width="1.5"/>
  <text x="350" y="52" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Client</text>
  <text x="510" y="52" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Server</text>
  <path d="M 350 80 L 510 100" stroke="#eceff4" stroke-width="1" marker-end="url(#arr-gray)"/>
  <text x="430" y="86" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">GET (Accept: text/event-stream)</text>
  <path d="M 510 110 L 350 130" stroke="#a3be8c" stroke-width="1.2" marker-end="url(#arr-green)"/>
  <text x="430" y="116" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">200 OK (Keep-Alive, Chunked)</text>
  <path d="M 510 170 L 350 190" stroke="#88c0d0" stroke-width="1.5" marker-end="url(#arr-blue)"/>
  <text x="430" y="176" fill="#88c0d0" font-family="sans-serif" font-size="8" text-anchor="middle">event: message \n data: {...}</text>
  <path d="M 510 220 L 350 240" stroke="#88c0d0" stroke-width="1.5" marker-end="url(#arr-blue)"/>
  <text x="430" y="226" fill="#88c0d0" font-family="sans-serif" font-size="8" text-anchor="middle">event: update \n data: {...}</text>
  <path d="M 510 270 L 350 290" stroke="#ebcb8b" stroke-width="1" marker-end="url(#arr-yellow)"/>
  <text x="430" y="276" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">:heartbeat comment (Keep-Alive)</text>
  <defs>
    <marker id="arr-gray" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#eceff4"/>
    </marker>
    <marker id="arr-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#a3be8c"/>
    </marker>
    <marker id="arr-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#88c0d0"/>
    </marker>
    <marker id="arr-yellow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#ebcb8b"/>
    </marker>
  </defs>
</svg>
```

---

## Practical Analogy

Think of these persistent connection options as phone configurations:

* **HTTP Polling** is like calling your delivery agent every 3 minutes to ask, "Is my package here yet?" This wastes time, dial tones, and cellular bandwidth.
* **Server-Sent Events** is like calling a news reporter and telling them: "Read me updates as they happen." The reporter keeps the call active and periodically reads out breaking headlines. You can only listen; if you want to respond, you must call them back on a different line.
* **WebSockets** is like a standard phone call where both you and the speaker are active on the line. You can both talk at the same time over a single connection, exchanging brief messages dynamically.

---

## WebSockets: The Handshake & Wire Format

A WebSocket connection begins as an HTTP request and is upgraded to a bidirectional TCP stream. 

### The Upgrade Handshake
The client initiates a connection with specialized HTTP upgrade headers:
```http
GET /chat HTTP/1.1
Host: server.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```
If the server supports WebSockets, it takes the `Sec-WebSocket-Key` value, appends a globally unique protocol identifier (`258EAFA5-E914-47DA-95CA-C5AB0DC85B11`), computes the SHA-1 hash of this string, base64-encodes the result, and returns it as `Sec-WebSocket-Accept` in a `101 Switching Protocols` response:
```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```
At this point, the HTTP protocol is abandoned. The underlying TCP socket remains open, and both parties communicate using the WebSocket binary framing protocol.

### Wire Framing & Masking
WebSocket data is structured into discrete **binary frames** to manage stream boundaries:
* **FIN (1 bit)**: Indicates if this frame is the final fragment of a message.
* **Opcode (4 bits)**: Dictates the payload type (e.g. `0x1` for text, `0x2` for binary, `0x8` for close, `0x9` for ping, `0xA` for pong).
* **Mask Flag (1 bit)**: Specifies if the payload is masked. All frames sent from client to server must be masked.
* **Payload Length (7 bits)**: The length of the payload. If the value is 126, the next 2 bytes represent the length; if 127, the next 8 bytes represent the length.
* **Masking Key (4 bytes)**: If the mask flag is 1, these 4 bytes are used to unmask the payload.

To prevent proxy cache poisoning attacks, the client must apply a byte-wise XOR mask to the payload using a random masking key. The server reverses this using:
`DecodedPayload[i] = MaskedPayload[i] ^ MaskingKey[i % 4]`

---

## Server-Sent Events (SSE): Unidirectional Streaming

**Server-Sent Events** provides a lightweight, unidirectional push stream from the server over standard HTTP. Unlike WebSockets, it requires no protocol switching or binary framing parser.

The client opens a standard HTTP request using the browser's `EventSource` API, requesting the `text/event-stream` MIME type. The server leaves the connection open, sending responses using **HTTP chunked transfer encoding**.

The wire format for SSE is human-readable text:
```http
event: message
id: 101
data: {"user": "Alice", "text": "Hello"}

event: user_join
id: 102
data: {"user": "Bob"}
```
Each message must be terminated by two consecutive newline characters (`\n\n`). If the connection drops, the browser automatically attempts to reconnect, sending the last received ID in the `Last-Event-ID` HTTP header, allowing the server to replay missed events.

---

## Connection Persistence & Resiliency

To keep long-lived connections healthy, systems employ heartbeat mechanisms:
* **WebSocket Heartbeats**: The server sends a binary ping frame (`0x9`) at a regular interval. The client must immediately respond with a pong frame (`0xA`). If no pong is received within a timeout period, the server terminates the dead connection.
* **SSE Heartbeats**: The server periodically sends dummy event comments (e.g. `:keep-alive\n\n`) to prevent intermediate proxies and load balancers from closing idle connections.
* **Reconnect Policies**: Clients must execute randomized exponential backoff reconnect strategies. If thousands of clients lose connection simultaneously due to a network blip, a naive immediate reconnect policy will create a **thundering herd** problem, overloading the servers.

---

## Infrastructure Scaling Challenges

Scaling persistent connection architectures is fundamentally different from scaling stateless HTTP endpoints:

* **File Descriptor Exhaustion**: Every active connection requires an open socket, consuming an OS **file descriptor**. Operating systems limit the number of file descriptors per process (often 1024 by default). Production servers must be tuned using `ulimit -n` to support hundreds of thousands of concurrent connections.
* **Load Balancer Connection Timeouts**: Reverse proxies (like Nginx, HAProxy, AWS ALB) often close idle connections after a default duration (e.g. 60 seconds). Intermediary timeouts must be reconfigured to allow long-lived connections, and heartbeats must fire frequently enough to reset proxy idle timers.
* **Multi-Node State Synchronization**: In a scaled, clustered environment, Client A may be connected to Server 1, while Client B is connected to Server 2. If Client A sends a message to Client B, Server 1 cannot route it directly because Client B's socket resides on Server 2. To resolve this, backends use a **pub/sub backplane** (e.g. Redis Pub/Sub, RabbitMQ) to broadcast message payloads across all server nodes, allowing the node holding the target socket to deliver the frame.

---

## Further Reading

* [RFC 6455: The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455) — Official specifications for the WebSocket wire format
* [HTML5 Server-Sent Events Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html) — W3C/WHATWG living standard for SSE
* [Nginx Load Balancing WebSockets Guide](https://www.nginx.com/blog/websocket-nginx/) — Configuration and optimization details
* [Scaling WebSockets to Millions of Connections](https://www.phoenixframework.org/blog/the-road-to-2-million-websocket-connections) — Practical system tuning strategies for real-time backends
