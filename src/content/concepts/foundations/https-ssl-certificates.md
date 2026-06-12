---
title: HTTPS & SSL/TLS Certificates Basics
slug: https-ssl-certificates
summary: "Understand how HTTPS layers HTTP over TLS, the structure of X.509 digital certificates, intermediate trust chains, and automated ACME provisioning."
difficulty: beginner
chapterId: foundations
domain: Foundations
estimatedMinutes: 10
prerequisites: [http, tls-handshake]
related: [tls-handshake]
seo_title: "HTTPS and SSL/TLS Certificates: Trust Chains and ACME"
seo_description: "Learn how HTTPS protects web communication using TLS, X.509 certificates, CA validation chains, and automated Let's Encrypt ACME provisioning."
canonical_url: "/concepts/https-ssl-certificates"
citations:
  - title: "Internet X.509 Public Key Infrastructure Profile"
    author: "D. Cooper, S. Santesson, S. Farrell, S. Boeyen, R. Housley, W. Polk"
    chapter: "RFC 5280"
    page_range: "1-135"
    external_link: "https://datatracker.ietf.org/doc/html/rfc5280"
code_examples:
  - language: go
    title: "Creating self-signed X.509 certificates and running an HTTPS Server from scratch"
    code: |
      package main

      import (
          "crypto/rand"
          "crypto/rsa"
          "crypto/tls"
          "crypto/x509"
          "crypto/x509/pkix"
          "encoding/pem"
          "fmt"
          "log"
          "math/big"
          "net"
          "net/http"
          "time"
      )

      func main() {
          // Generate a 2048-bit RSA private key
          priv, err := rsa.GenerateKey(rand.Reader, 2048)
          if err != nil {
              log.Fatalf("Failed to generate private key: %v", err)
          }

          // Set up the X.509 certificate template
          notBefore := time.Now()
          notAfter := notBefore.Add(365 * 24 * time.Hour) // 1 year validity

          serialNumberLimit := new(big.Int).Lsh(big.NewInt(1), 128)
          serialNumber, err := rand.Int(rand.Reader, serialNumberLimit)
          if err != nil {
              log.Fatalf("Failed to generate serial number: %v", err)
          }

          template := x509.Certificate{
              SerialNumber: serialNumber,
              Subject: pkix.Name{
                  Organization: []string{"Graphy Learning Platform"},
                  CommonName:   "localhost",
              },
              NotBefore:             notBefore,
              NotAfter:              notAfter,
              KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
              ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
              BasicConstraintsValid: true,
              IPAddresses:           []net.IP{net.ParseIP("127.0.0.1")},
              DNSNames:              []string{"localhost"},
          }

          // Self-sign the certificate using the template and private key
          derBytes, err := x509.CreateCertificate(rand.Reader, &template, &template, &priv.PublicKey, priv)
          if err != nil {
              log.Fatalf("Failed to create certificate: %v", err)
          }

          // PEM-encode the certificate and private key
          certPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: derBytes})

          privBytes, err := x509.MarshalPKCS8PrivateKey(priv)
          if err != nil {
              log.Fatalf("Failed to marshal private key: %v", err)
          }
          keyPEM := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: privBytes})

          // Load certificate and private key into tls.Certificate
          cert, err := tls.X509KeyPair(certPEM, keyPEM)
          if err != nil {
              log.Fatalf("Failed to load X509 key pair: %v", err)
          }

          // Configure TLS settings
          tlsConfig := &tls.Config{
              Certificates: []tls.Certificate{cert},
              MinVersion:   tls.VersionTLS13,
          }

          // Create HTTP handler
          mux := http.NewServeMux()
          mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
              w.Header().Set("Content-Type", "text/plain")
              fmt.Fprintf(w, "Hello, secure world! Served over HTTPS.\n")
          })

          // Create TCP listener and wrap in TLS
          listener, err := net.Listen("tcp", "127.0.0.1:8443")
          if err != nil {
              log.Fatalf("Failed to listen: %v", err)
          }
          tlsListener := tls.NewListener(listener, tlsConfig)
          defer tlsListener.Close()

          log.Println("HTTPS server starting on https://127.0.0.1:8443")
          server := &http.Server{Handler: mux}
          if err := server.Serve(tlsListener); err != nil {
              log.Fatalf("Server failed: %v", err)
          }
      }
---

## What is HTTPS?

**Hypertext Transfer Protocol Secure** (HTTPS) is not a separate protocol from HTTP. Instead, it is the secure version of HTTP, where ordinary HTTP transactions are layered over a secure **Transport Layer Security** (TLS) session. 

In a traditional web request, your browser speaks plain HTTP directly over a raw TCP connection. With HTTPS, the browser first establishes a TCP connection, performs a TLS handshake to secure the channel, and then transmits HTTP request and response payloads encrypted through that channel.

