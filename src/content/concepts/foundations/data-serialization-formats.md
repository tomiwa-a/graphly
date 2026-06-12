---
title: JSON vs Protocol Buffers vs XML
slug: data-serialization-formats
summary: "Compare data serialization formats, mapping the trade-offs between text-based human-readable JSON/XML and high-performance binary Protocol Buffers."
difficulty: beginner
chapterId: foundations
domain: Foundations
estimatedMinutes: 10
prerequisites: [http]
related: [grpc]
seo_title: "JSON vs. Protobuf vs. XML: Data Serialization Formats"
seo_description: "Deep dive into data serialization formats. Compare JSON, XML, and Protocol Buffers wire sizes, parsing CPU overhead, Varint encoding, and compatibility."
canonical_url: "/concepts/data-serialization-formats"
citations:
  - title: "The JavaScript Object Notation (JSON) Data Interchange Format"
    author: "Tim Bray"
    chapter: "RFC 8259"
    page_range: "1-16"
    external_link: "https://datatracker.ietf.org/doc/html/rfc8259"
  - title: "Protocol Buffers Language Guide (proto3)"
    author: "Google Developer Documentation"
    chapter: "Developer Guide"
    page_range: "1-1"
    external_link: "https://protobuf.dev/programming-guides/proto3/"
code_examples:
  - language: go
    title: "Serialization Benchmark: JSON Parsing vs Protobuf Varint Encoding"
    code: |
      package main

      import (
          "bytes"
          "encoding/json"
          "fmt"
          "time"
      )

      // User represents a structured domain record.
      type User struct {
          Name string `json:"name"`
          Age  int32  `json:"age"`
      }

      // EncodeVarint encodes an unsigned integer into a Protobuf-style Varint.
      // It uses the most significant bit (MSB) as a continuation flag.
      func EncodeVarint(value uint64) []byte {
          var buf []byte
          for {
              b := byte(value & 0x7F)
              value >>= 7
              if value != 0 {
                  buf = append(buf, b|0x80)
              } else {
                  buf = append(buf, b)
                  break
              }
          }
          return buf
      }

      // DecodeVarint decodes a Varint from a byte slice.
      // It returns the decoded value and the number of bytes consumed.
      func DecodeVarint(buf []byte) (uint64, int) {
          var value uint64
          var shift uint
          for i, b := range buf {
              value |= uint64(b&0x7F) << shift
              if (b & 0x80) == 0 {
                  return value, i + 1
              }
              shift += 7
          }
          return 0, 0
      }

      // EncodeProtobufManual serializes a User struct to the exact Protobuf wire format.
      // Field 1 (Name): Wire Type 2 (length-delimited) -> Key: (1 << 3) | 2 = 10 (0x0A)
      // Field 2 (Age): Wire Type 0 (varint) -> Key: (2 << 3) | 0 = 16 (0x10)
      func EncodeProtobufManual(u *User) []byte {
          var buf bytes.Buffer

          // Field 1: Name (length-delimited string)
          nameBytes := []byte(u.Name)
          buf.WriteByte(10) // Field Key 10
          buf.Write(EncodeVarint(uint64(len(nameBytes))))
          buf.Write(nameBytes)

          // Field 2: Age (varint integer)
          buf.WriteByte(16) // Field Key 16
          buf.Write(EncodeVarint(uint64(u.Age)))

          return buf.Bytes()
      }

      // DecodeProtobufManual parses raw bytes back into a User struct.
      func DecodeProtobufManual(data []byte) (*User, error) {
          u := &User{}
          i := 0
          for i < len(data) {
              key, bytesRead := DecodeVarint(data[i:])
              if bytesRead == 0 {
                  return nil, fmt.Errorf("malformed key varint")
              }
              i += bytesRead

              fieldNum := key >> 3
              wireType := key & 7

              switch fieldNum {
              case 1:
                  if wireType != 2 {
                      return nil, fmt.Errorf("invalid wire type for Name: %d", wireType)
                  }
                  length, lenRead := DecodeVarint(data[i:])
                  i += lenRead
                  u.Name = string(data[i : i+int(length)])
                  i += int(length)
              case 2:
                  if wireType != 0 {
                      return nil, fmt.Errorf("invalid wire type for Age: %d", wireType)
                  }
                  val, valRead := DecodeVarint(data[i:])
                  i += valRead
                  u.Age = int32(val)
              default:
                  // Skip unknown fields (provides forward/backward compatibility)
                  return nil, fmt.Errorf("unknown field encountered: %d", fieldNum)
              }
          }
          return u, nil
      }

      func main() {
          user := &User{Name: "Alice Smith", Age: 30}

          // 1. JSON Serialization
          jsonData, err := json.Marshal(user)
          if err != nil {
              panic(err)
          }
          var decodedJSON User
          _ = json.Unmarshal(jsonData, &decodedJSON)

          // 2. Manual Protobuf Serialization
          protoData := EncodeProtobufManual(user)
          decodedProto, err := DecodeProtobufManual(protoData)
          if err != nil {
              panic(err)
          }

          fmt.Printf("Source User: %+v\n\n", user)
          fmt.Printf("JSON output: %q (%d bytes)\n", string(jsonData), len(jsonData))
          fmt.Printf("Protobuf output: %v (%d bytes)\n\n", protoData, len(protoData))

          // Benchmark loop
          iterations := 100000

          start := time.Now()
          for i := 0; i < iterations; i++ {
              data, _ := json.Marshal(user)
              var u User
              _ = json.Unmarshal(data, &u)
          }
          jsonDuration := time.Since(start)

          start = time.Now()
          for i := 0; i < iterations; i++ {
              data := EncodeProtobufManual(user)
              _, _ = DecodeProtobufManual(data)
          }
          protoDuration := time.Since(start)

          fmt.Printf("Performance over %d runs:\n", iterations)
          fmt.Printf("JSON duration:     %v\n", jsonDuration)
          fmt.Printf("Protobuf duration: %v (%.2fx faster)\n", protoDuration, float64(jsonDuration)/float64(protoDuration))
      }
