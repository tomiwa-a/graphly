export interface Chapter {
  id: string;
  title: string;
  summary: string;
  estimatedHours: number;
}

export const chapters: Chapter[] = [
  {
    id: "foundations",
    title: "Foundations",
    summary: "The binary basics and network communication layers that power all internet services.",
    estimatedHours: 1.5
  },
  {
    id: "api-design",
    title: "API Design",
    summary: "Protocols and design patterns to build reliable, repeatable APIs.",
    estimatedHours: 2.0
  },
  {
    id: "databases",
    title: "Database Systems",
    summary: "How databases retrieve and organize data efficiently under the hood.",
    estimatedHours: 2.5
  },
  {
    id: "reliability",
    title: "Reliability & Scalability",
    summary: "Failsafes and message passing patterns to keep systems up under high loads.",
    estimatedHours: 3.0
  },
  {
    id: "caching",
    title: "Caching Infrastructure",
    summary: "Accelerating reads and shielding storage layers with memory caches.",
    estimatedHours: 1.8
  }
];

export function getChapterById(id: string): Chapter | undefined {
  return chapters.find((c) => c.id === id);
}
