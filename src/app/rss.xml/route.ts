import { concepts } from "@/lib/data/concepts";
import { SITE_URL } from "@/lib/constants";

export async function GET() {
  const feedItems = concepts
    .map((concept) => {
      // Dynamic build date fallback
      const pubDate = new Date().toUTCString();
      return `
    <item>
      <title><![CDATA[${concept.title}]]></title>
      <link>${SITE_URL}/concepts/${concept.slug}</link>
      <guid>${SITE_URL}/concepts/${concept.slug}</guid>
      <description><![CDATA[${concept.summary}]]></description>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join("");

  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Graphy Backend Theory Feed</title>
    <link>${SITE_URL}</link>
    <description>Learn backend theory directly from foundational literature and patterns.</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    ${feedItems}
  </channel>
</rss>`;

  return new Response(rssFeed, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=1200, stale-while-revalidate=600",
    },
  });
}
