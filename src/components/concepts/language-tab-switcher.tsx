"use client";

import { useState } from "react";
import { CodeBlock } from "@/components/ui/code-block";

interface CodeExample {
  language: string;
  title: string;
  code: string;
}

const langMap: Record<string, string> = {
  Go: "go",
  Python: "python",
  TypeScript: "typescript",
  Java: "java",
  Rust: "rust",
};

export function LanguageTabSwitcher({ examples }: { examples: CodeExample[] }) {
  if (examples.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-muted p-8 text-center">
        <p className="text-sm text-foreground-secondary font-sans">
          No code examples available yet.
        </p>
      </div>
    );
  }

  // Transform examples to the format CodeBlock expects (lowercase language keys)
  const transformed = examples.map((ex) => ({
    language: langMap[ex.language] ?? ex.language.toLowerCase(),
    title: ex.title,
    code: ex.code,
  }));

  return <CodeBlock examples={transformed} />;
}
