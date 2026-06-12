---
title: TLS Handshake
slug: tls-handshake
summary: "Understand the cryptographic protocol that secures communication over the internet, negotiating cipher keys and validating server identities."
difficulty: intermediate
chapterId: foundations
domain: Foundations
estimatedMinutes: 12
prerequisites: [network-sockets-tcp-udp]
related: [http]
seo_title: "TLS Handshake: TLS 1.2 vs TLS 1.3 cryptographic key negotiation"
seo_description: "Learn how the TLS handshake secures web traffic. Master symmetric vs asymmetric encryption, ECDHE key exchanges, digital certificates, intermediate CA chains, and 0-RTT session resumption."
canonical_url: "/concepts/tls-handshake"
citations:
  - title: "The Transport Layer Security (TLS) Protocol Version 1.3"
    author: "Eric Rescorla"
    chapter: "RFC 8446"
    page_range: "1-120"
    external_link: "https://datatracker.ietf.org/doc/html/rfc8446"
code_examples:
  - language: go
    title: "Raw TLS 1.3 Client Connection and Certificate Chain Verification"
    code: |
      package main

      import (
          "crypto/tls"
          "crypto/x509"
          "fmt"
          "log"
          "net"
          "time"
      )

      func main() {
          address := "cloudflare.com:443"
          dialer := &net.Dialer{ Timeout: 5 * time.Second }

          // Establish a raw TCP connection
          conn, err := dialer.Dial("tcp", address)
          if (err != nil) {
              log.Fatalf("Failed to establish TCP socket: %v", err)
          }
          defer conn.Close()

          // Configure TLS settings, enforcing TLS 1.3 and ALPN HTTP/2
          config := &tls.Config{
              MinVersion: tls.VersionTLS13,
              MaxVersion: tls.VersionTLS13,
              NextProtos: []string{"h2", "http/1.1"},
              ServerName: "cloudflare.com",
          }

          // Wrap the raw network connection inside a secure TLS client context
          tlsConn := tls.Client(conn, config)
          
          // Initiate the cryptographic handshake
          err = tlsConn.Handshake()
          if (err != nil) {
              log.Fatalf("TLS Handshake failure: %v", err)
          }

          state := tlsConn.ConnectionState()
          fmt.Printf("Connection established: %s\n", address)
          fmt.Printf("Negotiated Protocol: %s\n", state.NegotiatedProtocol)
          fmt.Printf("TLS Version: 0x%X\n", state.Version)
          fmt.Printf("Cipher Suite: %s\n\n", tls.CipherSuiteName(state.CipherSuite))

          // Inspect the server certificate chain
          fmt.Println("Server Certificate Chain:")
          for i, cert := range state.PeerCertificates {
              fmt.Printf("[%d] Subject: %s\n", i, cert.Subject.CommonName)
              fmt.Printf("    Issuer:  %s\n", cert.Issuer.CommonName)
              fmt.Printf("    Expires: %s\n", cert.NotAfter.Format(time.RFC3339))
              
              // Verify certificate cryptographic validity
              _, err := cert.Verify(x509.VerifyOptions{
                  DNSName: "cloudflare.com",
                  Roots:   nil, // System root stores used when nil
              })
              if (err != nil) {
                  fmt.Printf("    Verification: FAILED (%v)\n", err)
              } else {
                  fmt.Println("    Verification: VALID")
              }
          }
      }
---

## Cryptographic Foundations: Symmetric vs. Asymmetric

To protect data transferred across a public network from eavesdropping or modification, security protocols combine two distinct branches of cryptography:

* **Asymmetric Encryption (Public Key Cryptography)**: Uses a mathematically linked key pair. Data encrypted with a **public key** can only be decrypted by the corresponding **private key**, and vice versa. Because asymmetric operations require intensive CPU calculations, they are reserved for identity validation and session key negotiation.
* **Symmetric Encryption (Bulk Encryption)**: Uses a single **session key** shared between the client and server to both encrypt and decrypt data. Once established, symmetric encryption is highly efficient, processing gigabytes of network traffic with minimal CPU overhead.

The **Transport Layer Security** (TLS) protocol combines these tools. It uses asymmetric cryptography during the handshake phase to authenticate the server and securely establish a shared secret. 

Once the handshake completes, both sides switch to symmetric encryption to protect the application data stream.

---

## Handshake Latency: TLS 1.2 vs. TLS 1.3

A key challenge when securing web connections is minimizing the latency introduced by negotiating security settings. The evolution from TLS 1.2 to TLS 1.3 significantly reduced this latency.

### The TLS 1.2 Handshake (2 RTT)
In TLS 1.2, establishing a secure connection requires two full network round-trips (Round Trip Times, or RTT) after the initial TCP connection is established:

