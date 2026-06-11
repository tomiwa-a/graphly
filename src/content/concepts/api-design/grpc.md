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
2. **Code Generation**: A compiler (`protoc`) compiles that schema file into helper classes (stubs) in Go, Python, TypeScript, etc.
3. **HTTP/2 Transport**: Data is serialized into a highly optimized binary format (Protocol Buffers) and streamed bidirectionally over a persistent HTTP/2 connection.

---

## Practical Analogy

Think of gRPC as **Calling a Local Team Member**:

* In standard REST APIs, if service A wants information from service B, it must convert data to a JSON string, write HTTP headers, route the payload, and parse the JSON string on the other side. This is like writing a formal, formatted letter and sending it through the mail post.
* **gRPC** abstracts the network. Calling an API on a remote server looks and behaves exactly like calling a local function inside your own code: `userService.getUser(id)`. 
* Under the hood, gRPC serializes data into tiny binary packages and streams them down a persistent pipeline (HTTP/2). It is like speaking directly to your colleague sitting at the desk next to you.

---

## Why it matters in Backend Systems

1. **Performance & Serialization Speed**: Protocol Buffers serialize and parse up to 6x faster than JSON and occupy a fraction of the bandwidth, reducing CPU usage and network overhead in microservice grids.
2. **Strict Type Contracts**: Since code stubs are generated from a shared `.proto` schema file, compile-time errors will trigger immediately if service A changes a payload parameter without informing service B.
3. **Streaming Support**: gRPC natively supports streaming APIs (client-side streaming, server-side streaming, and full bidirectional streams) making it perfect for real-time dashboards, metrics, and chat pipelines.
