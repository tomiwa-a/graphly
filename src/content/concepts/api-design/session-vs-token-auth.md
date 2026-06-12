---
title: Session vs Token Authentication
slug: session-vs-token-auth
summary: "Compare stateful session cookies and stateless JWT tokens, evaluating their storage costs, verification paths, revocation limits, and security trade-offs."
difficulty: beginner
chapterId: api-design
domain: API Design
estimatedMinutes: 10
prerequisites: [http]
related: [api-security-oauth2]
seo_title: "Session vs Token Authentication: Architecture and Security"
seo_description: "Deep dive into stateful session-based and stateless token-based authentication. Learn about cookie security, JWT signature validation, and revocation strategies."
canonical_url: "/concepts/session-vs-token-auth"
citations:
  - title: "Session Management Cheat Sheet"
    author: "OWASP Foundation"
    chapter: "Cookie-Based Session Management vs Token-Based Authentication"
    external_link: "https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html"
code_examples:
  - language: typescript
    title: Stateful Session Store vs Stateless JWT Token Auth Engine
    code: |
      import * as http from 'http';
      import * as crypto from 'crypto';

      // ==========================================
      // 1. STATEFUL SESSION ENGINE IMPLEMENTATION
      // ==========================================
      interface Session {
        userId: string;
        expiresAt: number;
      }

      class StatefulSessionServer {
        // In-memory session store (simulates Redis or a SQL database table)
        private sessionStore = new Map<string, Session>();
        private sessionExpiryMs = 15 * 60 * 1000; // 15 minutes

        public handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
          const url = req.url || '';
          
          if (url === '/login' && req.method === 'POST') {
            // Simulate user authentication success
            const userId = 'user_98765';
            const sessionId = crypto.randomBytes(32).toString('hex');
            const expiresAt = Date.now() + this.sessionExpiryMs;

            // Store session in database/cache
            this.sessionStore.set(sessionId, { userId, expiresAt });

            // Send session ID back in a secure, HttpOnly cookie
            res.writeHead(200, {
              'Set-Cookie': `SID=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/`,
              'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({ success: true, message: 'Logged in successfully' }));
            return;
          }

          if (url === '/profile' && req.method === 'GET') {
            const cookies = this.parseCookies(req.headers.cookie);
            const sessionId = cookies['SID'];

            if (!sessionId) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Unauthorized: No session cookie' }));
              return;
            }

            // Stateful verification: must hit the memory store/database
            const session = this.sessionStore.get(sessionId);
            if (!session) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Unauthorized: Session not found' }));
              return;
            }

            if (Date.now() > session.expiresAt) {
              this.sessionStore.delete(sessionId);
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Unauthorized: Session expired' }));
              return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ userId: session.userId, model: 'stateful-session' }));
            return;
          }

          if (url === '/logout' && req.method === 'POST') {
            const cookies = this.parseCookies(req.headers.cookie);
            const sessionId = cookies['SID'];

            if (sessionId) {
              // Immediate revocation: delete state from store
              this.sessionStore.delete(sessionId);
            }

            res.writeHead(200, {
              'Set-Cookie': 'SID=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
              'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({ success: true, message: 'Logged out' }));
            return;
          }

          res.writeHead(404);
          res.end();
        }

        private parseCookies(cookieHeader?: string): Record<string, string> {
          const list: Record<string, string> = {};
          if (!cookieHeader) return list;
          cookieHeader.split(';').forEach((cookie) => {
            const parts = cookie.split('=');
            list[parts.shift()!.trim()] = decodeURI(parts.join('='));
          });
          return list;
        }
      }

      // ==========================================
      // 2. STATELESS JWT TOKEN ENGINE IMPLEMENTATION
      // ==========================================
      class StatelessTokenServer {
        // Generate asymmetric RSA keys for token signing and verification
        private privateKey: string;
        private publicKey: string;

        constructor() {
          const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
          });
          this.privateKey = privateKey;
          this.publicKey = publicKey;
        }

        public handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
          const url = req.url || '';

          if (url === '/login' && req.method === 'POST') {
            const userId = 'user_98765';
            
            // Create JWT header and payload
            const header = JSON.stringify({ alg: 'RS256', typ: 'JWT' });
            const payload = JSON.stringify({
              sub: userId,
              exp: Math.floor(Date.now() / 1000) + 15 * 60 // 15 minutes
            });

            // Base64Url encode parts
            const encodedHeader = this.base64UrlEncode(Buffer.from(header));
            const encodedPayload = this.base64UrlEncode(Buffer.from(payload));

            // Cryptographic signing with private key
            const signer = crypto.createSign('RSA-SHA256');
            signer.update(`${encodedHeader}.${encodedPayload}`);
            const signature = signer.sign(this.privateKey);
            const encodedSignature = this.base64UrlEncode(signature);

            const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ token: jwt }));
            return;
          }

          if (url === '/profile' && req.method === 'GET') {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Unauthorized: Missing Bearer token' }));
              return;
            }

            const token = authHeader.split(' ')[1];
            const parts = token.split('.');
            if (parts.length !== 3) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Bad Request: Invalid token format' }));
              return;
            }

            const [headerB64, payloadB64, signatureB64] = parts;

            // Stateless verification: decrypt/verify signature using public key (no DB read)
            const verifier = crypto.createVerify('RSA-SHA256');
            verifier.update(`${headerB64}.${payloadB64}`);
            
            const isVerified = verifier.verify(
              this.publicKey,
              Buffer.from(signatureB64, 'base64url')
            );

            if (!isVerified) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Unauthorized: Invalid token signature' }));
              return;
            }

            // Decode payload and verify expiration
            const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
            if (Math.floor(Date.now() / 1000) > payload.exp) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Unauthorized: Token expired' }));
              return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ userId: payload.sub, model: 'stateless-token' }));
            return;
          }

          if (url === '/logout' && req.method === 'POST') {
            // Note: Since this server is stateless, we cannot revoke the token immediately.
            // We can only instruct the client to discard it.
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: 'Token discarded by client, but it remains cryptographically valid until expiration.'
            }));
            return;
          }

          res.writeHead(404);
          res.end();
        }

        private base64UrlEncode(buf: Buffer): string {
          return buf.toString('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
        }
      }

      // Startup code simulation
      const sessionServer = new StatefulSessionServer();
      const tokenServer = new StatelessTokenServer();

      http.createServer((req, res) => {
        if (req.url?.startsWith('/session')) {
          req.url = req.url.replace('/session', '');
          sessionServer.handleRequest(req, res);
        } else {
          req.url = req.url?.replace('/token', '');
          tokenServer.handleRequest(req, res);
        }
      }).listen(8080, () => {
        console.log('Authentication servers running on port 8080');
      });