1. **ClientHello / ServerHello**: The client sends its supported version, algorithms, and a random number. The server responds with its selection, certificate, and key parameters.
2. **Key Exchange**: The client validates the certificate, generates key parameters, and sends them to the server. Both sides compute the master secret.
3. **Finish**: Both sides exchange encrypted validation messages to verify the handshake has not been tampered with.

### The TLS 1.3 Handshake (1 RTT)
TLS 1.3 optimizes this process by combining messages. It assumes the client will likely use modern cryptographic algorithms:

* In the first message (**ClientHello**), the client sends its supported algorithms along with its Elliptic Curve Diffie-Hellman key share guess.
* The server processes the request, selects the matching algorithm, returns its key share (**ServerHello**), and immediately begins sending encrypted certificates and handshakes.
* The handshake completes in a single round-trip, saving one full network transition.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 340" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="24" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">TLS Handshake Latency: TLS 1.2 vs. TLS 1.3</text>
  <line x1="290" y1="50" x2="290" y2="310" stroke="#4c566a" stroke-dasharray="3,3" stroke-width="1.5"/>
  <text x="145" y="55" fill="#eceff4" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">TLS 1.2 Handshake (2 RTT)</text>
  <text x="435" y="55" fill="#a3be8c" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">TLS 1.3 Handshake (1 RTT)</text>
  <line x1="50" y1="80" x2="50" y2="280" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="50" y="75" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Client</text>
  <line x1="240" y1="80" x2="240" y2="280" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="240" y="75" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Server</text>
  <path d="M 50 100 L 240 120" stroke="#d8dee9" stroke-width="1.2" fill="none"/>
  <polygon points="240,120 232,116 235,122" fill="#d8dee9"/>
  <text x="145" y="105" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">ClientHello</text>
  <path d="M 240 120 L 50 160" stroke="#ebcb8b" stroke-width="1.2" fill="none"/>
  <polygon points="50,160 58,164 55,158" fill="#ebcb8b"/>
  <text x="145" y="145" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">ServerHello + Cert + KeyExchange</text>
  <path d="M 50 180 L 240 220" stroke="#ebcb8b" stroke-width="1.2" fill="none"/>
  <polygon points="240,220 232,216 235,222" fill="#ebcb8b"/>
  <text x="145" y="205" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">ClientKeyExchange + Finished</text>
  <path d="M 240 220 L 50 260" stroke="#a3be8c" stroke-width="1.2" fill="none"/>
  <polygon points="50,260 58,264 55,258" fill="#a3be8c"/>
  <text x="145" y="245" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">Finished (Encrypted Session OK)</text>
  <line x1="340" y1="80" x2="340" y2="280" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="340" y="75" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Client</text>
  <line x1="530" y1="80" x2="530" y2="280" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="530" y="75" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Server</text>
  <path d="M 340 100 L 530 140" stroke="#d8dee9" stroke-width="1.2" fill="none"/>
  <polygon points="530,140 522,136 525,142" fill="#d8dee9"/>
  <text x="435" y="115" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">ClientHello + KeyShare (ECDHE)</text>
  <path d="M 530 140 L 340 220" stroke="#a3be8c" stroke-width="1.2" fill="none"/>
  <polygon points="340,220 348,224 345,218" fill="#a3be8c"/>
  <text x="435" y="180" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">ServerHello + KeyShare + Cert + Finished</text>
  <path d="M 340 240 L 530 260" stroke="#88c0d0" stroke-width="1.5" fill="none" stroke-dasharray="2,2"/>
  <polygon points="530,260 522,256 525,262" fill="#88c0d0"/>
  <text x="435" y="250" fill="#88c0d0" font-family="sans-serif" font-size="8" text-anchor="middle">Application Data (Encrypted)</text>
</svg>

---

## Elliptic Curve Diffie-Hellman Ephemeral (ECDHE)

The primary mechanism for session key exchange in modern TLS implementations is **Elliptic Curve Diffie-Hellman Ephemeral** (ECDHE). 

* **Diffie-Hellman**: A mathematical method that allows two parties to agree on a shared secret over an insecure channel without transmitting the secret itself.
* **Elliptic Curve (EC)**: Uses the algebraic structure of elliptic curves over finite fields to achieve the same security as classical Diffie-Hellman but with much smaller key sizes (e.g., a 256-bit EC key provides similar security to a 3,072-bit RSA key).
* **Ephemeral (E)**: Means the key pair generated for the handshake is temporary and discarded immediately after the session concludes.

Using ephemeral key exchanges ensures **forward secrecy**. If a server's long-term private signing key is compromised in the future, the attacker cannot decrypt historical traffic recordings because each session used its own unique, temporary key pair.

---

## Public Key Infrastructure (PKI)

