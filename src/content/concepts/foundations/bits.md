---
title: Bits & Binary
slug: bits
summary: "Understand how computers store and manipulate information using binary digits, bitwise operators, and bitmasks."
difficulty: beginner
chapterId: foundations
domain: Foundations
estimatedMinutes: 10
prerequisites: []
related: [hash-functions, virtual-memory]
seo_title: "Bits & Binary Explained: Bitwise Operators, Bitmasks & Binary Numbers"
seo_description: "Learn what a bit is, how binary numbers work, how to use bitwise operators like AND, OR, XOR, and how bitmasks enable efficient permission checks in software."
canonical_url: "/concepts/bits"
code_examples:
  - language: bash
    title: "Bitwise permission check in Bash"
    code: |
      # Permission flags (bitmask)
      READ=1    # 001
      WRITE=2   # 010
      EXEC=4    # 100

      user_perms=5  # 101 — READ + EXEC granted

      # Check if WRITE permission is set
      if (( (user_perms & WRITE) != 0 )); then
        echo "Write permission granted"
      else
        echo "Write permission denied"   # prints this
      fi

      # Grant WRITE permission
      user_perms=$((user_perms | WRITE))  # 101 | 010 = 111

      # Revoke EXEC permission
      user_perms=$((user_perms & ~EXEC))  # 111 & ~100 = 011
---

## What is a bit?

A **bit** (short for *binary digit*) is the smallest unit of information a computer can store. It has exactly two possible values: `0` or `1`. Every file, every number, every pixel on your screen is ultimately a sequence of bits.

Bits are grouped together to represent larger values and more complex data:

| Unit | Size | Approximate real-world size |
|------|------|-----------------------------|
| 1 bit | 1 bit | A single on/off switch |
| 1 byte | 8 bits | One ASCII character (e.g. `A`) |
| 1 kilobyte (KB) | 1,024 bytes | A short text message |
| 1 megabyte (MB) | 1,024 KB | A compressed photo |
| 1 gigabyte (GB) | 1,024 MB | About 200 MP3 songs |
| 1 terabyte (TB) | 1,024 GB | About 500 hours of HD video |

> [!NOTE]
> Storage manufacturers often use powers of 10 (1 KB = 1,000 bytes) while operating systems use powers of 2 (1 KB = 1,024 bytes). This is why a "500 GB" hard drive shows as ~465 GB in your OS.

## Why do computers use binary?

Computers are built from billions of **transistors**, tiny electronic switches that are either conducting electricity or not. This physical reality maps perfectly to binary: a high voltage represents `1`, a low voltage represents `0`. Designing circuits that distinguish between just two states is dramatically simpler and more reliable than distinguishing between ten.

This is why all digital information, no matter how complex, is encoded as sequences of `0`s and `1`s at the hardware level.

## The binary number system

In everyday life we use **base-10** (decimal): each digit position represents a power of 10. Binary works the same way but in **base-2**: each position represents a power of 2.

Reading a binary number is straightforward: assign place values from right to left starting at 2<sup>0</sup> = 1, then add up the positions where a `1` appears.

**Worked example: `00101010` in binary**

| Bit position | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
|---|---|---|---|---|---|---|---|---|
| Place value | 128 | 64 | 32 | 16 | 8 | 4 | 2 | 1 |
| Bit value | 0 | 0 | 1 | 0 | 1 | 0 | 1 | 0 |

Positions with a `1`: 32 + 8 + 2 = **42**

So `00101010` in binary equals 42 in decimal. The diagram below shows this visually.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 210" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="30" fill="#88c0d0" font-family="sans-serif" font-size="15" font-weight="bold" text-anchor="middle">42 in Binary — 8-bit Representation</text>
  <text x="290" y="54" fill="#81a1c1" font-family="sans-serif" font-size="12" text-anchor="middle">Place values (powers of 2)</text>
  <rect x="30" y="65" width="60" height="40" rx="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <rect x="100" y="65" width="60" height="40" rx="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <rect x="170" y="65" width="60" height="40" rx="6" fill="#2e3440" stroke="#88c0d0" stroke-width="2"/>
  <rect x="240" y="65" width="60" height="40" rx="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <rect x="310" y="65" width="60" height="40" rx="6" fill="#2e3440" stroke="#88c0d0" stroke-width="2"/>
  <rect x="380" y="65" width="60" height="40" rx="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <rect x="450" y="65" width="60" height="40" rx="6" fill="#2e3440" stroke="#88c0d0" stroke-width="2"/>
  <rect x="520" y="65" width="40" height="40" rx="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="60" y="91" fill="#4c566a" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">0</text>
  <text x="130" y="91" fill="#4c566a" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">0</text>
  <text x="200" y="91" fill="#a3be8c" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">1</text>
  <text x="270" y="91" fill="#4c566a" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">0</text>
  <text x="340" y="91" fill="#a3be8c" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">1</text>
  <text x="410" y="91" fill="#4c566a" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">0</text>
  <text x="480" y="91" fill="#a3be8c" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">1</text>
  <text x="540" y="91" fill="#4c566a" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">0</text>
  <text x="60" y="125" fill="#81a1c1" font-family="sans-serif" font-size="11" text-anchor="middle">128</text>
  <text x="130" y="125" fill="#81a1c1" font-family="sans-serif" font-size="11" text-anchor="middle">64</text>
  <text x="200" y="125" fill="#88c0d0" font-family="sans-serif" font-size="11" text-anchor="middle">32</text>
  <text x="270" y="125" fill="#81a1c1" font-family="sans-serif" font-size="11" text-anchor="middle">16</text>
  <text x="340" y="125" fill="#88c0d0" font-family="sans-serif" font-size="11" text-anchor="middle">8</text>
  <text x="410" y="125" fill="#81a1c1" font-family="sans-serif" font-size="11" text-anchor="middle">4</text>
  <text x="480" y="125" fill="#88c0d0" font-family="sans-serif" font-size="11" text-anchor="middle">2</text>
  <text x="540" y="125" fill="#81a1c1" font-family="sans-serif" font-size="11" text-anchor="middle">1</text>
  <line x1="200" y1="135" x2="200" y2="155" stroke="#a3be8c" stroke-width="1.5" stroke-dasharray="4,3"/>
  <line x1="340" y1="135" x2="340" y2="155" stroke="#a3be8c" stroke-width="1.5" stroke-dasharray="4,3"/>
  <line x1="480" y1="135" x2="480" y2="155" stroke="#a3be8c" stroke-width="1.5" stroke-dasharray="4,3"/>
  <text x="290" y="175" fill="#a3be8c" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">32 + 8 + 2 = 42</text>
  <text x="290" y="197" fill="#81a1c1" font-family="sans-serif" font-size="11" text-anchor="middle">Green = bit is ON (1) · Grey = bit is OFF (0)</text>
