import { concepts, type Concept } from "./data/concepts";

export interface GraphEdge {
  from: string;
  to: string;
  type: "requires" | "related";
  reason: string;
}

// Statically define semantic relationship reasons to tell the story of the connections
export const graphEdges: GraphEdge[] = [
  {
    from: "http",
    to: "idempotency",
    type: "requires",
    reason: "Because HTTP networks are unreliable and client retries are common, POST endpoints must be idempotent to prevent duplicate processing (e.g. double billing)."
  },
  {
    from: "http",
    to: "indexes",
    type: "requires",
    reason: "HTTP requests targeting REST/GraphQL read endpoints inevitably query database tables. Indexes are required to prevent full table scans on every client request."
  },
  {
    from: "http",
    to: "message-queues",
    type: "requires",
    reason: "To keep HTTP response times low (under 100ms), long-running write requests must be decoupled. HTTP handlers immediately queue tasks and return a 202 Accepted response."
  },
  {
    from: "http",
    to: "caching-strategies",
    type: "requires",
    reason: "HTTP caching headers (ETag, Cache-Control) coordinate directly with client-side, CDN, and server-side cache-aside layers to eliminate redundant hits."
  },
  {
    from: "idempotency",
    to: "circuit-breakers",
    type: "requires",
    reason: "Circuit breakers prevent cascading failures by tripping on timeouts. In distributed systems, retrying tripped requests safely requires idempotency keys."
  },
  {
    from: "idempotency",
    to: "message-queues",
    type: "related",
    reason: "Message queues guarantee at-least-once delivery, meaning consumers will occasionally receive duplicate messages. Consumers must be idempotent to process them safely."
  },
  {
    from: "indexes",
    to: "caching-strategies",
    type: "related",
    reason: "Both indexes and cache-aside storage trade memory footprint for query speed. A cache miss typically results in an indexed database lookup."
  },
  {
    from: "circuit-breakers",
    to: "message-queues",
    type: "related",
    reason: "When a downstream service is down and the circuit breaker trips, background message queues store messages to be re-processed once the circuit closes."
  },
  {
    from: "bits",
    to: "hash-functions",
    type: "requires",
    reason: "Hash functions use bitwise operations (left/right bit shifts, XOR, bit masking) to scramble and compress variable-length input keys into a uniform distribution."
  },
  {
    from: "hash-functions",
    to: "bloom-filters",
    type: "requires",
    reason: "Bloom filters run a key through multiple independent hash functions to determine which bit offsets to toggle in their internal array."
  },
  {
    from: "bloom-filters",
    to: "caching-strategies",
    type: "requires",
    reason: "Bloom filters serve as high-performance 'cache shields'. By verifying that an item is 'definitely not' in the set, they immediately stop cache penetration attacks."
  }
];

export class GraphEngine {
  /**
   * Finds the shortest path of semantic relationships from a start concept to a destination concept.
   * Returns an array of node steps with transition reasons.
   */
  static findPath(start: string, end: string): { slug: string; reason: string }[] | null {
    if (start === end) return [{ slug: start, reason: "You are already here!" }];

    const queue: { current: string; path: { slug: string; reason: string }[] }[] = [
      { current: start, path: [] }
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { current, path } = queue.shift()!;

      if (current === end) {
        return path;
      }

      if (!visited.has(current)) {
        visited.add(current);

        // Find all outgoing edges from the current node
        const outgoingEdges = graphEdges.filter((edge) => edge.from === current);
        for (const edge of outgoingEdges) {
          if (!visited.has(edge.to)) {
            queue.push({
              current: edge.to,
              path: [...path, { slug: edge.to, reason: edge.reason }]
            });
          }
        }
      }
    }

    return null; // No path found
  }

  /**
   * Recursively gathers all prerequisite slugs (ancestors) of a given concept.
   */
  static getTransitivePrerequisites(slug: string, visited = new Set<string>()): string[] {
    const concept = concepts.find((c) => c.slug === slug);
    if (!concept || visited.has(slug)) return [];

    visited.add(slug);

    let prereqs: string[] = [...concept.prerequisites];
    for (const prereq of concept.prerequisites) {
      prereqs = [...prereqs, ...this.getTransitivePrerequisites(prereq, visited)];
    }

    return [...new Set(prereqs)];
  }

