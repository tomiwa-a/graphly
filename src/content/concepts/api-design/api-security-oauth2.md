---
title: API Security & OAuth 2.0
slug: api-security-oauth2
summary: "Understand API authentication and authorization mechanisms, JWT security, and the OAuth 2.0 framework including Authorization Code Flow with PKCE."
difficulty: intermediate
chapterId: api-design
domain: API Design
estimatedMinutes: 15
prerequisites: [http]
related: [idempotency]
seo_title: "API Security, JWT, and OAuth 2.0 Explained"
seo_description: "Learn API security fundamentals, JWT structure and verification, and OAuth 2.0 authorization flows like PKCE and Client Credentials."
canonical_url: "/concepts/api-security-oauth2"
code_examples:
  - language: go
    title: JWT Signature Verification and Claims Validation (RS256)
    code: |
      package main

      import (
          "crypto"
          "crypto/rsa"
          "crypto/sha256"
          "encoding/base64"
          "encoding/json"
          "errors"
          "fmt"
          "math/big"
          "strings"
          "time"
      )

      type JWK struct {
          Kty string `json:"kty"`
          Kid string `json:"kid"`
          N   string `json:"n"`
          E   string `json:"e"`
      }

      type JWKS struct {
          Keys []JWK `json:"keys"`
      }

      type JWTHeader struct {
          Alg string `json:"alg"`
          Kid string `json:"kid"`
          Typ string `json:"typ"`
      }

      type JWTClaims struct {
          Sub string `json:"sub"`
          Iss string `json:"iss"`
          Aud string `json:"aud"`
          Exp int64  `json:"exp"`
      }

      func base64URLDecode(s string) ([]byte, error) {
          if l := len(s) % 4; l > 0 {
              s += strings.Repeat("=", 4-l)
          }
          return base64.URLEncoding.DecodeString(s)
      }

      func parseRSAPublicKey(nStr, eStr string) (*rsa.PublicKey, error) {
          nBytes, err := base64URLDecode(nStr)
          if err != nil {
              return nil, err
          }
          eBytes, err := base64URLDecode(eStr)
          if err != nil {
              return nil, err
          }
          if len(eBytes) < 4 {
              padded := make([]byte, 4)
              copy(padded[4-len(eBytes):], eBytes)
              eBytes = padded
          }
          var eVal uint32
          eVal = uint32(eBytes[0])<<24 | uint32(eBytes[1])<<16 | uint32(eBytes[2])<<8 | uint32(eBytes[3])
          return &rsa.PublicKey{
              N: new(big.Int).SetBytes(nBytes),
              E: int(eVal),
          }, nil
      }

      func VerifyRS256Token(tokenString string, jwksJSON string, expectedIss, expectedAud string) (*JWTClaims, error) {
          parts := strings.Split(tokenString, ".")
          if len(parts) != 3 {
              return nil, errors.New("invalid token format")
          }
          headerSegment, payloadSegment, signatureSegment := parts[0], parts[1], parts[2]

          headerBytes, err := base64URLDecode(headerSegment)
          if err != nil {
              return nil, fmt.Errorf("failed to decode header: %w", err)
          }
          var header JWTHeader
          if err := json.Unmarshal(headerBytes, &header); err != nil {
              return nil, err
          }
          if header.Alg != "RS256" {
              return nil, fmt.Errorf("unsupported algorithm: %s", header.Alg)
          }

          payloadBytes, err := base64URLDecode(payloadSegment)
          if err != nil {
              return nil, fmt.Errorf("failed to decode payload: %w", err)
          }
          var claims JWTClaims
          if err := json.Unmarshal(payloadBytes, &claims); err != nil {
              return nil, err
          }

          var jwks JWKS
          if err := json.Unmarshal([]byte(jwksJSON), &jwks); err != nil {
              return nil, fmt.Errorf("failed to parse JWKS: %w", err)
          }
          var targetKey *JWK
          for _, key := range jwks.Keys {
              if key.Kid == header.Kid {
                  targetKey = &key
                  break
              }
          }
          if targetKey == nil {
              return nil, fmt.Errorf("key id %s not found in JWKS", header.Kid)
          }

          pubKey, err := parseRSAPublicKey(targetKey.N, targetKey.E)
          if err != nil {
              return nil, fmt.Errorf("failed to parse public key: %w", err)
          }

          signingInput := headerSegment + "." + payloadSegment
          signatureBytes, err := base64URLDecode(signatureSegment)
          if err != nil {
              return nil, fmt.Errorf("failed to decode signature: %w", err)
          }

          hasher := sha256.New()
          hasher.Write([]byte(signingInput))
          hashed := hasher.Sum(nil)

          err = rsa.VerifyPKCS1v15(pubKey, crypto.SHA256, hashed, signatureBytes)
          if err != nil {
              return nil, fmt.Errorf("invalid signature: %w", err)
          }

          if time.Now().Unix() > claims.Exp {
              return nil, errors.New("token has expired")
          }
          if claims.Iss != expectedIss {
              return nil, fmt.Errorf("invalid issuer: got %s, expected %s", claims.Iss, expectedIss)
          }
          if claims.Aud != expectedAud {
              return nil, fmt.Errorf("invalid audience: got %s, expected %s", claims.Aud, expectedAud)
          }

          return &claims, nil
      }
