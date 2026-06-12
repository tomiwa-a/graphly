---
title: IP Addressing & CIDR Subnetting Basics
slug: ip-addressing-cidr
summary: "Understand IPv4 and IPv6 structures, learn CIDR subnet masking notation, and calculate IP network and host boundaries using bitwise arithmetic."
difficulty: intermediate
chapterId: infrastructure
domain: Infrastructure
estimatedMinutes: 12
prerequisites: [network-sockets-tcp-udp, bits]
related: [dns]
seo_title: "IP Addressing & CIDR Subnetting Basics: Network Arithmetic"
seo_description: "Deep dive into IP addressing and CIDR subnet masking. Learn to parse prefixes, run bitwise AND/OR subnet equations, and isolate VPC networks."
canonical_url: "/concepts/ip-addressing-cidr"
citations:
  - title: "Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan"
    author: "V. Fuller, T. Li"
    chapter: "Section 3: CIDR Address Allocation and Subnet Matching"
    external_link: "https://datatracker.ietf.org/doc/html/rfc4632"
code_examples:
  - language: go
    title: "CIDR Subnet Calculator: Bitwise IP Masking and IP Range Parsers"
    code: |
      package main

      import (
      	"fmt"
      	"net"
      )

      // SubnetDetails stores the computed properties of a CIDR block
      type SubnetDetails struct {
      	IP               net.IP
      	SubnetMask       net.IPMask
      	NetworkAddress   net.IP
      	BroadcastAddress net.IP
      	TotalHosts       uint32
      	UsableHosts      uint32
      	FirstUsableIP    net.IP
      	LastUsableIP     net.IP
      }

      // calculateSubnet performs bitwise operations on IP representations
      func calculateSubnet(cidrStr string) (*SubnetDetails, error) {
      	// Parse CIDR string (e.g. "192.168.1.85/26")
      	ip, ipNet, err := net.ParseCIDR(cidrStr)
      	if err != nil {
      		return nil, err
      	}

      	// Convert IP to 4-byte representation
      	ip4 := ip.To4()
      	if ip4 == nil {
      		return nil, fmt.Errorf("calculator supports IPv4 only")
      	}

      	mask := ipNet.Mask
      	network := ip4.Mask(mask) // Bitwise AND operation: isolates Network ID

      	// Compute Broadcast Address: Network Address OR NOT Subnet Mask
      	broadcast := make(net.IP, 4)
      	for i := 0; i < 4; i++ {
      		broadcast[i] = network[i] | ^mask[i]
      	}

      	// Calculate host capacities (2^(32 - prefixLength))
      	ones, bits := mask.Size()
      	hostBits := uint32(bits - ones)
      	totalHosts := uint32(1) << hostBits
      	var usableHosts uint32 = 0
      	if totalHosts > 2 {
      		usableHosts = totalHosts - 2 // Exclude network and broadcast addresses
      	}

      	// First usable IP: Network Address + 1
      	firstUsable := make(net.IP, 4)
      	copy(firstUsable, network)
      	firstUsable[3]++

      	// Last usable IP: Broadcast Address - 1
      	lastUsable := make(net.IP, 4)
      	copy(lastUsable, broadcast)
      	lastUsable[3]--

      	return &SubnetDetails{
      		IP:               ip4,
      		SubnetMask:       mask,
      		NetworkAddress:   network,
      		BroadcastAddress: broadcast,
      		TotalHosts:       totalHosts,
      		UsableHosts:      usableHosts,
      		FirstUsableIP:    firstUsable,
      		LastUsableIP:     lastUsable,
      	}, nil
      }

      func main() {
      	cidr := "192.168.1.85/26"
      	details, err := calculateSubnet(cidr)
      	if err != nil {
      		fmt.Printf("Error: %v\n", err)
      		return
      	}

      	fmt.Printf("CIDR Target: %s\n", cidr)
      	fmt.Printf("Parsed IP Address: %v\n", details.IP)
      	fmt.Printf("Subnet Mask (Hex): %v\n", details.SubnetMask)
      	fmt.Printf("Network Address:   %v\n", details.NetworkAddress)
      	fmt.Printf("Broadcast Address: %v\n", details.BroadcastAddress)
      	fmt.Printf("Total IP Addresses: %d\n", details.TotalHosts)
      	fmt.Printf("Usable Host Count:  %d\n", details.UsableHosts)
      	fmt.Printf("Usable Host Range:  %v - %v\n", details.FirstUsableIP, details.LastUsableIP)
      }