---

## What is Data Serialization?

**Data serialization** is the process of converting in-memory data structures (like objects, structs, maps, or trees) into a standardized sequence of bytes. This byte array can then be transmitted over a network socket, saved to a file on a disk, or cached in an in-memory database like Redis. 

The reverse process, **deserialization**, reads the raw byte array and reconstructs the original in-memory data structure in the target application.

### Real-World Analogy
Imagine packing furniture to move to another city. You cannot transport a fully assembled wardrobe easily because of its shape and size. Serialization is like disassembling the wardrobe into flat wooden panels, sorting them, and packing them into boxes (the byte sequence) with assembly instructions. Deserialization is the recipient unboxing and rebuilding the wardrobe in their new room according to the instructions.

---

## JSON: JavaScript Object Notation

JSON is a text-based format designed to represent structured data using key-value pairs and arrays. Over the last two decades, JSON has become the dominant standard for public-facing APIs, web pages, and config configurations.

### Characteristics of JSON
* **Self-Describing**: JSON payloads carry both their structure and values. The keys (e.g. `"name"`, `"age"`) are repeated inside every single payload message.
* **Human-Readable**: Because JSON is standard ASCII/UTF-8 text, it is easy for developers to debug, print, and write manually.
* **Schema-Optional**: JSON does not enforce strict typing at the transport level. An API can append or change field types dynamically, though this can lead to runtime errors if validation is not handled in application code.
* **High CPU Overhead**: Parsing JSON requires scanning text strings character-by-character, evaluating tokens, allocating memory dynamically, and escaping characters. This makes serialization and deserialization CPU-bound and slow.

---

## XML: eXtensible Markup Language

XML is a tags-based hierarchical text format that predates JSON. It is widely used in legacy systems, enterprise application integrations, and communication protocols like SOAP.

