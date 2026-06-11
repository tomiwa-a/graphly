const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const SITE_URL = "https://graphy.ellomas.com";

const CONTENT_DIR = path.join(__dirname, "..", "src", "content", "concepts");
const OUTPUT_FILE = path.join(
  __dirname,
  "..",
  "src",
  "lib",
  "data",
  "concepts-data.json",
);

function toSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseSections(body) {
  const sections = [];
  const lines = body.split("\n");
  let currentHeading = null;
  let currentContent = [];

  for (const line of lines) {
    const headingMatch = line.match(/^## (.+)/);
    if (headingMatch) {
      if (currentHeading) {
        sections.push({
          id: toSlug(currentHeading),
          title: currentHeading,
          content: currentContent.join("\n").trim(),
        });
      }
      currentHeading = headingMatch[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentHeading) {
    sections.push({
      id: toSlug(currentHeading),
      title: currentHeading,
      content: currentContent.join("\n").trim(),
    });
  }

  return sections;
}

function loadConcepts() {
  const concepts = [];
  const chapters = fs.readdirSync(CONTENT_DIR);

  for (const chapter of chapters) {
    const chapterDir = path.join(CONTENT_DIR, chapter);
    if (!fs.statSync(chapterDir).isDirectory()) continue;

    const files = fs
      .readdirSync(chapterDir)
      .filter((f) => f.endsWith(".md"));

    for (const file of files) {
      const filePath = path.join(chapterDir, file);
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = matter(raw);

      const { data, content } = parsed;
      const sections = parseSections(content);

      const codeExamples = (data.code_examples || []).map((ex) => ({
        language: ex.language || "",
        title: ex.title || "",
        code: ex.code || "",
      }));

      concepts.push({
        slug: data.slug || file.replace(/\.md$/, ""),
        chapterId: data.chapterId || chapter,
        level: data.level || "topic",
        title: data.title || "",
        summary: data.summary || "",
        difficulty: data.difficulty || "beginner",
        domain: data.domain || "",
        estimatedMinutes: data.estimatedMinutes || 10,
        prerequisites: data.prerequisites || [],
        related: data.related || [],
        sections,
        codeExamples,
        seoTitle: data.seo_title || null,
        seoDescription: data.seo_description || null,
        canonicalUrl:
          data.canonical_url
            ? data.canonical_url.startsWith("/")
              ? `${SITE_URL}${data.canonical_url}`
              : data.canonical_url
            : null,
        ogImage: data.og_image || null,
        citations: data.citations || [],
        videoEmbed: data.video_embed || null,
      });
    }
  }

  return concepts;
}

function stripMarkdown(md) {
  return md
    .replace(/\[\[video.*?\]\]/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/[#*`>_\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function generateSearchIndex(concepts) {
  return concepts.map((c) => {
    const allBodyText = c.sections.map((s) => s.content).join(" ");
    return {
      slug: c.slug,
      title: c.title,
      summary: c.summary,
      domain: c.domain,
      bodyText: stripMarkdown(allBodyText),
    };
  });
}

function main() {
  const concepts = loadConcepts();
  const sorted = concepts.sort((a, b) => a.slug.localeCompare(b.slug));

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sorted, null, 2), "utf-8");
  console.log(`Generated ${sorted.length} concepts -> ${OUTPUT_FILE}`);

  const searchIndexFile = path.join(path.dirname(OUTPUT_FILE), "search-index.json");
  const searchIndex = generateSearchIndex(sorted);
  fs.writeFileSync(searchIndexFile, JSON.stringify(searchIndex, null, 2), "utf-8");
  console.log(`Generated search index -> ${searchIndexFile}`);
}

main();