---

## The Concept

Authentication is the mechanism by which a server identifies a user requesting resources. When an API receives a request, it must verify the sender's identity. Historically, web applications relied on stateful session systems where the server remembered each logged-in client. With the rise of horizontal scalability and microservices, stateless token models like JSON Web Tokens (`JWT`) emerged. 

The core architectural trade-off is simple:
* **Stateful Sessions** prioritize centralization and control. The server holds the source of truth, making token revocation instant, but requiring database queries for every API request.
* **Stateless Tokens** prioritize performance and scale. The user holds their own claims in a cryptographically signed token. The server validates the token using local CPU operations without hitting a database, but cannot easily revoke a compromised token.

<svg viewBox="0 0 580 280" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;"><text x="290" y="20" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Session-Based vs Token-Based Authentication Flow</text><line x1="290" y1="40" x2="290" y2="260" stroke="#4c566a" stroke-dasharray="4" stroke-width="1"/><text x="145" y="45" fill="#88c0d0" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Stateful Session Auth</text><rect x="20" y="60" width="70" height="40" rx="4" fill="#2e3440" stroke="#81a1c1" stroke-width="1"/><text x="55" y="85" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Client</text><rect x="110" y="60" width="75" height="40" rx="4" fill="#3b4252" stroke="#eceff4" stroke-width="1"/><text x="147" y="85" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">App Server</text><rect x="205" y="60" width="75" height="40" rx="4" fill="#2e3440" stroke="#ebcb8b" stroke-width="1"/><text x="242" y="85" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle">Session Store</text><path d="M 55 100 L 55 240" stroke="#4c566a" stroke-dasharray="2" stroke-width="1"/><path d="M 147 100 L 147 240" stroke="#4c566a" stroke-dasharray="2" stroke-width="1"/><path d="M 242 100 L 242 240" stroke="#4c566a" stroke-dasharray="2" stroke-width="1"/><path d="M 55 120 L 147 120" stroke="#eceff4" stroke-width="1" fill="none" marker-end="url(#arrow-sec)"/><text x="101" y="115" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">1. Request + Cookie (Session ID)</text><path d="M 147 140 L 242 140" stroke="#ebcb8b" stroke-width="1" fill="none" marker-end="url(#arrow-yel)"/><text x="194" y="135" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">2. Look up ID</text><path d="M 242 170 L 147 170" stroke="#ebcb8b" stroke-width="1" fill="none" marker-end="url(#arrow-yel)"/><text x="194" y="165" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">3. Return User Data</text><path d="M 147 200 L 55 200" stroke="#a3be8c" stroke-width="1" fill="none" marker-end="url(#arrow-green)"/><text x="101" y="195" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">4. HTTP 200 OK (Data)</text><text x="435" y="45" fill="#88c0d0" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Stateless Token Auth</text><rect x="310" y="60" width="70" height="40" rx="4" fill="#2e3440" stroke="#81a1c1" stroke-width="1"/><text x="345" y="85" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">Client</text><rect x="430" y="60" width="100" height="40" rx="4" fill="#3b4252" stroke="#eceff4" stroke-width="1"/><text x="480" y="85" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">App Server</text><path d="M 345 100 L 345 240" stroke="#4c566a" stroke-dasharray="2" stroke-width="1"/><path d="M 480 100 L 480 240" stroke="#4c566a" stroke-dasharray="2" stroke-width="1"/><path d="M 345 120 L 480 120" stroke="#eceff4" stroke-width="1" fill="none" marker-end="url(#arrow-sec)"/><text x="412" y="115" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">1. Request + JWT in Header</text><path d="M 480 140 L 520 140 A 15 15 0 0 1 520 170 L 480 170" stroke="#ebcb8b" stroke-width="1" fill="none" marker-end="url(#arrow-yel)"/><text x="545" y="158" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">2. Cryptographic</text><text x="545" y="168" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">Signature Check</text><path d="M 480 200 L 345 200" stroke="#a3be8c" stroke-width="1" fill="none" marker-end="url(#arrow-green)"/><text x="412" y="195" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">3. HTTP 200 OK (Data)</text><defs><marker id="arrow-sec" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#eceff4"/></marker><marker id="arrow-yel" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#ebcb8b"/></marker><marker id="arrow-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#a3be8c"/></marker></defs></svg>