  /**
   * Resolves a set of concepts into a topologically sorted learning list.
   * If concept B depends on A, A will always precede B in the returned array.
   */
  static topologicalSort(slugs: string[]): string[] {
    const slugSet = new Set(slugs);
    const result: string[] = [];
    const tempVisited = new Set<string>();
    const permVisited = new Set<string>();

    const visit = (slug: string) => {
      if (permVisited.has(slug)) return;
      if (tempVisited.has(slug)) {
        // Cycle detected, but we skip to avoid infinite loops and continue
        return;
      }

      tempVisited.add(slug);

      const concept = concepts.find((c) => c.slug === slug);
      if (concept) {
        for (const prereq of concept.prerequisites) {
          if (slugSet.has(prereq)) {
            visit(prereq);
          }
        }
      }

      tempVisited.delete(slug);
      permVisited.add(slug);
      result.push(slug);
    };

    slugs.forEach((slug) => {
      if (!permVisited.has(slug)) {
        visit(slug);
      }
    });

    return result;
  }

  /**
   * Compiles a full dynamic syllabus from a start concept to a target concept.
   * Computes prerequisites, merges them, sorts them topologically, and groups them by domain/layer.
   */
  static compileSyllabus(start: string, target: string): {
    title: string;
    description: string;
    slug: string;
    estimatedMinutes: number;
    difficulty: string;
    domain: string;
    reason: string;
  }[] {
    // 1. Find the direct transition path
    const path = this.findPath(start, target);
    if (!path) {
      // If no path is found, fall back to target + its prerequisites
      const prerequisites = this.getTransitivePrerequisites(target);
      const allSlugs = [target, ...prerequisites];
      const sortedSlugs = this.topologicalSort(allSlugs);

      return sortedSlugs.map((slug) => {
        const c = concepts.find((cc) => cc.slug === slug)!;
        return {
          title: c.title,
          description: c.summary,
          slug: c.slug,
          estimatedMinutes: c.estimatedMinutes,
          difficulty: c.difficulty,
          domain: c.domain,
          reason: slug === target ? "Target Goal" : "Prerequisite to goal"
        };
      });
    }

    // 2. We have a path. Collect all required concepts (start + intermediate step nodes + target)
    const pathSlugs = [start, ...path.map((step) => step.slug)];

    // 3. For each node in the path, also pull its strict prerequisites to ensure the user is fully prepared
    let allRequiredSlugs: string[] = [];
    pathSlugs.forEach((slug) => {
      allRequiredSlugs.push(slug);
      allRequiredSlugs = [...allRequiredSlugs, ...this.getTransitivePrerequisites(slug)];
    });

    // 4. Sort all required concepts topologically
    const sortedRequiredSlugs = this.topologicalSort([...new Set(allRequiredSlugs)]);

    // 5. Build syllabus items mapping transition reasons from the BFS path
    return sortedRequiredSlugs.map((slug) => {
      const c = concepts.find((cc) => cc.slug === slug)!;
      // Find if this slug is an intermediate step in the path
      const pathStepIdx = path.findIndex((step) => step.slug === slug);
      let stepReason = "";
      if (slug === start) {
        stepReason = "Your starting point.";
      } else if (pathStepIdx !== -1) {
        stepReason = path[pathStepIdx].reason;
      } else {
        stepReason = `Prerequisite required for ${
          path.find((step) => {
            const stepConcept = concepts.find((cc) => cc.slug === step.slug);
            return stepConcept?.prerequisites.includes(slug);
          })?.slug || "next steps"
        }.`;
      }

      return {
        title: c.title,
        description: c.summary,
        slug: c.slug,
        estimatedMinutes: c.estimatedMinutes,
        difficulty: c.difficulty,
        domain: c.domain,
        reason: stepReason
      };
    });
  }
}
