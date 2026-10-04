import { publicEnv } from "@/lib/env";

/** Single source of truth for brand + SEO metadata. */
export const siteConfig = {
  name: "Starvia",
  version: `V${publicEnv.appVersion.split(".").slice(0, 2).join(".")}`,
  founder: "Ritam Das",
  instagram: "https://instagram.com/vxritam",
  instagramHandle: "@vxritam",
  supportEmail: "support@starvia.study",
  tagline: "Your AI study companion",
  shortDescription:
    "Starvia is an AI study platform for Indian school students — learn concepts, solve doubts, practise with quizzes and prepare for ICSE, CBSE and state board exams.",
  description:
    "Starvia is a premium AI study platform for Indian school students (CBSE, ICSE and State Board, Classes 6–12). Ask an AI tutor, generate tutorials and quizzes, solve questions from a photo, revise with flashcards and track your progress — all in one focused study workspace.",
  keywords: [
    "AI tutor for students",
    "CBSE study app",
    "ICSE study app",
    "class 10 science quiz",
    "AI question solver India",
    "online exam preparation India",
    "ncert solutions AI",
    "study app for class 9",
    "AI flashcards",
    "board exam revision plan",
  ],
  url: publicEnv.siteUrl,
  nav: [
    { title: "Features", href: "/features" },
    { title: "Pricing", href: "/pricing" },
    { title: "FAQ", href: "/faq" },
    { title: "About", href: "/about" },
    { title: "Contact", href: "/contact" },
  ],
  footerLinks: {
    product: [
      { title: "AI Tutor", href: "/tutor" },
      { title: "Tutorials", href: "/tutorials" },
      { title: "Quizzes", href: "/quiz" },
      { title: "Question Solver", href: "/solve" },
      { title: "Exam Prep", href: "/exam-prep" },
      { title: "Flashcards", href: "/flashcards" },
      { title: "Progress", href: "/progress" },
    ],
    company: [
      { title: "About", href: "/about" },
      { title: "Features", href: "/features" },
      { title: "Pricing", href: "/pricing" },
      { title: "Contact", href: "/contact" },
    ],
    legal: [
      { title: "Privacy Policy", href: "/privacy" },
      { title: "Terms of Service", href: "/terms" },
      { title: "FAQ", href: "/faq" },
      { title: "Refunds & Cancellation", href: "/terms#refunds" },
    ],
  },
} as const;

export function absoluteUrl(path = "/") {
  const base = siteConfig.url.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