---

## The Concept

For computer nodes to transmit data across a global network, every device must be assigned a unique numeric address. In the early days of the internet, these addresses were distributed in coarse blocks, leading to massive waste. Classless Inter-Domain Routing (`CIDR`) was introduced to solve this allocation problem.

**IP Addressing & CIDR Subnetting** are the foundational protocols used to divide networks into smaller, isolated, and manageable blocks. By parsing address strings into binary segments, network interfaces separate the destination network path from the individual host endpoint, determining whether packet data can be routed locally or must be forwarded through public gateways.

<svg viewBox="0 0 580 280" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;"><text x="290" y="20" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Bitwise Subnet Calculation (192.168.1.85/26)</text><rect x="20" y="45" width="540" height="210" rx="6" fill="#2e3440" stroke="#4c566a" stroke-width="1"/><text x="40" y="75" fill="#eceff4" font-family="sans-serif" font-size="9" font-weight="bold">IP Address (192.168.1.85):</text><text x="200" y="75" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold">11000000 . 10101000 . 00000001 . 01010101</text><text x="40" y="105" fill="#ebcb8b" font-family="sans-serif" font-size="9" font-weight="bold">Subnet Mask (/26):</text><text x="200" y="105" fill="#ebcb8b" font-family="sans-serif" font-size="10" font-weight="bold">11111111 . 11111111 . 11111111 . 11000000</text><line x1="200" y1="115" x2="520" y2="115" stroke="#eceff4" stroke-width="1.5"/><text x="140" y="130" fill="#a3be8c" font-family="sans-serif" font-size="8" font-weight="bold">Bitwise AND</text><text x="40" y="150" fill="#a3be8c" font-family="sans-serif" font-size="9" font-weight="bold">Network ID (192.168.1.64):</text><text x="200" y="150" fill="#a3be8c" font-family="sans-serif" font-size="10" font-weight="bold">11000000 . 10101000 . 00000001 . 01000000</text><text x="40" y="185" fill="#bf616a" font-family="sans-serif" font-size="9" font-weight="bold">Broadcast ID (192.168.1.127):</text><text x="200" y="185" fill="#bf616a" font-family="sans-serif" font-size="10" font-weight="bold">11000000 . 10101000 . 00000001 . 01111111</text><rect x="200" y="200" width="230" height="20" rx="3" fill="#3b4252" stroke="#88c0d0" stroke-width="0.75"/><text x="315" y="213" fill="#88c0d0" font-family="sans-serif" font-size="8" text-anchor="middle" font-weight="bold">Network Prefix: First 26 bits</text><rect x="440" y="200" width="80" height="20" rx="3" fill="#3b4252" stroke="#ebcb8b" stroke-width="0.75"/><text x="480" y="213" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle" font-weight="bold">Host ID: Last 6 bits</text><text x="40" y="240" fill="#88c0d0" font-family="sans-serif" font-size="8" font-weight="bold">Host range: 192.168.1.65 to 192.168.1.126 (62 usable addresses)</text></svg>

---

## Practical Analogy

IP Addressing and Subnetting are like **telephone routing systems**:

* An **IP Address** is like a full phone number: `+1-555-867-5309`.
* The **Subnet Mask** is the rule that tells the exchange how to read the number. It separates the area code from the local line.
* **Classful Routing** is like a system that says: "All numbers starting with 555 belong to a single huge office building containing 10,000 desks." If that office building only has 5 employees, the remaining 9,995 phone numbers are locked up and wasted.
* **CIDR Notation** (such as `/24`) is like saying: "The first 7 digits (`555-867`) are the area exchange (Network ID), and only the last 2 digits (`5309`) are the internal extension (Host ID)." This creates a smaller group of 100 possible extensions, preventing number exhaustion and allowing other departments to use adjacent blocks.

---

## IPv4 vs IPv6 Structure

Two versions of the Internet Protocol coexist today:

