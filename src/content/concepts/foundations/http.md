---
title: HTTP
slug: http
summary: "The foundation of web communication — methods, status codes, headers, and the request/response lifecycle."
difficulty: beginner
chapterId: foundations
domain: Foundations
estimatedMinutes: 10
prerequisites: []
related: [idempotency, caching-strategies]
seo_title: "HTTP Protocol: Methods, Status Codes, and Request Lifecycle"
seo_description: "Learn the HTTP protocol that powers all web communication — methods, status codes, headers, and request/response lifecycle for backend engineers."
canonical_url: "/concepts/http"
code_examples:
  - language: Go
    title: HTTP server and handler
    code: |
      func main() {
          http.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {
              switch r.Method {
              case http.MethodGet:
                  w.Header().Set("Content-Type", "application/json")
                  json.NewEncoder(w).Encode(users)
              case http.MethodPost:
                  var u User
                  json.NewDecoder(r.Body).Decode(&u)
                  users = append(users, u)
                  w.WriteHeader(http.StatusCreated)
                  json.NewEncoder(w).Encode(u)
              default:
                  w.WriteHeader(http.StatusMethodNotAllowed)
              }
          })
          http.ListenAndServe(":8080", nil)
      }
  - language: TypeScript
    title: Fetch API basics
    code: |
      // GET request
      const res = await fetch("/api/users");
      const users = await res.json();

      // POST request
      const created = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Alice", email: "alice@example.com" }),
      });

      if (!created.ok) {
        throw new Error(`HTTP ${created.status}: ${created.statusText}`);
      }
  - language: Python
    title: Flask HTTP handlers
    code: |
      from flask import Flask, request, jsonify

      app = Flask(__name__)

      @app.route("/users", methods=["GET"])
      def list_users():
          return jsonify(users)

      @app.route("/users", methods=["POST"])
      def create_user():
          data = request.get_json()
          users.append(data)
          return jsonify(data), 201

      @app.route("/users/<user_id>", methods=["DELETE"])
      def delete_user(user_id):
          # remove user...
          return "", 204
---

## What it is

HTTP (HyperText Transfer Protocol) is the protocol that powers the web. Every time your browser loads a page, submits a form, or calls an API, it uses HTTP. It's a stateless request/response protocol: a client sends a request, a server sends back a response.

## Why it matters

Everything in backend engineering sits on top of HTTP. REST APIs, GraphQL, webhooks, health checks, authentication flows — they all use HTTP. Understanding methods, status codes, and headers is foundational to building any web service.

## How it works

A client opens a TCP connection to a server and sends a request with a method (GET, POST, PUT, DELETE), a path (/users/123), headers (Content-Type, Authorization), and optionally a body. The server processes the request and responds with a status code (200, 404, 500), headers, and a body.

## Production concerns

Use HTTPS in production (TLS encryption). Set appropriate timeouts on both client and server. Understand keep-alive connections and connection pooling. Use correct status codes — don't return 200 for errors. Set Content-Type headers correctly.

## Common mistakes

Using GET for operations with side effects. Returning 200 with an error message in the body. Ignoring HTTP caching headers. Not setting timeouts, leading to hanging connections. Using POST for everything instead of appropriate methods.