---

## The Concept

Securing network-accessible APIs requires balancing user convenience with rigid access control. At its foundation, security relies on distinguishing between **authentication** (verifying who a client is) and **authorization** (verifying what a client has permission to do).

Historically, applications used stateful session cookies, storing session identifiers in a database and comparing them against cookies sent in HTTP requests. In modern distributed architectures, APIs leverage stateless **bearer tokens** (specifically JSON Web Tokens, or **JWT**) to avoid database bottlenecks and support decoupled systems.

```xml
<svg viewBox="0 0 580 340" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="20" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">OAuth 2.0 Authorization Code Flow with PKCE</text>
  <line x1="70" y1="70" x2="70" y2="300" stroke="#4c566a" stroke-width="1.5" stroke-dasharray="4 4"/>
  <line x1="220" y1="70" x2="220" y2="300" stroke="#4c566a" stroke-width="1.5" stroke-dasharray="4 4"/>
  <line x1="390" y1="70" x2="390" y2="300" stroke="#4c566a" stroke-width="1.5" stroke-dasharray="4 4"/>
  <line x1="510" y1="70" x2="510" y2="300" stroke="#4c566a" stroke-width="1.5" stroke-dasharray="4 4"/>
  <rect x="30" y="45" width="80" height="25" rx="4" fill="#2e3440" stroke="#88c0d0"/>
  <text x="70" y="61" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">User</text>
  <rect x="175" y="45" width="90" height="25" rx="4" fill="#2e3440" stroke="#88c0d0"/>
  <text x="220" y="61" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">Client (SPA)</text>
  <rect x="340" y="45" width="100" height="25" rx="4" fill="#2e3440" stroke="#88c0d0"/>
  <text x="390" y="61" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">Auth Server</text>
  <rect x="465" y="45" width="90" height="25" rx="4" fill="#2e3440" stroke="#88c0d0"/>
  <text x="510" y="61" fill="#eceff4" font-family="sans-serif" font-size="10" text-anchor="middle">Resource API</text>
  <path d="M 220 90 L 390 90" stroke="#d8dee9" stroke-width="1.2" marker-end="url(#arrow)"/>
  <text x="305" y="84" fill="#d8dee9" font-family="sans-serif" font-size="9" text-anchor="middle">1. Auth Redirect + challenge</text>
  <path d="M 70 120 L 390 120" stroke="#d8dee9" stroke-width="1.2" marker-end="url(#arrow)"/>
  <text x="230" y="114" fill="#d8dee9" font-family="sans-serif" font-size="9" text-anchor="middle">2. Authenticate &amp; Consent</text>
  <path d="M 390 150 L 220 150" stroke="#d8dee9" stroke-width="1.2" marker-end="url(#arrow)"/>
  <text x="305" y="144" fill="#d8dee9" font-family="sans-serif" font-size="9" text-anchor="middle">3. Auth Code (temporary)</text>
  <path d="M 220 180 L 390 180" stroke="#a3be8c" stroke-width="1.5" marker-end="url(#arrow-green)"/>
  <text x="305" y="174" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">4. Exchange code + verifier</text>
  <path d="M 390 210 L 220 210" stroke="#a3be8c" stroke-width="1.5" marker-end="url(#arrow-green)"/>
  <text x="305" y="204" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">5. Access Token (+ Refresh)</text>
  <path d="M 220 240 L 510 240" stroke="#ebcb8b" stroke-width="1.2" marker-end="url(#arrow-yellow)"/>
  <text x="365" y="234" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle">6. Request + Bearer Token</text>
  <path d="M 510 270 L 220 270" stroke="#ebcb8b" stroke-width="1.2" marker-end="url(#arrow-yellow)"/>
  <text x="365" y="264" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle">7. Protected Resource Data</text>
  <defs>
    <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#d8dee9"/>
    </marker>
    <marker id="arrow-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#a3be8c"/>
    </marker>
    <marker id="arrow-yellow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#ebcb8b"/>
    </marker>
  </defs>
</svg>
```

---

## Practical Analogy

Think of security credentials as airport boarding processes:

* **Authentication** is proving your identity at the check-in desk by presenting a passport. The agent verifies you are who you say you are and issues a boarding pass.
* **Authorization** is the boarding pass itself. The security agents and flight crew do not look up your registration records: they read the printed pass, which details your flight number, gate, and seating class. A first-class ticket authorizes entry to the VIP lounge, whereas an economy ticket denies it.
* A **JSON Web Token** is like a digital boarding pass with a security hologram (the signature). Gate agents inspect the signature to confirm it was generated by the airline and check the flight date to ensure it has not expired.