</svg>

## Bitwise operators

**Bitwise operators** work directly on the individual bits of integer values. They are extremely fast — a single CPU instruction — and appear in everything from graphics engines to network protocols.

### AND (`&`)

Sets a result bit to `1` only if *both* input bits are `1`.

```
  0101   (5)
& 0011   (3)
------
  0001   (1)
```

**Practical use: permission checks.** If `READ = 0001` and a user's permission byte is `0101`, then `perms & READ != 0` tells you the READ bit is set without touching other bits.

### OR (`|`)

Sets a result bit to `1` if *either* input bit is `1`.

```
  0101   (5)
| 0010   (2)
------
  0111   (7)
```

**Practical use: granting permissions.** `perms | WRITE` turns on the WRITE bit while leaving all other bits unchanged.

### XOR (`^`)

Sets a result bit to `1` if the input bits are *different*.

```
  0101   (5)
^ 0011   (3)
------
  0110   (6)
```

**Practical use: toggling flags.** `flags ^ FLAG` flips a bit: if it was `1` it becomes `0`, and vice versa. XOR is also used in simple checksums and encryption — XORing a value with itself always produces `0`.

### NOT (`~`)

Flips every bit.

```
~ 0101   (5)
------
  1010   (-6 in two's complement)
```

**Practical use: clearing bits.** `perms & ~EXEC` clears the EXEC bit: `~EXEC` produces a mask with every bit set except EXEC, so ANDing with it zeroes out that one bit.

### Left shift (`<<`) and right shift (`>>`)

Shifts all bits left or right by a given number of positions. Zeros are shifted in.

```
0001 << 2  →  0100   (1 becomes 4)
1000 >> 1  →  0100   (8 becomes 4)
```

**Practical use: fast multiplication and division.** Left-shifting by `n` is equivalent to multiplying by 2<sup>n</sup>. Right-shifting by `n` is equivalent to dividing by 2<sup>n</sup>. Compilers often emit shift instructions instead of multiply/divide because they execute in a single cycle.

## Bitmasks

A **bitmask** is an integer value used together with a bitwise operator to isolate, set, or clear specific bits in another integer. Think of it like a stencil: the mask covers the bits you want to leave alone, and exposes only the bits you want to work with.

### Checking a bit

```
perms  = 0b00000101   # READ and EXEC set
READ   = 0b00000001

is_readable = (perms & READ) != 0   # True
```

### Setting a bit

```
perms |= WRITE    # turns on bit 1 regardless of its current value
```

### Clearing a bit

```
perms &= ~EXEC    # turns off bit 2 regardless of its current value
```

This three-operation pattern (check, set, clear) appears in Linux file permissions (`chmod`), TCP flag bytes (SYN, ACK, FIN), network subnet masks, and hardware device registers.

## Bitwise permission check in practice

The code example below demonstrates all three operations in a Bash script using Unix-style permission flags:

```bash
# Permission flags (bitmask)
READ=1    # 001
WRITE=2   # 010
EXEC=4    # 100

user_perms=5  # 101 — READ + EXEC granted

# Check if WRITE permission is set
if (( (user_perms & WRITE) != 0 )); then
  echo "Write permission granted"
else
  echo "Write permission denied"   # prints this
fi

# Grant WRITE permission
user_perms=$((user_perms | WRITE))  # 101 | 010 = 111

# Revoke EXEC permission
user_perms=$((user_perms & ~EXEC))  # 111 & ~100 = 011
```

The same pattern appears in PostgreSQL row-level security, JWT scope bytes, and virtually every embedded systems driver you will encounter.

## Further Reading

* [Bitwise Operators in Practice — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_AND)
* [Bit Twiddling Hacks — Stanford CS](https://graphics.stanford.edu/~seander/bithacks.html)
* [Number Systems: Binary, Octal and Hexadecimal — Khan Academy](https://www.khanacademy.org/computing/computers-and-internet/xcae6f4a7ff015e7d:digital-information/xcae6f4a7ff015e7d:binary-numbers/a/bits-and-binary)
* [How Computers Work: Binary & Data — Crash Course Computer Science](https://www.youtube.com/watch?v=USCBCmwMCDA)
