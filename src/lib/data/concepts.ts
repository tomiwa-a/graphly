export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface CodeExample {
  language: string;
  title: string;
  code: string;
}

export interface ConceptSection {
  id: string;
  title: string;
  content: string;
}

export interface Citation {
  title: string;
  author: string;
  chapter?: string;
  page_range?: string;
  external_link?: string;
}

export interface VideoEmbed {
  platform: "youtube" | "loom" | "vimeo";
  id: string;
  title?: string;
}

export interface Concept {
  slug: string;
  chapterId: string;
  level: "chapter" | "concept" | "topic";
  title: string;
  summary: string;
  difficulty: Difficulty;
  domain: string;
  estimatedMinutes: number;
  prerequisites: string[];
  related: string[];
  sections: ConceptSection[];
  codeExamples: CodeExample[];
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  ogImage: string | null;
  citations: Citation[];
  videoEmbed: VideoEmbed | null;
}

import conceptsData from "./concepts-data.json";

export const concepts: Concept[] = conceptsData as Concept[];

export function getConceptBySlug(slug: string): Concept | undefined {
  return concepts.find((c) => c.slug === slug);
}

export function getConceptsByDomain(domain: string): Concept[] {
  return concepts.filter((c) => c.domain === domain);
}

export function getAllDomains(): string[] {
  return [...new Set(concepts.map((c) => c.domain))];
}

export function getAllSlugs(): string[] {
  return concepts.map((c) => c.slug);
}
