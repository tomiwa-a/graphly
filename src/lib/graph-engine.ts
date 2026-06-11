import { concepts, type Concept } from "./data/concepts";
import { chapters } from "./data/chapters";

export interface GraphEdge {
  from: string;
  to: string;
  type: "requires" | "related";
  reason: string;
}

// Custom detailed reasons for connections to tell the story of the transitions
const customReasons: Record<string, string> = {
  "http->idempotency": "Because HTTP networks are unreliable and client retries are common, POST endpoints must be idempotent to prevent duplicate processing (e.g. double billing).",
  "http->indexes": "HTTP requests targeting REST/GraphQL read endpoints inevitably query database tables. Indexes are required to prevent full table scans on every client request.",
  "http->message-queues": "To keep HTTP response times low (under 100ms), long-running write requests must be decoupled. HTTP handlers immediately queue tasks and return a 202 Accepted response.",
  "http->caching-strategies": "HTTP caching headers (ETag, Cache-Control) coordinate directly with client-side, CDN, and server-side cache-aside layers to eliminate redundant hits.",
  "idempotency->circuit-breakers": "Circuit breakers prevent cascading failures by tripping on timeouts. In distributed systems, retrying tripped requests safely requires idempotency keys.",
  "idempotency->message-queues": "Message queues guarantee at-least-once delivery, meaning consumers will occasionally receive duplicate messages. Consumers must be idempotent to process them safely.",
  "indexes->caching-strategies": "Both indexes and cache-aside storage trade memory footprint for query speed. A cache miss typically results in an indexed database lookup.",
  "circuit-breakers->message-queues": "When a downstream service is down and the circuit breaker trips, background message queues store messages to be re-processed once the circuit closes.",
  "bits->hash-functions": "Hash functions use bitwise operations (left/right bit shifts, XOR, bit masking) to scramble and compress variable-length input keys into a uniform distribution.",
  "hash-functions->bloom-filters": "Bloom filters run a key through multiple independent hash functions to determine which bit offsets to toggle in their internal array.",
  "bloom-filters->caching-strategies": "Bloom filters serve as high-performance 'cache shields'. By verifying that an item is 'definitely not' in the set, they immediately stop cache penetration attacks."
};

export const graphEdges: GraphEdge[] = (() => {
  const list: GraphEdge[] = [];
  const requiresPairs = new Set<string>();

  // 1. Gather all prerequisite requires edges
  concepts.forEach((concept) => {
    concept.prerequisites.forEach((prereq) => {
      const key = `${prereq}->${concept.slug}`;
      const fromConcept = concepts.find((c) => c.slug === prereq);
      const reason = customReasons[key] || `Because ${fromConcept?.title || prereq} is a prerequisite to understanding ${concept.title}.`;
      list.push({
        from: prereq,
        to: concept.slug,
        type: "requires",
        reason
      });
      requiresPairs.add(key);
      requiresPairs.add(`${concept.slug}->${prereq}`);
    });
  });

  // 2. Gather all related edges (if not already covered by a requires edge)
  const seenRelatedPairs = new Set<string>();
  concepts.forEach((concept) => {
    concept.related.forEach((rel) => {
      const pairKey = `${concept.slug}->${rel}`;
      const revPairKey = `${rel}->${concept.slug}`;
      if (!requiresPairs.has(pairKey) && !requiresPairs.has(revPairKey)) {
        const [first, second] = [concept.slug, rel].sort();
        const dupKey = `${first}->${second}`;
        if (!seenRelatedPairs.has(dupKey)) {
          const reason = customReasons[pairKey] || customReasons[revPairKey] || `Related concept exploring concurrent ideas in backend engineering.`;
          list.push({
            from: concept.slug,
            to: rel,
            type: "related",
            reason
          });
          seenRelatedPairs.add(dupKey);
        }
      }
    });
  });

  return list;
})();


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
    chapterId: string;
    reason: string;
  }[] {
    // 1. Find the direct transition path
    const path = this.findPath(start, target);
    let finalSlugs: string[] = [];
    let resolveReason = (slug: string): string => "";

    if (!path) {
      // If no path is found, fall back to target + its prerequisites
      const prerequisites = this.getTransitivePrerequisites(target);
      const allSlugs = [target, ...prerequisites];
      finalSlugs = this.topologicalSort(allSlugs);
      resolveReason = (slug) => slug === target ? "Target Goal" : "Prerequisite to goal";
    } else {
      // 2. We have a path. Collect all required concepts (start + intermediate step nodes + target)
      const pathSlugs = [start, ...path.map((step) => step.slug)];

      // 3. For each node in the path, also pull its strict prerequisites to ensure the user is fully prepared
      let allRequiredSlugs: string[] = [];
      pathSlugs.forEach((slug) => {
        allRequiredSlugs.push(slug);
        allRequiredSlugs = [...allRequiredSlugs, ...this.getTransitivePrerequisites(slug)];
      });

      // 4. Sort all required concepts topologically
      finalSlugs = this.topologicalSort([...new Set(allRequiredSlugs)]);
      resolveReason = (slug) => {
        const pathStepIdx = path.findIndex((step) => step.slug === slug);
        if (slug === start) {
          return "Your starting point.";
        } else if (pathStepIdx !== -1) {
          return path[pathStepIdx].reason;
        } else {
          return `Prerequisite required for ${
            path.find((step) => {
              const stepConcept = concepts.find((cc) => cc.slug === step.slug);
              return stepConcept?.prerequisites.includes(slug);
            })?.slug || "next steps"
          }.`;
        }
      };
    }

    // Now, sort/group finalSlugs by chapterId (using the chapters order),
    // and if same chapter, preserve their relative topological order.
    const chapterOrder = chapters.map((ch) => ch.id);
    const sortedAndGroupedSlugs = [...finalSlugs].sort((aSlug, bSlug) => {
      const aConcept = concepts.find((c) => c.slug === aSlug)!;
      const bConcept = concepts.find((c) => c.slug === bSlug)!;
      
      const aChapterIdx = chapterOrder.indexOf(aConcept.chapterId);
      const bChapterIdx = chapterOrder.indexOf(bConcept.chapterId);
      
      if (aChapterIdx !== bChapterIdx) {
        return aChapterIdx - bChapterIdx;
      }
      
      return finalSlugs.indexOf(aSlug) - finalSlugs.indexOf(bSlug);
    });

    return sortedAndGroupedSlugs.map((slug) => {
      const c = concepts.find((cc) => cc.slug === slug)!;
      return {
        title: c.title,
        description: c.summary,
        slug: c.slug,
        estimatedMinutes: c.estimatedMinutes,
        difficulty: c.difficulty,
        domain: c.domain,
        chapterId: c.chapterId,
        reason: resolveReason(slug)
      };
    });
  }
}
