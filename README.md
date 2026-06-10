# Graphy

**A structured backend engineering learning platform organized as an interactive knowledge graph.**

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Author](https://img.shields.io/badge/Author-Amole_Oluwatomiwa-C0392B?style=for-the-badge)](https://github.com/amole-oluwatomiwa)

Graphy teaches backend engineering concepts through a connected knowledge graph rather than a traditional linear course. It helps developers understand what each concept means, why it exists under the hood, what depends on it, and how to implement it across multiple languages (Go, TypeScript, Python).

Think of it as an interactive transit system of backend engineering: select your starting point, pick a destination, and let the Graph Engine build a custom subway journey for you.

---

## Author

**Amole Oluwatomiwa**
* Website/GitHub: [@amole-oluwatomiwa](https://github.com/amole-oluwatomiwa)

---

## Core Features

* **Journey Mode (Dynamic Solver)**: Select any starting point (e.g. *Bits*) and destination (e.g. *Caching Strategies*) to dynamically compile an optimal, step-by-step learning timeline complete with connection links.
* **Knowledge Graph View**: SVG canvas mapping prerequisite connections. Nodes dynamically light up as you complete concepts and show interactive prerequisite flows on hover.
* **Curated Learning Paths**: Expert-made pathways (e.g., *Backend Fundamentals*, *Reliability Patterns*) to guide you through major backend tracks.
* **Advisory Warning Banners**: A non-blocking dependency checker that alerts you when attempting to study topics before covering their recommended prerequisites.
* **Multi-Language Examples**: Inline code examples in Go, TypeScript, and Python.

---

## Tech Stack

* **Core Framework**: Next.js 16 (App Router, Turbopack)
* **Styling**: Tailwind CSS v4 (Vanilla CSS Custom Tokens)
* **Language**: TypeScript
* **State & Tracking**: Unified Client-Side Storage (`localStorage`)
* **Icons**: Lucide React

---

## Getting Started

Follow these steps to run Graphy locally on your computer:

```bash
# 1. Clone the repository
git clone https://github.com/amole-oluwatomiwa/graphy.git
cd graphy

# 2. Install dependencies
npm install

# 3. Start the local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## Contributing

Graphy is open source and we welcome contributions of all kinds! Whether you want to add new backend concepts, fix bugs, or suggest new learning paths:

Please read our [Contributing Guidelines](./contribution.md) for details on branching conventions, semantic commits, and local build verification before opening a pull request.

---

## License

This project is licensed under the [MIT License](./LICENSE).