To prevent man-in-the-middle attacks, the client must verify that the public key it receives during the handshake actually belongs to the target domain name. This identity verification relies on the **Public Key Infrastructure** (PKI).

A domain owner requests a digital certificate from a **Certificate Authority** (CA). The CA verifies the owner's domain control and issues a cryptographically signed certificate.

```
       ┌────────────────────────┐
       │   Root CA Certificate  │ (Pre-installed in OS/Browser root store)
       └───────────┬────────────┘
                   │
                   ▼ (Signs)
       ┌────────────────────────┐
       │ Intermediate CA Cert   │ (Used to sign domain certificates)
       └───────────┬────────────┘
                   │
                   ▼ (Signs)
       ┌────────────────────────┐
       │   Domain Certificate   │ (Sent by server during TLS Handshake)
       └────────────────────────┘
```

Operating systems and web browsers ship with pre-installed root certificates from trusted CAs in their **root stores**. 

When the server sends its certificate, the client builds and verifies the intermediate signing chain up to a trusted root certificate in its local store.

---

## Certificate Validation Checks

To validate a certificate during the handshake, the client performs several checks:

1. **Signature Chain Verification**: The client validates each certificate signature in the chain using the issuer's public key.
2. **Domain Name Matching**: The client checks that the host name in the request matches the Subject Alternative Name (SAN) field in the certificate.
3. **Validity Period**: The client verifies that the current date falls between the certificate's activation and expiration dates.
4. **Revocation Status**: The client checks if the certificate has been revoked before its expiration date. This is done via a Certificate Revocation List (CRL) or by querying an Online Certificate Status Protocol (OCSP) responder. In high-performance setups, servers use **OCSP Stapling** to fetch the revocation status from the CA and attach it to the handshake, saving the client a round-trip query.

---

## Performance Optimizations: Session Resumption and 0-RTT

To avoid handshake overhead during subsequent connections, TLS supports two session resumption methods:

* **Session IDs**: The server caches session keys under a unique ID. If the client reconnects using this ID, the server can resume the session, bypassing the full handshake. This requires the server to maintain a state cache.
* **Session Tickets (NST)**: The server encrypts the session state and sends it to the client as a ticket. When reconnecting, the client sends this ticket back to the server, which decrypts it to restore the session. This model is stateless for the server.

In TLS 1.3, session tickets enable **0-RTT (Zero-Round Trip Time) reconnection**. The client sends encrypted application data (like an HTTP GET request) in its first handshake message along with the session ticket. 

While 0-RTT eliminates latency, it is vulnerable to **replay attacks**, as an attacker could capture and replay the packet. To mitigate this risk, 0-RTT should only be used for safe, idempotent requests.

---

## Cipher Suite Components

During the handshake, the client and server negotiate a **cipher suite**: a structured combination of cryptographic algorithms that will secure the session. 

In TLS 1.2, a cipher suite specifies four algorithms:

```
        TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
            │      │          │       │
            │      │          │       └─ Hash (MAC/KDF)
            │      │          └─ Bulk Cipher (Symmetric)
            │      └─ Authentication (Asymmetric Signature)
            └─ Key Exchange (Asymmetric Negotiation)
```

In TLS 1.3, this structure is simplified to specify only the symmetric encryption parameters:

```
        TLS_AES_256_GCM_SHA384
            │       │     │
            │       │     └─ Hash (HKDF)
            │       └─ Authenticated Symmetric Cipher Mode
            └─ TLS Protocol Identifier
```

The authentication and key exchange algorithms are negotiated separately, reducing the number of cipher suite combinations.

---

## Protocol Negotiation: ALPN

Modern applications often multiplex different protocols over the same TCP port (such as serving both HTTP/1.1 and HTTP/2 over port 443). To negotiate which protocol to use without adding round-trips, TLS uses the **Application-Layer Protocol Negotiation** (ALPN) extension.

During the initial `ClientHello`, the client appends a list of supported application protocols (e.g., `["h2", "http/1.1"]`). The server processes this list and declares its selection in the `ServerHello`. 

This negotiation completes during the TLS handshake, allowing the client and server to begin exchanging application-specific frames immediately.

---

## Further Reading

* [The Transport Layer Security (TLS) Protocol Version 1.3 (RFC 8446)](https://datatracker.ietf.org/doc/html/rfc8446) — The official IETF specification for TLS 1.3.
* [High Performance Browser Networking](https://hpbn.co/) — Chapter 4 by Ilya Grigorik covers TLS performance, resumption, and optimization.
* [How HTTPS Works](https://howhttps.works/) — A visual explanation of TLS handshakes and PKI.
* [OCSP Stapling (RFC 6066)](https://datatracker.ietf.org/doc/html/rfc6066) — Explains extensions for client certificate status request operations.
