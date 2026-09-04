import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-config";
import { getAllScannerSlugs } from "@/modules/product/data/scanners";
import { getAllSolutionSlugs } from "@/modules/solutions/data/solutions";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-09-03");
  const staticPages = [
    ["/", 1, "weekly"], ["/scans", 0.9, "weekly"], ["/solutions", 0.9, "monthly"], ["/pricing", 0.8, "monthly"],
    ["/privacy", 0.3, "yearly"], ["/terms", 0.3, "yearly"], ["/cookies", 0.3, "yearly"],
    ["/acceptable-use", 0.3, "yearly"], ["/refund-policy", 0.3, "yearly"], ["/responsible-disclosure", 0.4, "yearly"],
  ] as const;

  return [
    ...staticPages.map(([path, priority, changeFrequency]) => ({ url: absoluteUrl(path), lastModified, changeFrequency, priority })),
    ...getAllScannerSlugs().map((slug) => ({ url: absoluteUrl(`/scans/${slug}`), lastModified, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...getAllSolutionSlugs().map((slug) => ({ url: absoluteUrl(`/solutions/${slug}`), lastModified, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