### Real-World Analogy
Think of plain HTTP as writing a letter on a postcard. Anyone who handles the postcard, from your local mail carrier to sorting facilities, can read your message (e.g. login credentials) or even scribble over it to modify the text. HTTPS is like placing the letter in an armored lockbox before mailing it. The lockbox is secure, but you also need a trusted way to verify that the person handing you the lockbox is actually who they claim to be. That is where digital certificates act as official, tamper-proof ID badges.

---

## The Threat of Unencrypted HTTP

Operating a website or API over plain HTTP exposes users and servers to significant security risks, primarily through two types of active and passive network attacks:

* **Packet Sniffing**: Attackers on the same network (like a public Wi-Fi hotspot) use network analyzers to capture raw IP packets. Because HTTP transmits headers and bodies in clear text, attackers can easily extract sensitive credentials, session tokens, and personal data.
* **Packet Injection**: Middleboxes, internet service providers, or malicious actors can intercept HTTP packets in transit and alter their payloads. This allows them to inject unwanted advertisements, track scripts, or malicious code directly into the web pages served to clients.

By encrypting the entire application payload, HTTPS ensures **confidentiality** (preventing sniffing) and **integrity** (preventing injection or tampering).

---

## Certificate Structures and the X.509 Format

To prove their identity, web servers present digital certificates formatted according to the **X.509** standard. An X.509 certificate acts as a public ledger binding a public key to an identity (such as a domain name).

An X.509 certificate contains several structured fields:

* **Subject Name**: The entity to which the certificate is issued, typically identified by a Common Name (CN) or listed inside the Subject Alternative Name (SAN) field for domain names.
* **Issuer**: The Certificate Authority (CA) that validated the entity and generated the certificate signature.
* **Validity Period**: The time window, marked by `Not Before` and `NotAfter` timestamps, during which the certificate is cryptographically valid.
* **Public Key**: The cryptographic public key belonging to the server, used by clients during the TLS handshake to encrypt session information or verify signatures.
* **CA Digital Signature**: A hash of the certificate's fields, encrypted using the CA's private key. This ensures the certificate fields cannot be altered without breaking the signature.

---

## Verification Steps and the Chain of Trust

When a browser connects to an HTTPS server, it receives the server's certificate along with a chain of intermediate certificates. The browser must cryptographically verify that the certificate is authentic by tracing it back to a trusted source.

This verification walks up a **Chain of Trust**:

<svg viewBox="0 0 580 320" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="25" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">HTTPS Certificate Chain of Trust Verification</text>
  <rect x="20" y="70" width="150" height="220" rx="8" fill="#2e3440" stroke="#88c0d0" stroke-width="2"/>
  <text x="95" y="92" fill="#eceff4" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Client (Browser)</text>
  <rect x="30" y="180" width="130" height="90" rx="4" fill="#3b4252" stroke="#81a1c1" stroke-dasharray="3,3"/>
  <text x="95" y="198" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Local Root Store</text>
  <rect x="38" y="210" width="114" height="22" rx="2" fill="#4c566a"/>
  <text x="95" y="224" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">ISRG Root X1 (Trusted)</text>
  <rect x="38" y="238" width="114" height="22" rx="2" fill="#4c566a"/>
  <text x="95" y="252" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">DigiCert Root (Trusted)</text>
  <rect x="420" y="70" width="140" height="70" rx="8" fill="#2e3440" stroke="#ebcb8b" stroke-width="2"/>
  <text x="490" y="95" fill="#eceff4" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Web Server</text>
  <text x="490" y="115" fill="#81a1c1" font-family="sans-serif" font-size="10" text-anchor="middle">example.com</text>
  <path d="M 420 105 L 340 105" stroke="#eceff4" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>
  <text x="380" y="95" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">1. Send Certs</text>
  <g transform="translate(200, 70)">
    <rect x="0" y="0" width="190" height="45" rx="4" fill="#3b4252" stroke="#a3be8c" stroke-width="1.5"/>
    <text x="95" y="18" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Root CA Certificate</text>
    <text x="95" y="32" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Subject: ISRG Root X1 | Self-Signed</text>
    <rect x="0" y="70" width="190" height="45" rx="4" fill="#3b4252" stroke="#88c0d0" stroke-width="1.5"/>
    <text x="95" y="88" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Intermediate CA Certificate</text>
    <text x="95" y="102" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Subject: Let's Encrypt R3 | Issuer: Root CA</text>
    <rect x="0" y="140" width="190" height="45" rx="4" fill="#3b4252" stroke="#ebcb8b" stroke-width="1.5"/>
    <text x="95" y="158" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Domain Certificate</text>
    <text x="95" y="172" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Subject: example.com | Issuer: R3</text>
    <path d="M 95 140 L 95 123" stroke="#ebcb8b" stroke-width="1.5" fill="none" marker-end="url(#arrow_y)"/>
    <text x="135" y="132" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">2. Verify Issuer Signature</text>
    <path d="M 95 70 L 95 53" stroke="#88c0d0" stroke-width="1.5" fill="none" marker-end="url(#arrow_b)"/>
    <text x="135" y="62" fill="#88c0d0" font-family="sans-serif" font-size="8" text-anchor="middle">3. Verify CA Signature</text>
  </g>
  <path d="M 200 82 L 158 190" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#arrow_g)"/>
  <text x="175" y="135" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle" transform="rotate(-68, 175, 135)">4. Match with Root Store</text>
  <defs>
    <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#eceff4"/>
    </marker>
    <marker id="arrow_y" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#ebcb8b"/>
    </marker>
    <marker id="arrow_b" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#88c0d0"/>
    </marker>
    <marker id="arrow_g" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#a3be8c"/>
    </marker>
  </defs>
