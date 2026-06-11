# Graphly

**A structured backend engineering learning platform organized as an interactive knowledge graph.**

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/Status-Completed%20%26%20Deployed-00b894?style=for-the-badge)](#)

**Live Production Site:** [graphly.ellomas.com](https://graphly.ellomas.com)

---

Graphly is a completed backend engineering learning platform focused on **backend engineering theory straight out of computer science textbooks**. Instead of teaching temporary syntax, framework-specific APIs, or library helpers, Graphly models the core, invariant principles that power software systems. It forces you to think like a computer scientist—understanding how patterns relate, why trade-offs exist, and how system constraints dictate architecture.

Think of it as an interactive subway system of backend engineering: select your starting point, choose your destination, and let the Graph Engine build a custom learning track based on prerequisite dependencies.

---

## Why Theory-First?

In the frontend world, changes are visual and fast. In backend engineering, everything is invisible, abstract, and governed by deep computer science theory. Developers often get stuck copying-and-pasting configuration or framework routes without understanding:

- **Why** idempotency keys are mathematically required when networks fail.
- **How** database indexes balance write amplification against search speed.
- **Why** a Bloom filter works as an O(1) cache shield to prevent database penetration.

Graphly focuses entirely on **conceptual theory**—the systems concepts that stay constant for decades regardless of whether you are writing in Go, Python, Rust, or TypeScript. It helps you build a strong mental model of how data structures, distributed systems patterns, and networking layers interact.

---

## Core Features

- **Journey Mode (Dynamic Solver)**: Select any starting point (e.g. _Bits_) and destination (e.g. _Caching Strategies_) to dynamically compile an optimal, step-by-step learning timeline complete with connection links.
- **Interactive Knowledge Graph View**: A rich, dynamic SVG canvas mapping prerequisite connections. Nodes dynamically light up as you complete concepts and show interactive prerequisite flows on hover.
- **Curated Learning Paths**: Expert-made pathways (e.g., _Systems Design Primer_, _Database Engineering_) to guide you through major backend tracks.
- **Advisory Warning Banners**: A non-blocking dependency checker that alerts you when attempting to study topics before covering their recommended prerequisites.
- **Multi-Language Examples**: Inline code examples in Go, TypeScript, and Python.

---

## Tech Stack

- **Core Framework**: Next.js 16 (App Router, Turbopack, Edge Runtime compatible)
- **Styling**: Tailwind CSS v4 (Vanilla CSS Custom Tokens)
- **Language**: TypeScript
- **State & Tracking**: Unified Client-Side Storage (`localStorage`)
- **Icons**: Lucide React

---

## Running Locally

To run the completed Graphly project locally on your machine:

```bash
# 1. Clone the repository
git clone https://github.com/tomiwa-a/graphly.git
cd graphly

# 2. Install dependencies
npm install

# 3. Start the local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## Author

**Amole Oluwatomiwa**

- Website/GitHub: [@tomiwa-a](https://github.com/tomiwa-a)

---

## License

This project is licensed under the [MIT License](./LICENSE).
