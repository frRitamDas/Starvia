import { publicEnv } from "@/lib/env";

/** Single source of truth for brand + SEO metadata. */
export const siteConfig = {
  name: "Starvia",
  version: `V${publicEnv.appVersion.split(".").slice(0, 2).join(".")}`,
  founder: "Ritam Das",
  instagram: "https://instagram.com/vxritam",
  instagramHandle: "@vxritam",
  supportEmail: "support@starvia.study",
  tagline: "A calmer way to learn with AI",
  shortDescription:
    "A focused AI study space for Indian learners: clear explanations, voice questions, quizzes, photo solving, revision plans, notes and progress that makes sense.",
  description:
    "Starvia is an AI study platform for Indian school and competitive-exam students. Learn for CBSE, ICSE and State Boards in Classes 6–12; ask in English, Hinglish or Hindi; generate lessons and quizzes; solve questions from a photo; build exam plans, flashcards, private notes and mind maps; review mistakes and track progress.",
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
    { title: "Features", href: "/#tools" },
    { title: "How it works", href: "/#how-it-works" },
    { title: "Pricing", href: "/#pricing" },
    { title: "FAQ", href: "/#faq" },
  ],
  footerLinks: {
    product: [
      { title: "AI Tutor", href: "/tutor" },
      { title: "Tutorials", href: "/tutorials" },
      { title: "Quizzes", href: "/quiz" },
      { title: "Question Solver", href: "/solve" },
      { title: "Exam Prep", href: "/exam-prep" },
      { title: "Flashcards", href: "/flashcards" },
      { title: "Study notebook", href: "/notes" },
      { title: "Mistake review", href: "/mistakes" },
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
