---
title: Webhooks
slug: webhooks
summary: "Learn how to build secure, reliable Server-to-Server callbacks with HMAC signatures, exponential retries, and asynchronous ingestion."
difficulty: intermediate
chapterId: api-design
domain: API Design
estimatedMinutes: 12
prerequisites: [http]
related: [idempotency, rate-limiting, message-queues]
seo_title: "Webhooks Guide: Designing Secure and Reliable Callback APIs"
seo_description: "Learn how to design reliable webhook publishing and receiving systems. Covers HMAC signatures, retry policies, backoffs, and fast ingestion architectures."
canonical_url: "/concepts/webhooks"
citations:
  - title: "Designing Quality Webhooks"
    author: "Tom Snyders"
    chapter: "HMAC signing standards and async delivery design"
    external_link: "https://www.webhooks.fyi/"
code_examples:
  - language: typescript
    title: Secure Webhook Dispatcher with HMAC Signature and Retries
    code: |
      import * as crypto from "crypto";

      interface WebhookPayload {
        eventId: string;
        eventType: string;
        timestamp: number;
        data: Record<string, any>;
      }

      // Helper to simulate a network post call
      async function mockFetch(url: string, options: { method: string; headers: Record<string, string>; body: string }): Promise<{ status: number }> {
        const isHealthy = Math.random() > 0.4;
        if (!isHealthy) {
          throw new Error("Network connection timeout");
        }
        return { status: Math.random() > 0.2 ? 202 : 500 };
      }

      // Generate the HMAC signature for the payload
      function generateSignature(payload: string, secret: string, timestamp: number): string {
        const dataToSign = `${timestamp}.${payload}`;
        return crypto.createHmac("sha256", secret).update(dataToSign).digest("hex");
      }

      // Dispatch Webhook with exponential backoff and jitter
      async function dispatchWebhookWithRetries(
        url: string,
        eventType: string,
        eventData: Record<string, any>,
        secret: string,
        maxAttempts = 5,
        baseDelayMs = 1000
      ): Promise<boolean> {
        const eventId = crypto.randomUUID();
        const timestamp = Date.now();
        
        const payload: WebhookPayload = {
          eventId,
          eventType,
          timestamp,
          data: eventData,
        };
        
        const bodyString = JSON.stringify(payload);
        const signature = generateSignature(bodyString, secret, timestamp);
        
        const headers = {
          "Content-Type": "application/json",
          "X-Event-ID": eventId,
          "X-Timestamp": String(timestamp),
          "X-Signature": signature,
        };

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            console.log(`[Attempt ${attempt}/${maxAttempts}] Dispatching event ${eventId} to ${url}`);
            
            const response = await mockFetch(url, {
              method: "POST",
              headers,
              body: bodyString,
            });

            if (response.status >= 200 && response.status < 300) {
              console.log(`[Success] Event ${eventId} accepted by receiver (Status: ${response.status})`);
              return true;
            }
            
            console.warn(`[Failed] Server returned non-2xx status: ${response.status}`);
          } catch (err: any) {
            console.warn(`[Network Error] Failed to connect: ${err.message}`);
          }

          if (attempt < maxAttempts) {
            // Calculate exponential backoff: base * 2^(attempt - 1)
            const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
            // Introduce random jitter of +/- 20%
            const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);
            const delay = Math.max(0, exponentialDelay + jitter);
            
            console.log(`Retrying in ${Math.round(delay)}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }

        // Route to Dead Letter Queue (DLQ) if all retries exhausted
        console.error(`[DLQ Alert] All ${maxAttempts} attempts exhausted. Routing event ${eventId} to Dead Letter Queue.`);
        return false;
      }

      // Demonstration run
      const CLIENT_WEBHOOK_URL = "https://api.client.com/webhooks/receiver";
      const SHARED_SECRET = "super-secret-key-12345";

      dispatchWebhookWithRetries(CLIENT_WEBHOOK_URL, "payment.succeeded", {
        orderId: "ord_99013",
        amount: 4999,
        currency: "USD",
      }, SHARED_SECRET);
---

## The Concept

Modern distributed applications rely heavily on real-time event updates. While traditional client-server communications use polling where the client repeatedly queries the server for changes, this model is highly inefficient. It wastes database cycles and network bandwidth when no new data is available.

**Webhooks** invert this design by establishing a **callback pattern**. Instead of the client asking the server for status updates, the server proactively sends an HTTP `POST` request to a client-registered URL immediately when an event occurs. This server-to-server callback allows downstream systems to process events in real time without the overhead of continuous polling.

<svg viewBox="0 0 580 300" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="20" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Secure Webhook Handshake and Event Processing Flow</text>
  <line x1="100" y1="70" x2="100" y2="280" stroke="#4c566a" stroke-width="1.5" stroke-dasharray="4 4"/>
  <line x1="280" y1="70" x2="280" y2="280" stroke="#4c566a" stroke-width="1.5" stroke-dasharray="4 4"/>
  <line x1="480" y1="70" x2="480" y2="280" stroke="#4c566a" stroke-width="1.5" stroke-dasharray="4 4"/>
  <rect x="30" y="40" width="140" height="30" rx="4" fill="#2e3440" stroke="#88c0d0" stroke-width="1"/>
  <text x="100" y="58" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Source Server (Dispatch)</text>
  <rect x="210" y="40" width="140" height="30" rx="4" fill="#2e3440" stroke="#ebcb8b" stroke-width="1"/>
  <text x="280" y="58" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Client API (Receiver)</text>
  <rect x="410" y="40" width="140" height="30" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1"/>
  <text x="480" y="58" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Client Worker (Async)</text>
  <path d="M 100 100 L 280 100" stroke="#eceff4" stroke-width="1.2" marker-end="url(#arrow-white)"/>
  <text x="190" y="94" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">POST Webhook Payload</text>
  <text x="190" y="112" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">X-Signature: HMAC-SHA256, X-Timestamp, X-Event-ID</text>
  <path d="M 280 125 L 320 125 A 15 15 0 0 1 320 155 L 280 155" stroke="#ebcb8b" stroke-width="1.2" fill="none" marker-end="url(#arrow-yellow)"/>
  <text x="330" y="144" fill="#ebcb8b" font-family="sans-serif" font-size="9">Verify HMAC</text>
  <path d="M 280 180 L 100 180" stroke="#a3be8c" stroke-width="1.2" marker-end="url(#arrow-green)"/>
  <text x="190" y="174" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">202 Accepted (Immediately releases socket)</text>
  <path d="M 280 215 L 480 215" stroke="#88c0d0" stroke-width="1.2" marker-end="url(#arrow-blue)"/>
  <text x="380" y="209" fill="#88c0d0" font-family="sans-serif" font-size="9" text-anchor="middle">Enqueue Task</text>
  <rect x="430" y="235" width="100" height="30" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1"/>
  <text x="480" y="253" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Process Event</text>
  <defs>
    <marker id="arrow-white" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#eceff4"/>
    </marker>
    <marker id="arrow-yellow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#ebcb8b"/>
    </marker>
    <marker id="arrow-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#a3be8c"/>
    </marker>
    <marker id="arrow-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#88c0d0"/>
    </marker>
  </defs>
</svg>

---

## Practical Analogy

Consider the difference between buying mail order goods in two different ways:

* **Polling** is like running down to your letterbox outside your house every five minutes to check if your package has arrived. You spend all day walking back and forth, wasting physical energy, even though the mail delivery only occurs once a day.
* **A Webhook** is like installing a doorbell on your door. You go about your normal day doing work inside your house. When the delivery driver arrives with the package, they press the doorbell button. The ring triggers your immediate attention to collect the package, eliminating unnecessary checks.

---

## Message Integrity and HMAC Signatures

Because webhook receivers are public HTTP endpoints exposed to the internet, they are highly vulnerable to attack. Malicious users can easily spoof POST requests to trigger fraudulent business logic (such as marking an unpaid order as paid).

To establish authenticity and **message integrity**, webhook publishers cryptographically sign payloads using a shared secret key. This process employs the Hash-based Message Authentication Code (**HMAC**) algorithm:

1. The server serializes the request payload into a raw string.
2. The server generates a signature by hashing the payload and a shared secret key using the SHA-256 algorithm.
3. The server transmits the signature, along with a timestamp, inside custom HTTP headers (such as `X-Signature` and `X-Timestamp`).
4. The client receiver calculates the HMAC signature of the incoming request body using its local copy of the shared secret.
5. The receiver performs a constant-time string comparison to match its calculated signature with the header's signature. If they match, the receiver knows the message is authentic and has not been altered in transit.

### Preventing Replay Attacks
Attackers can capture valid webhook requests on the wire and send them repeatedly (a **replay attack**) to overload client systems. To mitigate this:
* The publisher signs a combined string of the timestamp and payload: `timestamp + "." + payload`.
* The receiver extracts the timestamp header and compares it against its local system clock.
* If the difference exceeds a threshold (for example, 5 minutes), the receiver discards the request as stale, preventing replay attempts.

---

## Egress Security and Network Validation

Beyond signature verification, webhook senders and receivers must apply network security filters to protect their infrastructure:

* **Mutual TLS (mTLS)**: Webhook endpoints can require mTLS, forcing the publishing server to present a valid TLS certificate that the receiver verifies against trusted certificates, locking down communication channels.
* **Egress Firewalls and IP Blocklists**: Source servers routing webhooks to random external addresses must configure egress firewalls. This prevents internal systems from hitting malicious endpoints that might access private internal networks.
* **IP Whitelisting**: Receivers can verify the publisher's egress IP address range against a published static list, blocking requests originating from unlisted IP addresses.

---

## Recipient Optimizations

When a webhook receiver gets a valid payload, it must avoid performing long-running tasks (such as image processing or database reports) inline with the request.

Doing so holds the HTTP socket open, leading to:
* **Socket Timeouts**: The publishing server will assume the delivery failed and drop the connection or initiate retries.
* **Worker Depletion**: The receiver's server thread pool will rapidly drain, blocking new incoming webhook requests.

To optimize ingestion, receivers return a fast `202 Accepted` status code immediately after validating the signature. Before sending the response, they enqueue the raw payload to an internal message queue (such as Redis, RabbitMQ, or SQS). Background worker tasks then consume and process the events asynchronously, freeing the HTTP socket in milliseconds.

---

## Server Dispatch Optimization

Publishing servers must also optimize their outgoing webhooks. Directly sending HTTP requests inline with main application transactions slows down user interactions and risks database lockups if the webhook receiver is offline or slow.

Publishers delegate dispatching to message queues:
1. The application transaction records an event and enqueues a dispatch task.
2. Background dispatch workers read the event queue, compile payloads, compute HMAC signatures, and execute the POST request.
3. The outgoing queue rate limits requests destined for individual client domains, preventing the publisher from accidentally launching a distributed denial-of-service (DDoS) attack against a client.

### Retry Policies, Exponential Backoff, and DLQs
Since client servers can experience outages, publishers must implement reliable retry policies:
* **Exponential Backoff**: If a delivery fails, the worker waits for a period that doubles with each attempt (for example, 1s, 2s, 4s, 8s, 16s).
* **Jitter**: Random delays (jitter) are added to the backoff times to prevent retrying workers from hitting client servers in synchronized spikes.
* **Dead Letter Queues (DLQ)**: If an event fails to deliver after multiple retry attempts (e.g. 5 to 10 attempts), the system moves the event to a Dead Letter Queue. Administrators inspect the DLQ to identify broken endpoints and notify clients.

---

## Further Reading

* [RFC 2104: HMAC: Keyed-Hashing for Message Authentication](https://datatracker.ietf.org/doc/html/rfc2104) — The specifications detailing the design and security characteristics of HMAC signatures.
* [Standard Webhook Signatures Spec](https://www.standardwebhooks.com/) — A community effort to standardize webhook signature headers and verification protocols.
* [Stripe API Reference: Webhook Signatures](https://stripe.com/docs/webhooks/signatures) — A practical industry implementation of HMAC-SHA256 webhook validation and timing attack mitigations.
