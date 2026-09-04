import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Scanlyst — Website Audit Platform",
    short_name: "Scanlyst",
    description: "Website security, SEO, performance, accessibility, and compliance audits.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f5f5f5",
    theme_color: "#f43f5e",
    icons: [
      {
        src: "/scanlyst-logo-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/scanlyst-logo-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