### Characteristics of XML
* **Schema Enforcement**: XML supports strict data verification schemas, such as Document Type Definitions (DTDs) or XML Schema Definitions (XSDs), ensuring payloads strictly comply with specific standards.
* **Verbose Metadata Overhead**: Because XML requires opening and closing tags (e.g. `<age>30</age>`), the wire size contains substantial repetitive metadata.
* **Complex Parsing Libraries**: XML parsers are generally heavier than JSON parsers and require significant memory and CPU to parse Document Object Model (DOM) trees or navigate documents using XPath.

---

## Protocol Buffers (Protobuf)

Protocol Buffers, developed by Google, is a binary-based, **schema-first** serialization format. Instead of repeating keys inside the payload, Protobuf relies on a pre-defined schema file (`.proto`) compiling to language-specific parser code.

### The Protobuf Binary Wire Format
Unlike JSON and XML, which store keys as readable text, Protobuf omits text keys entirely. Instead, each field in a `.proto` schema is assigned a unique integer **field number** (tag):

```protobuf
message User {
  string name = 1;
  int32 age = 2;
}
```

When serialized, Protobuf writes only the field number, the wire type (describing how the data should be read), and the value payload. 

<svg viewBox="0 0 580 190" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="20" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Wire Format Comparison: JSON vs. Protocol Buffers</text>
  <text x="30" y="50" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold">JSON Payload: {"age":30} (10 Bytes - ASCII Text)</text>
  <g transform="translate(30, 60)">
    <rect x="0" y="0" width="30" height="30" rx="3" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
    <text x="15" y="20" fill="#d8dee9" font-family="monospace" font-size="12" text-anchor="middle">{</text>
    <rect x="33" y="0" width="30" height="30" rx="3" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
    <text x="48" y="20" fill="#d8dee9" font-family="monospace" font-size="12" text-anchor="middle">"</text>
    <rect x="66" y="0" width="30" height="30" rx="3" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
    <text x="81" y="20" fill="#eceff4" font-family="monospace" font-size="12" text-anchor="middle">a</text>
    <rect x="99" y="0" width="30" height="30" rx="3" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
    <text x="114" y="20" fill="#eceff4" font-family="monospace" font-size="12" text-anchor="middle">g</text>
    <rect x="132" y="0" width="30" height="30" rx="3" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
    <text x="147" y="20" fill="#eceff4" font-family="monospace" font-size="12" text-anchor="middle">e</text>
    <rect x="165" y="0" width="30" height="30" rx="3" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
    <text x="180" y="20" fill="#d8dee9" font-family="monospace" font-size="12" text-anchor="middle">"</text>
    <rect x="198" y="0" width="30" height="30" rx="3" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
    <text x="213" y="20" fill="#d8dee9" font-family="monospace" font-size="12" text-anchor="middle">:</text>
    <rect x="231" y="0" width="30" height="30" rx="3" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
    <text x="246" y="20" fill="#ebcb8b" font-family="monospace" font-size="12" text-anchor="middle">3</text>
    <rect x="264" y="0" width="30" height="30" rx="3" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
    <text x="279" y="20" fill="#ebcb8b" font-family="monospace" font-size="12" text-anchor="middle">0</text>
    <rect x="297" y="0" width="30" height="30" rx="3" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
    <text x="312" y="20" fill="#d8dee9" font-family="monospace" font-size="12" text-anchor="middle">}</text>
  </g>
  <text x="30" y="125" fill="#a3be8c" font-family="sans-serif" font-size="10" font-weight="bold">Protocol Buffers: field 2 = 30 (2 Bytes - Binary Encoding)</text>
  <g transform="translate(30, 135)">
    <rect x="0" y="0" width="180" height="30" rx="3" fill="#3b4252" stroke="#a3be8c" stroke-width="1.5"/>
    <text x="90" y="18" fill="#eceff4" font-family="monospace" font-size="10" text-anchor="middle">0x10 (Key: Tag 2, Type 0)</text>
    <rect x="190" y="0" width="180" height="30" rx="3" fill="#2e3440" stroke="#ebcb8b" stroke-width="1.5"/>
    <text x="280" y="18" fill="#eceff4" font-family="monospace" font-size="10" text-anchor="middle">0x1E (Varint Value: 30)</text>
    <text x="385" y="18" fill="#a3be8c" font-family="sans-serif" font-size="10" font-weight="bold">80% space savings!</text>
  </g>