---

## Stateful Sessions vs Stateless Tokens

In a stateful session architecture, the backend generates a unique session ID, saves it in a database or in-memory store (e.g. Redis), and returns it to the client inside a cookie. On subsequent requests, the server reads the cookie and queries the store to retrieve the user session. This approach makes invalidation simple, but it creates a central database bottleneck that hinders horizontal scaling.

Stateless token architectures encode the user state directly into a cryptographically signed token string. The server verifies the cryptographic signature without looking up the token in a database.

### JWT Anatomy
A JWT is composed of three base64url-encoded parts separated by periods:
1. **Header**: Declares the token type and the signing algorithm (e.g. `{"alg": "RS256", "typ": "JWT", "kid": "key-id-1"}`).
2. **Payload**: Houses the **claims**, which are statements about the user and token metadata (e.g. `{"sub": "user_123", "iss": "auth.server.com", "exp": 1718131200}`).
3. **Signature**: Created by signing the combined header and payload.

### Symmetric vs Asymmetric Signatures
Symmetric signing (`HS256`) uses the same secret key to both generate and verify tokens. If a microservice needs to authorize requests, it must share the secret key, creating a security risk: if any service is compromised, an attacker can forge tokens for the entire system.

Asymmetric signing (`RS256`) uses a private key held by the **Authorization Server** to sign tokens, and a corresponding public key to verify them. Resource servers only need the public key to check the signature, meaning they can safely validate tokens without any ability to forge them.

---

## The OAuth 2.0 Framework

**OAuth 2.0** is an industry-standard authorization framework. It delegates access control, allowing third-party applications to obtain limited access to an HTTP service on behalf of a resource owner.

OAuth 2.0 defines four fundamental roles:
* **Resource Owner**: The user who grants access to a protected resource.
* **Client**: The application requesting access to the resource on behalf of the owner.
* **Authorization Server**: The server that authenticates the owner, obtains authorization, and issues access tokens.
* **Resource Server (API)**: The server hosting the protected data, capable of accepting and validating access tokens.

### Key OAuth 2.0 Flows

Different client types require different authorization flows:

* **Authorization Code Flow with PKCE**: Designed for mobile apps and Single Page Applications (SPAs) where a client secret cannot be safely hidden. The client generates a random **code verifier** and hashes it to create a **code challenge**. During redirection to the Authorization Server, the client sends the challenge. Once the user approves access, the Authorization Server returns a short-lived authorization code. The client then sends a direct POST request containing the authorization code and the raw `code_verifier`. The Authorization Server hashes the verifier and validates it against the initial challenge before issuing an `access_token`, preventing interceptors from stealing the code.
* **Client Credentials Flow**: Used for machine-to-machine communication where no user is present (e.g. an internal billing service requesting database synchronizations from a user service). The client sends its secure `client_id` and `client_secret` directly to the Authorization Server to receive an access token.

---

## Token Lifecycle & Threat Mitigation

Because stateless tokens cannot be easily deleted by the server, managing their lifecycle is critical:

* **Access Token Expiration**: Access tokens are short-lived (e.g. 15 minutes) to minimize the window of opportunity if a token is stolen.
* **Refresh Tokens**: When an access token expires, the client uses a long-lived **refresh token** (e.g. 30 days) to request a new access token from the Authorization Server without prompting the user to log in again.
* **Refresh Token Rotation**: Each time a client uses a refresh token, the Authorization Server invalidates it and returns a new refresh token. If an attacker steals a refresh token, they will trigger a double-use alarm at the server when the victim attempts to refresh, prompting the server to immediately revoke all active tokens in that chain.
* **JWKS (JSON Web Key Sets)**: The Authorization Server publishes its public verification keys on a public HTTP endpoint as a JWK Set. Resource APIs download and cache these keys, allowing them to dynamically verify asymmetric token signatures and handle automatic key rotation without downtime.

---

## Common API Threats

Standard authentication does not prevent application-level authorization bugs. Developers must protect APIs against the OWASP API Security Top 10 vulnerabilities:

* **BOLA (Broken Object Level Authorization)**: Occurs when an API endpoint exposes an identifier (e.g. `/api/v1/accounts/993`) and fails to verify if the authenticated user has permission to view that specific record. An attacker can iterate the ID parameter to view other users' private accounts.
* **BFLA (Broken Function Level Authorization)**: Occurs when administrative endpoints fail to verify roles, permitting regular users to call privileged operations (e.g. a standard user sending a POST request to `/api/v1/admin/delete-user`).

---

## Further Reading

* [RFC 6749: The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749) — The core specifications for OAuth flows
* [RFC 7636: Proof Key for Code Exchange (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636) — The technical specifications for PKCE extension
* [RFC 7519: JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519) — Standard definition and structure of JWTs
* [OWASP API Security Top 10](https://owasp.org/www-project-api-security/) — Common security vulnerabilities and mitigation guidelines
