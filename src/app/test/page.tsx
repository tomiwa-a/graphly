import fs from "fs";
import path from "path";
import { MarkdownRenderer } from "@/components/ui/markdown";

export default function TestPage() {
  const content = fs.readFileSync(
    path.join(process.cwd(), "src/content/sample.md"),
    "utf-8",
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-8 font-heading text-3xl font-bold">
        Markdown Test Page
      </h1>
      <MarkdownRenderer content={content} />
    </div>
  );
}