</svg>

The client browser validates the certificate using these sequential steps:

1. **Extract and Parse**: The browser extracts the server's domain certificate. It checks that the domain `example.com` matches the certificate Subject Name or SAN.
2. **Verify Signature**: The browser uses the public key of the issuer (the Intermediate CA, `Let's Encrypt R3`) to cryptographically verify the Domain Certificate's signature.
3. **Walk Up the Chain**: The browser then verifies the Intermediate CA certificate signature using the public key of the Root CA (`ISRG Root X1`).
4. **Anchor to Root Store**: The chain must end at a Root CA certificate that is stored locally in the client's operating system or browser **Root Store**. Because the root store contains certificates hardcoded by the software vendor, matching the signature against a local root certificate establishes ultimate trust.

If any signature verification fails, or if a certificate in the chain has expired, the browser aborts the TLS handshake and displays a security warning.

---

## Certificate Scopes: DV, OV, and EV

Certificate Authorities issue certificates with different validation scopes, reflecting the depth of background checking performed:

* **Domain Validation** (DV): The CA verifies only that the applicant controls the target domain name (e.g. via DNS records). DV certificates are cheap, can be issued instantly, and are ideal for standard web encryption.
* **Organization Validation** (OV): The CA verifies domain control and performs a basic check of the applicant organization's legal existence. The organization's name is embedded in the certificate.
* **Extended Validation** (EV): The CA conducts a rigorous audit of the organization's legal registration, physical address, and operational status. Historically, browsers displayed a green address bar for EV certificates, though modern browsers have phased this indicator out.

*Note: All three scopes offer identical cryptographic strength; they differ only in the level of identity assurance provided.*

---

## Certificate Management Tasks

Managing certificates involves several operational steps to ensure continuous uptime and security:

* **Generating Private Keys**: Administrators generate a private key (using RSA or ECDSA) that must remain secure on the application server. The public key is derived from this private key.
* **Creating a Certificate Signing Request** (CSR): A CSR is a structured file containing the server's public key, domain names, and organization details. This request is sent to the CA for signing.
* **Tracking Expirations**: Certificates have strict validity windows. If a certificate expires before renewal, browsers will immediately block client traffic. Operating systems and APIs must monitor certificate lifespans to trigger renewals proactively.

---

## Automated Provisioning: The ACME Protocol

Historically, requesting certificates was a manual process involving high costs and yearly administration. The **Automated Certificate Management Environment** (ACME) protocol, created by Let's Encrypt, automated this entire lifecycle.

The ACME client on the web server requests a certificate, and the CA issues a challenge to prove domain ownership:

* **HTTP-01 Challenge**: The CA requests the ACME client to place a specific token file at a designated path on the web server (e.g. `http://example.com/.well-known/acme-challenge/token`). The CA then fetches this path over plain HTTP to verify control.
* **DNS-01 Challenge**: The CA requests the ACME client to create a specific DNS TXT record (e.g. `_acme-challenge.example.com`). The CA queries the public DNS system to verify the record, which is useful for obtaining wildcard certificates where HTTP verification is impractical.

Once verified, the CA automatically issues the certificate. Because ACME certificates have short lifespans (typically 90 days), automated clients renew them every 60 days, eliminating manual overhead.

---

## Further Reading

- [RFC 5280: Internet X.509 Public Key Infrastructure Profile](https://datatracker.ietf.org/doc/html/rfc5280) — The official IETF specification defining X.509 certificate fields and trust path validation.
- [RFC 8555: Automated Certificate Management Environment (ACME)](https://datatracker.ietf.org/doc/html/rfc8555) — Detailed protocol specification detailing DNS-01 and HTTP-01 challenges.
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/) — Practical guides explaining how the ACME protocol works under the hood.
- [Mozilla Root Store Policy](https://www.mozilla.org/en-US/about/governance/policies/security-group/certs/) — Requirements and evaluation procedures for Root CAs included in client root stores.