</svg>

For example, to represent `{"age": 30}`, Protobuf outputs two bytes:
1. `0x10`: The key byte, calculated by bit-shifting the field number left by 3 and applying a bitwise OR with the wire type: `(2 << 3) | 0 = 16` (which is `0x10` in hex).
2. `0x1E`: The varint value of `30` (`0x1E` in hex).

This eliminates all field name text string overhead, drastically reducing payload sizes.

---

## Protobuf Varints (Variable-Width Integers)

To maximize space savings, Protobuf uses **Varints** (variable-width integers) to serialize numeric types. 

In standard memory representations, an `int32` always occupies 4 bytes, even if the value is a small number like `5`. Protobuf Varints represent integers using only the number of bytes necessary:

* Each byte contains 8 bits, but only the lower 7 bits are used to store the actual numeric value.
* The **Most Significant Bit** (MSB), the 8th bit, acts as a **continuation bit**.
* If the MSB is set to `1`, it indicates that another byte follows to complete the integer.
* If the MSB is set to `0`, it indicates that this byte is the final byte of the integer.

This variable-width scheme allows numbers between `0` and `127` to be serialized in a single byte, whereas larger numbers scale up to 5 bytes, saving substantial network bandwidth in systems dominated by low ID numbers or small counters.

---

## Backward and Forward Compatibility

Managing schema evolutions is critical for distributed systems where different versions of applications are deployed concurrently:

* **Forward Compatibility**: Older application binaries can parse incoming payloads generated by newer service binaries. In Protobuf, the parser achieves this by identifying unknown field numbers and skipping their values without throwing validation errors.
* **Backward Compatibility**: Newer application binaries can parse payloads generated by older service binaries. This requires new fields to be optional or set to sensible default values.
* **JSON/XML Compatibility**: Text formats handle schema changes easily because fields are resolved by name. If a client receives a JSON key it does not recognize, it simply ignores the property. However, renaming fields or changing data types (e.g. converting a string to a list) breaks compatibility across all formats, requiring coordination.

---

## Format Performance Comparison

When designing backend architectures, select formats based on the specific performance profile of your system:

| Metric | JSON | XML | Protocol Buffers |
|--------|------|-----|------------------|
| **Human Readability** | High | High | Low (Requires Schema decoding) |
| **Schema Strictness** | Optional | High (via XSD) | Required (via `.proto`) |
| **Payload Size** | Medium | Large | Small (Highly Compact) |
| **Parsing Latency** | High (Text scans) | Very High (Tree parsing) | Very Low (Direct binary seeks) |
| **Typical Use Case** | Web UI APIs, Configs | Legacy Enterprise | Microservices, gRPC, DBs |

For high-throughput internal microservice communication where CPU performance and network interface bandwidth are bottlenecks, choose Protocol Buffers. For public-facing endpoints where ease of client integration and manual debugging are primary, JSON remains the industry standard.

---

## Further Reading

- [Protocol Buffers Encoding Specification](https://protobuf.dev/programming-guides/encoding/) — Google's official guide to Varint encoding, wire types, and message packing structures.
- [RFC 8259: The JavaScript Object Notation (JSON) Data Interchange Format](https://datatracker.ietf.org/doc/html/rfc8259) — Standard specification outlining grammar, types, and text validation rules.
- [XML Schema Definition (XSD) reference](https://www.w3.org/XML/Schema) — W3C official reference guidelines on defining XML structural schemas.
