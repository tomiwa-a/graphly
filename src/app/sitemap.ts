import { MetadataRoute } from "next";
import { concepts } from "@/lib/data/concepts";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://graphy.dev";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/concepts`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/paths`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/graph`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  const conceptPages: MetadataRoute.Sitemap = concepts.map((concept) => ({
    url: `${baseUrl}/concepts/${concept.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...conceptPages];
}
