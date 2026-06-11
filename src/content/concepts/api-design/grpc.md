---
title: gRPC (Remote Procedure Call)
slug: grpc
summary: "A high-performance microservice communication framework using Protocol Buffers and persistent HTTP/2 streams."
difficulty: intermediate
chapterId: api-design
domain: API Design
estimatedMinutes: 11
prerequisites: [http]
related: [idempotency]
seo_title: "gRPC and Protocol Buffers Explained Simply"
seo_description: "Learn how gRPC abstracts network communications, utilizing Protocol Buffers and HTTP/2 stream multiplexing for microservices."
canonical_url: "/concepts/grpc"
code_examples:
  - language: Go
    title: Simple gRPC Server stub in Go
    code: |
      package main

      import (
          "context"
          "net"
          "google.golang.org/grpc"
      )

      type Server struct {
          UnimplementedUserServer
      }

      func (s *Server) GetUser(ctx context.Context, req *UserRequest) (*UserResponse, error) {
          return &UserResponse{Id: req.Id, Name: "Alice"}, nil
      }

      func main() {
          lis, _ := net.Listen("tcp", ":50051")
          s := grpc.NewServer()
          RegisterUserServer(s, &Server{})
          s.Serve(lis)
      }
  - language: TypeScript
    title: Proto client definition in TypeScript
    code: |
      // Simple Protocol Buffer schema representation
      const protoSchema = `
        syntax = "proto3";

        message UserRequest {
          string id = 1;
        }

        message UserResponse {
          string id = 1;
          string name = 2;
        }

        service UserService {
          rpc GetUser (UserRequest) returns (UserResponse);
        }
      `;
      console.log("Protobuf interface compiled for TypeScript client stub");
---

## The Concept

In web development, we are used to building REST APIs where servers exchange JSON text strings over separate HTTP requests. While JSON is human-readable, it is slow to serialize, takes up significant bandwidth, and lacks compile-time type verification.

**gRPC** is an alternative communication framework built specifically for internal microservices:
1. **Interface Definition Language (IDL)**: You write a simple schema contract file (`.proto`) defining the database methods, request parameters, and return types.
2. **Code Generation**: A compiler (`protoc`) compiles that schema file into helper classes (stubs) in Go, Python, TypeScript, and other languages.
3. **HTTP/2 Transport**: Data is serialized into a highly optimized binary format (Protocol Buffers) and streamed bidirectionally over a persistent HTTP/2 connection.

---

## gRPC vs REST Comparison

<svg viewBox="0 0 580 260" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="24" fill="#88c0d0" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">gRPC (HTTP/2 + Protobuf) vs REST (HTTP/1.1 + JSON)</text>
  
  <!-- REST Path -->
  <text x="120" y="55" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Traditional REST API</text>
  <rect x="30" y="70" width="80" height="40" rx="4" fill="#2e3440" stroke="#bf616a"/>
  <text x="70" y="94" fill="#d8dee9" font-family="sans-serif" font-size="10" text-anchor="middle">Client</text>
  
  <rect x="160" y="70" width="80" height="40" rx="4" fill="#2e3440" stroke="#bf616a"/>
  <text x="200" y="94" fill="#d8dee9" font-family="sans-serif" font-size="10" text-anchor="middle">Server</text>
  
  <path d="M 110 82 L 160 82" stroke="#bf616a" stroke-width="1.5" marker-end="url(#arr-red)"/>
  <path d="M 160 98 L 110 98" stroke="#bf616a" stroke-width="1.5" stroke-dasharray="3,2" marker-end="url(#arr-red)"/>
  <text x="135" y="76" fill="#bf616a" font-family="sans-serif" font-size="8" text-anchor="middle">JSON Text</text>
  <text x="135" y="112" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">HTTP/1.1 (Text)</text>

  <!-- gRPC Path -->
  <text x="460" y="55" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">gRPC Microservice</text>
  <rect x="370" y="70" width="80" height="40" rx="4" fill="#2e3440" stroke="#a3be8c"/>
  <text x="410" y="94" fill="#d8dee9" font-family="sans-serif" font-size="10" text-anchor="middle">Client Stub</text>
  
  <rect x="500" y="70" width="80" height="40" rx="4" fill="#2e3440" stroke="#a3be8c"/>
  <text x="540" y="94" fill="#d8dee9" font-family="sans-serif" font-size="10" text-anchor="middle">Server Stub</text>
  
  <path d="M 450 82 L 500 82" stroke="#a3be8c" stroke-width="1.5" marker-end="url(#arr-green)"/>
  <path d="M 500 98 L 450 98" stroke="#a3be8c" stroke-width="1.5" stroke-dasharray="3,2" marker-end="url(#arr-green)"/>
  <text x="475" y="76" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">Protobuf Binary</text>
  <text x="475" y="112" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">HTTP/2 (Multiplexed)</text>
  
  <!-- Shared Schema -->
  <rect x="225" y="150" width="130" height="45" rx="5" fill="#3b4252" stroke="#88c0d0" stroke-width="1.5"/>
  <text x="290" y="168" fill="#88c0d0" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Shared Schema Contract</text>
  <text x="290" y="182" fill="#d8dee9" font-family="sans-serif" font-size="9" text-anchor="middle">user.proto</text>
  
  <path d="M 225 172 Q 130 172 110 110" stroke="#88c0d0" stroke-width="1" stroke-dasharray="3,3" fill="none"/>
  <path d="M 355 172 Q 450 172 410 110" stroke="#88c0d0" stroke-width="1" stroke-dasharray="3,3" fill="none"/>
  <text x="150" y="155" fill="#88c0d0" font-family="sans-serif" font-size="8" text-anchor="middle">Generates Client Stubs</text>
  <text x="430" y="155" fill="#88c0d0" font-family="sans-serif" font-size="8" text-anchor="middle">Generates Server Stubs</text>

  <defs>
    <marker id="arr-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#bf616a"/>
    </marker>
    <marker id="arr-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#a3be8c"/>
    </marker>
  </defs>