---

## Practical Analogy

Authentication models mirror the differences between event tickets and hotel key cards:

* **Stateful Sessions** are like a **hotel key card**. The card itself has a simple identifier. Every time you scan it on a door lock, the lock queries the hotel's central database to see if room 204 is still rented by you, if your payment went through, and if your checkout time has passed. If you lose your card or get evicted, the receptionist deactivates the key card immediately in the central system.
* **Stateless Tokens** are like a printed **concert ticket**. The ticket contains explicit assertions: "Seat 12B, concert date: June 15th, signed by Ticketmaster." The ticket checker at the door validates the barcode signature with their hand scanner, checking the ticket's internal math validity. The checker does not call Ticketmaster's central server for every attendee. However, if you steal someone's ticket, they cannot easily deactivate it without creating a complex blocklist of stolen serial numbers at the door.

---

## Stateful Session Authentication

In the **Stateful Session** model, the server holds the session record. When a client logs in, the server generates a unique, cryptographically random string, the **session ID**. The server writes this ID to its memory, database, or high-performance cache (e.g. `Redis`). It then sends the session ID back to the client, typically packaged in an HTTP `Set-Cookie` header.

* **Client storage**: The browser receives the cookie and automatically attaches it to every subsequent HTTP request to that domain.
* **Server verification**: When the client requests a secure profile page, the server extracts the session ID from the `Cookie` header. It must query its session cache or database to find the user profile mapping. 

