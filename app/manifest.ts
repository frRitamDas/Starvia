import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Starvia — AI Study Workspace",
    short_name: "Starvia",
    description: siteConfig.shortDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#080b18",
    theme_color: "#080b18",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
    ],
    categories: ["education", "productivity"],
  };
}
