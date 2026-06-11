import type { Difficulty } from "./concepts";

export interface PathStep {
  order: number;
  conceptSlug: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
}

export interface LearningPath {
  slug: string;
  title: string;
  summary: string;
  difficulty: Difficulty;
  estimatedHours: number;
  steps: PathStep[];
}

export const paths: LearningPath[] = [
  {
    slug: "backend-fundamentals",
    title: "Backend Fundamentals",
    summary:
      "Learn the core OS and protocol building blocks behind modern backend systems. Start here if you're new to backend engineering.",
    difficulty: "beginner",
    estimatedHours: 1.2,
    steps: [
      {
        order: 1,
        conceptSlug: "bits",
        title: "Bits & Binary",
        summary: "Bitwise operators, memory storage hierarchy, and binary representation.",
        estimatedMinutes: 10,
      },
      {
        order: 2,
        conceptSlug: "processes-threads",
        title: "Processes & Threads",
        summary: "How operating systems coordinate program execution and context switches.",
        estimatedMinutes: 10,
      },
      {
        order: 3,
        conceptSlug: "virtual-memory",
        title: "Virtual Memory",
        summary: "How operating systems isolate memory pages and translate virtual addresses.",
        estimatedMinutes: 10,
      },
      {
        order: 4,
        conceptSlug: "file-descriptors",
        title: "File Descriptors",
        summary: "Everything is a file: stdin, stdout, sockets, and I/O multiplexing.",
        estimatedMinutes: 10,
      },
      {
        order: 5,
        conceptSlug: "http",
        title: "HTTP Protocol",
        summary: "Methods, headers, status codes, and the request/response lifecycle.",
        estimatedMinutes: 12,
      },
      {
        order: 6,
        conceptSlug: "idempotency",
        title: "Idempotency",
        summary: "Making repeated client operations safe from duplication bugs.",
        estimatedMinutes: 15,
      },
    ],
  },
  {
    slug: "reliability-patterns",
    title: "Reliability Patterns",
    summary:
      "Build fault-tolerant systems that remain online when components fail. Retries, circuit breakers, queues, and orchestration.",
    difficulty: "intermediate",
    estimatedHours: 1.5,
    steps: [
      {
        order: 1,
        conceptSlug: "http",
        title: "HTTP Protocol",
        summary: "Understanding the stateless transport protocol.",
        estimatedMinutes: 12,
      },
      {
        order: 2,
        conceptSlug: "idempotency",
        title: "Idempotency Keys",
        summary: "Ensuring duplicate retries do not process twice.",
        estimatedMinutes: 15,
      },
      {
        order: 3,
        conceptSlug: "circuit-breakers",
        title: "Circuit Breakers",
        summary: "Preventing cascading timeouts using state-based fast fails.",
        estimatedMinutes: 14,
      },
      {
        order: 4,
        conceptSlug: "message-queues",
        title: "Message Queues",
        summary: "Decoupling producers and consumers with event-driven brokers.",
        estimatedMinutes: 12,
      },
      {
        order: 5,
        conceptSlug: "vector-clocks",
        title: "Vector Clocks",
        summary: "Detecting write conflicts and casual order in distributed systems.",
        estimatedMinutes: 12,
      },
      {
        order: 6,
        conceptSlug: "kubernetes",
        title: "Kubernetes Orchestration",
        summary: "Running highly available self-healing grids in production.",
        estimatedMinutes: 15,
      },
    ],
  },
  {
    slug: "database-deep-dive",
    title: "Database Deep Dive",
    summary:
      "Go deep under the hood of database systems. Explore indexes, write paths, compaction, and replication streams.",
    difficulty: "intermediate",
    estimatedHours: 1.2,
    steps: [
      {
        order: 1,
        conceptSlug: "hash-functions",
        title: "Hash Functions",
        summary: "The uniform mapping foundation behind fast key lookups.",
        estimatedMinutes: 10,
      },
      {
        order: 2,
        conceptSlug: "bloom-filters",
        title: "Bloom Filters",
        summary: "Shielding disks with space-efficient probabilistic arrays.",
        estimatedMinutes: 10,
      },
      {
        order: 3,
        conceptSlug: "indexes",
        title: "Database Indexes",
        summary: "B-Tree structures, seek latency, and read optimizations.",
        estimatedMinutes: 12,
      },
      {
        order: 4,
        conceptSlug: "lsm-trees",
        title: "LSM-Trees",
        summary: "Write-optimized memtables, SSTables, and log merges.",
        estimatedMinutes: 12,
      },
      {
        order: 5,
        conceptSlug: "caching-strategies",
        title: "Caching Strategies",
        summary: "Caching topologies (lazy, write-through) and TTL eviction.",
        estimatedMinutes: 16,
      },
      {
        order: 6,
        conceptSlug: "change-data-capture",
        title: "Change Data Capture",
        summary: "Replicating transactional mutations to external message streams.",
        estimatedMinutes: 12,
      },
    ],
  },
  {
    slug: "systems-design-primer",
    title: "Systems Design Primer",
    summary:
      "A fast track for senior engineers aiming to design modular, resilient backend services.",
    difficulty: "intermediate",
    estimatedHours: 1.3,
    steps: [
      {
        order: 1,
        conceptSlug: "http",
        title: "HTTP Fundamentals",
        summary: "Understanding client-server protocol and headers.",
        estimatedMinutes: 12,
      },
      {
        order: 2,
        conceptSlug: "grpc",
        title: "gRPC & Protobuf",
        summary: "Multiplexed microservice RPC channels and binary serialization.",
        estimatedMinutes: 11,
      },
      {
        order: 3,
        conceptSlug: "idempotency",
        title: "Idempotency design",
        summary: "How idempotency keys make distributed retries safe.",
        estimatedMinutes: 15,
      },
      {
        order: 4,
        conceptSlug: "caching-strategies",
        title: "Caching Topologies",
        summary: "Cache-aside vs write-through and stampede prevention.",
        estimatedMinutes: 16,
      },
      {
        order: 5,
        conceptSlug: "message-queues",
        title: "Message Queues",
        summary: "Decoupling writes with event-driven messaging brokers.",
        estimatedMinutes: 12,
      },
      {
        order: 6,
        conceptSlug: "circuit-breakers",
        title: "Resilience Gates",
        summary: "Tripping calls to prevent thread exhaustion cascades.",
        estimatedMinutes: 14,
      },
    ],
  },
  {
    slug: "container-and-deploy",
    title: "Containerization & Deployment",
    summary:
      "Learn how to containerize applications and manage cloud resource orchestration at scale.",
    difficulty: "beginner",
    estimatedHours: 1.0,
    steps: [
      {
        order: 1,
        conceptSlug: "processes-threads",
        title: "Processes & Threads",
        summary: "The execution units isolation primitives build on.",
        estimatedMinutes: 10,
      },
      {
        order: 2,
        conceptSlug: "virtual-memory",
        title: "Virtual Memory",
        summary: "Process address space and resource constraints.",
        estimatedMinutes: 10,
      },
      {
        order: 3,
        conceptSlug: "containerization",
        title: "Containerization",
        summary: "Operating system namespaces, control groups (cgroups), and chroot.",
        estimatedMinutes: 12,
      },
      {
        order: 4,
        conceptSlug: "docker",
        title: "Docker Tools",
        summary: "Defining container images and composing local dev topologies.",
        estimatedMinutes: 12,
      },
      {
        order: 5,
        conceptSlug: "kubernetes",
        title: "Kubernetes Grids",
        summary: "Orchestrating self-healing service pods, deployment replicas, and configurations.",
        estimatedMinutes: 15,
      },
    ],
  },
  {
    slug: "database-engineering",
    title: "Database Engineering",
    summary:
      "Advanced database system designs: data storage strategies, indexing, caching, and stream replication.",
    difficulty: "advanced",
    estimatedHours: 1.2,
    steps: [
      {
        order: 1,
        conceptSlug: "hash-functions",
        title: "Hash Indexes",
        summary: "Designing hash tables and uniform lookup key systems.",
        estimatedMinutes: 10,
      },
      {
        order: 2,
        conceptSlug: "bloom-filters",
        title: "SSTable Bloom Filters",
        summary: "Skipping empty search blocks before hitting disk files.",
        estimatedMinutes: 10,
      },
      {
        order: 3,
        conceptSlug: "indexes",
        title: "B-Tree Indexes",
        summary: "In-place modifications, query search logs, and disk seeks.",
        estimatedMinutes: 12,
      },
      {
        order: 4,
        conceptSlug: "lsm-trees",
        title: "LSM Write-Pipes",
        summary: "Batching memory writes, sequential flushes, and background merges.",
        estimatedMinutes: 12,
      },
      {
        order: 5,
        conceptSlug: "caching-strategies",
        title: "Active Cache Invalidation",
        summary: "Cache eviction policies and write-behind buffering.",
        estimatedMinutes: 16,
      },
      {
        order: 6,
        conceptSlug: "change-data-capture",
        title: "CDC Replications",
        summary: "Streaming transactional commits to external replica logs.",
        estimatedMinutes: 12,
      },
    ],
  },
];

export function getPathBySlug(slug: string): LearningPath | undefined {
  return paths.find((p) => p.slug === slug);
}