The primary advantage is control: because the session is evaluated on every request, the server can terminate a session instantly (e.g. if the user clicks logout or their password is changed). The main disadvantage is scaling: if an API receives thousands of requests per second, the state store becomes a read bottleneck, requiring database scaling or caching strategies.

---

## Stateless Token Authentication

The **Stateless Token** model eliminates the server-side lookup. During authentication, the server generates a token (usually a `JWT`) containing the user's details, authorization claims, and expiration date. The server signs this data block using a secret key (symmetric HMAC) or a private key (asymmetric RSA/ECDSA).

The client receives the token and stores it, typically in browser local storage or in memory, sending it to the server in the `Authorization: Bearer <token>` header of subsequent API requests.

The server verifies the request by extracting the token and running a cryptographic math check:
* It reads the public key or shared secret.
* It recalculates the signature of the payload and header.
* It compares the calculated signature with the one in the token.
* It verifies the expiration time is in the future.

This verification path is purely computational. No databases are queried, enabling horizontal scaling: if you have ten application servers, any of them can verify the token without sharing a session store.

---

## Verification and Validation Paths

The contrasting paths highlight why token-based systems are popular in microservices:

| Feature | Stateful Sessions | Stateless Tokens (JWT) |
| :--- | :--- | :--- |
| **Verification Method** | State lookup (database/cache read) | Cryptographic signature validation (CPU computation) |
| **Scalability** | Harder: requires centralized database or distributed cache | Easy: share public verification keys across servers |
| **Revocation** | Instant: remove session ID from storage | Latent: must wait for expiration or use a blocklist |
| **Data Payload** | Minimal: only a random ID string | Larger: contains header, payload, and signatures |

---

## Security Profiles: Cookies vs LocalStorage

Authentication security depends heavily on how the credentials are stored on the client side:

### Cookie Protections
Sessions are typically stored in cookies, which benefit from native browser security features:
* `HttpOnly`: Prevents client-side scripts (such as JavaScript) from reading the cookie, neutralizing the risk of credential theft via Cross-Site Scripting (**XSS**).
* `Secure`: Forces the browser to transmit the cookie only over encrypted `HTTPS` connections.
* `SameSite`: Controls whether cookies are sent on cross-site requests, mitigating Cross-Site Request Forgery (**CSRF**) attacks. Set to `Strict` or `Lax` to block external scripts from executing ambient credentialed requests.

### Token Protections
Tokens are often stored in `localStorage` or `sessionStorage` because JavaScript APIs must read them to build request headers. 
* **XSS Vulnerability**: If an attacker succeeds in running malicious JavaScript on the page, they can immediately read the token from `localStorage` and transmit it to an external server.
* **CSRF Mitigation**: Because tokens are not automatically sent by the browser like cookies, they are immune to typical CSRF attacks. The client must explicitly read the token and set the authorization header.

---

## Revocation and Lifetime Management

Because stateless tokens are verified locally, they cannot be instantly revoked. If an administrator disables an account, or if a user logs out, the client might discard the token from local storage, but the token itself remains cryptographically valid. Anyone who intercepted the token can continue making valid API calls until it expires.

To mitigate this limitation, APIs use a hybrid strategy:

* **Short-Lived Access Tokens**: Access tokens expire quickly (e.g. 5 to 15 minutes), minimizing the window of vulnerability if a token is stolen.
* **Long-Lived Refresh Tokens**: A separate refresh token is stored securely (e.g. in a secure, `HttpOnly` cookie). When the access token expires, the client calls a `/refresh` endpoint. The refresh endpoint is stateful: it checks the database to confirm the user is still active and returns a new access token.
* **Revocation Blocklists**: For immediate revocation, servers can maintain a Redis cache of revoked token IDs (`jti` claim). Although this introduces a state lookup, it is limited to the subset of explicitly revoked tokens, keeping verification overhead low.

---

## Further Reading

* [RFC 7519: JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519) — The official specification defining JWT formats and claims.
* [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) — Guidelines on managing secure cookies, session expiration, and protection mechanisms.
* [Pragmatic Web Security: JWT Security Best Practices](https://pragmaticwebsecurity.com/) — Technical security guides on token storage, signature algorithms, and JWT validation.
