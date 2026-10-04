import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Starvia — AI Study Companion",
    short_name: "Starvia",
    description:
      "AI tutor, tutorials, quizzes, question solving and exam preparation for Indian school students.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#080b18",
    theme_color: "#6366f1",
    categories: ["education", "productivity"],
    lang: "en-IN",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Ask AI Tutor",
        short_name: "AI Tutor",
        description: "Ask a doubt and get a step-by-step explanation.",
        url: "/tutor",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Take a Quiz",
        short_name: "Quiz",
        description: "Generate an exam-style practice quiz.",
        url: "/quiz",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Solve a Question",
        short_name: "Solve",
        description: "Type or photograph a question to solve it.",
        url: "/solve",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
