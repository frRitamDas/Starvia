import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private areas stay out of search results.
        disallow: [
          "/api/",
          "/dashboard",
          "/tutor",
          "/tutorials",
          "/quiz",
          "/solve",
          "/exam-prep",
          "/flashcards",
          "/progress",
          "/profile",
          "/upgrade",
          "/onboarding",
          "/admin",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
