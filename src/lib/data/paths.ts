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
      "Learn the core concepts behind modern backend systems. Start here if you're new to backend engineering.",
    difficulty: "beginner",
    estimatedHours: 3,
    steps: [
      {
        order: 1,
        conceptSlug: "http",
        title: "HTTP",
        summary: "The foundation of web communication.",
        estimatedMinutes: 10,
      },
      {
        order: 2,
        conceptSlug: "idempotency",
        title: "Idempotency",
        summary: "Making repeated operations safe.",
        estimatedMinutes: 15,
      },
      {
        order: 3,
        conceptSlug: "indexes",
        title: "Database Indexes",
        summary: "Speeding up queries with indexes.",
        estimatedMinutes: 12,
      },
      {
        order: 4,
        conceptSlug: "caching-strategies",
        title: "Caching Strategies",
        summary: "Reducing load on your database.",
        estimatedMinutes: 16,
      },
    ],
  },
  {
    slug: "reliability-patterns",
    title: "Reliability Patterns",
    summary:
      "Build systems that stay up when things go wrong. Retries, circuit breakers, queues, and more.",
    difficulty: "intermediate",
    estimatedHours: 4,
    steps: [
      {
        order: 1,
        conceptSlug: "http",
        title: "HTTP",
        summary: "Understanding the protocol layer.",
        estimatedMinutes: 10,
      },
      {
        order: 2,
        conceptSlug: "idempotency",
        title: "Idempotency",
        summary: "Safe retries and duplicate detection.",
        estimatedMinutes: 15,
      },
      {
        order: 3,
        conceptSlug: "circuit-breakers",
        title: "Circuit Breakers",
        summary: "Preventing cascading failures.",
        estimatedMinutes: 18,
      },
      {
        order: 4,
        conceptSlug: "message-queues",
        title: "Message Queues",
        summary: "Decoupling with async messaging.",
        estimatedMinutes: 14,
      },
    ],
  },
  {
    slug: "database-deep-dive",
    title: "Database Deep Dive",
    summary:
      "Go deep on how databases work — indexes, caching layers, and performance optimization.",
    difficulty: "intermediate",
    estimatedHours: 3,
    steps: [
      {
        order: 1,
        conceptSlug: "http",
        title: "HTTP",
        summary: "The transport layer for database APIs.",
        estimatedMinutes: 10,
      },
      {
        order: 2,
        conceptSlug: "indexes",
        title: "Database Indexes",
        summary: "B-trees, composite indexes, and query plans.",
        estimatedMinutes: 12,
      },
      {
        order: 3,
        conceptSlug: "caching-strategies",
        title: "Caching Strategies",
        summary: "Cache-aside, write-through, and TTLs.",
        estimatedMinutes: 16,
      },
    ],
  },
];

export function getPathBySlug(slug: string): LearningPath | undefined {
  return paths.find((p) => p.slug === slug);
}