</svg>

---

## Practical Analogy

Think of gRPC as calling a local function:

* In standard REST APIs, if service A wants information from service B, it must convert data to a JSON string, write HTTP headers, route the payload, and parse the JSON string on the other side. This is like writing a formal, formatted letter and sending it through the mail post.
* gRPC abstracts the network. Calling an API on a remote server looks and behaves exactly like calling a local function inside your own code: `userService.getUser(id)`. 
* Under the hood, gRPC serializes data into tiny binary packages and streams them down a persistent pipeline (HTTP/2). It is like speaking directly to your colleague sitting at the desk next to you.

---

## Protocol Buffers (Protobuf) Wire Format

Protocol Buffers are Google's language-neutral, platform-neutral, extensible mechanism for serializing structured data. 

Instead of sending text names like `{"user_id": 42}` where the field name "user_id" is repeated in every single payload, Protobuf assigns each field a small integer tag (e.g., `user_id = 1`). On the wire, only the tag, the type, and the raw binary value are sent. This makes payloads significantly smaller:

* **JSON Payload**: `{"id": 1001, "name": "Alice"}` takes 31 bytes.
* **Protobuf Payload**: `08 E9 07 12 05 41 6C 69 63 65` takes only 10 bytes (where `08` indicates tag 1 and type varint, `E9 07` is the varint for 1001, `12` indicates tag 2 and type length-delimited, `05` is the string length, and the rest is the ASCII characters for "Alice").

---

## The Four Streaming Modes

gRPC supports four distinct communication patterns, which are declared directly in the proto definition:

### 1. Unary RPC
The classic request-response model. The client sends a single request and receives a single response.
* **Use Case**: Fetching a specific user record or submitting a form.
* **Proto syntax**: `rpc GetUser (UserRequest) returns (UserResponse);`

### 2. Server Streaming RPC
The client sends one request, and the server returns a stream of multiple responses. The client reads from the stream until there are no more messages.
* **Use Case**: Streaming a list of products, real-time stock price updates, or server logs.
* **Proto syntax**: `rpc ListUsers (ListRequest) returns (stream UserResponse);`

### 3. Client Streaming RPC
The client writes a sequence of messages and sends them to the server. Once the client finishes writing, it waits for the server to read them and return a single response.
* **Use Case**: Uploading a large file in chunks or sending a batch of telemetry data.
* **Proto syntax**: `rpc UploadMetrics (stream MetricRequest) returns (UploadSummary);`

### 4. Bidirectional Streaming RPC
Both sides send a sequence of messages using a read-write stream. The two streams operate independently, meaning clients and servers can read and write in any order.
* **Use Case**: Live chat applications, real-time gaming synchronization, or persistent duplex data sync.
* **Proto syntax**: `rpc ChatSession (stream ChatMessage) returns (stream ChatMessage);`

---

## Why it matters in Backend Systems

1. **Performance & Serialization Speed**: Protocol Buffers serialize and parse up to 6x faster than JSON and occupy a fraction of the bandwidth, reducing CPU usage and network overhead in microservice grids.
2. **Strict Type Contracts**: Since code stubs are generated from a shared `.proto` schema file, compile-time errors will trigger immediately if service A changes a payload parameter without informing service B.
3. **Streaming Support**: gRPC natively supports streaming APIs (client-side streaming, server-side streaming, and full bidirectional streams) making it perfect for real-time dashboards, metrics, and chat pipelines.

---

## Further Reading

* [gRPC Official Documentation](https://grpc.io/docs/what-is-grpc/introduction/) — Introduction and core concepts
* [Protocol Buffers Encoding Guide](https://protobuf.dev/programming-guides/encoding/) — Deep dive into how Protobuf encodes values on the wire
* [HTTP/2 under the hood for gRPC](https://grpc.io/blog/grpc-on-http2/) — How gRPC maps its streams and frames to HTTP/2
* [REST vs gRPC: When to use what](https://cloud.google.com/blog/products/api-management/understanding-grpc-proto-and-gcmd) — Google Cloud comparison of the two paradigms