### IPv4 (Internet Protocol Version 4)
* **Size**: 32-bit binary integer.
* **Format**: Expressed in dotted-decimal format, divided into four 8-bit octets (e.g. `192.168.1.1`).
* **Address Space**: 2<sup>32</sup> (roughly 4.3 billion addresses). Because of this small limit, IPv4 addresses are exhausted.

### IPv6 (Internet Protocol Version 6)
* **Size**: 128-bit binary integer.
* **Format**: Expressed in hexadecimal digits divided into eight 16-bit blocks separated by colons (e.g. `2001:db8:85a3::8a2e:370:7334`).
* **Address Space**: 2<sup>128</sup> (an virtually infinite number of addresses), removing the need for address sharing hacks.

---

## Subnet Masking and CIDR Notation

An IP address alone does not define the size of the network it belongs to. To determine boundaries, network cards use a secondary 32-bit mask: the **Subnet Mask**. The mask consists of contiguous binary `1`s followed by contiguous `0`s. The `1`s represent the **Network ID**, and the `0`s represent the **Host ID**.

* **Standard Mask**: `255.255.255.0` in binary is `11111111.11111111.11111111.00000000`.
* **CIDR Notation**: To simplify, CIDR represents the number of contiguous `1` bits as a trailing slash count. For example, `255.255.255.0` is written as `/24`.
* **Variable Subnetting**: A `/26` prefix indicates that the first 26 bits are dedicated to the network, leaving 6 bits (32 - 26 = 6) for host assignments within that local network.

---

## Bitwise Subnet Calculations

When a server sends a packet to IP `192.168.1.85` on a `/26` subnet, it runs bitwise operations to find the boundaries:

### 1. Network Address Calculation (Bitwise AND)
The interface runs a bitwise `AND` between the IP address and the Subnet Mask.
```
  192.168.1.85: 11000000.10101000.00000001.01010101
  Mask (/26)  : 11111111.11111111.11111111.11000000
  -------------------------------------------------
  Network ID  : 11000000.10101000.00000001.01000000 -> 192.168.1.64
```
This is the identifier of the network itself.

### 2. Broadcast Address Calculation (Bitwise OR NOT)
The broadcast address (used to send packets to all hosts in the subnet) is found by setting all host bits (the last 6 bits) to `1`.
```
  Network ID  : 11000000.10101000.00000001.01000000
  Host Bit Fill: 00000000.00000000.00000000.00111111
  -------------------------------------------------
  Broadcast ID: 11000000.10101000.00000001.01111111 -> 192.168.1.127
```

### 3. Usable Host Range
The first and last addresses of any block are reserved: the Network Address (`.64`) and the Broadcast Address (`.127`). Thus, the usable host addresses in this subnet range from `192.168.1.65` to `192.168.1.126`, leaving 62 usable addresses (2<sup>6</sup> - 2 = 62).

---

## Subnet Partitioning and VPC Isolation

Cloud engineers use CIDR to divide a Virtual Private Cloud (`VPC`) block into isolated subnets.

For example, if a company is allocated `10.0.0.0/16` (65,536 addresses), they can partition it into smaller `/24` subnets (256 addresses each):
* `10.0.1.0/24`: Dev public web subnet.
* `10.0.2.0/24`: Production public web subnet.
* `10.0.100.0/24`: Private database subnet (isolated from direct internet routing).

---

## Private Address Spaces (RFC 1918)

To prevent global IPv4 address exhaustion, certain IP ranges are designated as private spaces under **RFC 1918**:
* `10.0.0.0/8`
* `172.16.0.0/12`
* `192.168.0.0/16`

Routers on the public internet are programmed to discard packets heading to these private networks. For internal servers to reach the public internet, they must route traffic through a Network Address Translation (`NAT`) gateway. The NAT gateway replaces the private source IP in the packet header with its own public IP, forwards the request, and returns responses back to the internal host.

---

## Further Reading

* [RFC 4632: Classless Inter-domain Routing (CIDR)](https://datatracker.ietf.org/doc/html/rfc4632) — The official Internet standards specification defining CIDR architecture.
* [RFC 1918: Address Allocation for Private Internets](https://datatracker.ietf.org/doc/html/rfc1918) — The standard defining private IP networks and routing boundaries.
* [TCP/IP Illustrated, Volume 1](https://www.pearson.com/) — W. Richard Stevens' textbook on internet protocols, addressing, and routing behaviors.
