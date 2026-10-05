import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  CircleAlert,
  ClipboardList,
  Flame,
  Layers,
  Mic,
  NotebookPen,
  ScanLine,
  Sparkles,
} from "lucide-react";

import { Card } from "@/components/ui/card";

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
}

export const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: "AI tutor that teaches",
    description:
      "Explains concepts at your class level, remembers the conversation and lets you ask follow-ups in English, Hinglish or Hindi.",
    href: "/features#tutor",
  },
  {
    icon: Mic,
    title: "Ask by voice",
    description:
      "Speak a question in your browser, review the transcription in the composer and send only when it looks right.",
    href: "/tutor",
  },
  {
    icon: BookOpenCheck,
    title: "Structured AI tutorials",
    description:
      "Full chapter walkthroughs with learning objectives, key terms, examples, common mistakes and a summary you can revise the night before.",
    href: "/features#tutorials",
  },
  {
    icon: ClipboardList,
    title: "Adaptive quizzes",
    description:
      "Syllabus-aware MCQs, true/false and short answers. Scores, explanations and weak topics appear after you submit — missed questions return in your review bank.",
    href: "/features#quiz",
  },
  {
    icon: ScanLine,
    title: "Question solver with photo",
    description:
      "Type a doubt or photograph it. Starvia identifies the subject, explains the concept, solves it step by step and gives you a similar problem.",
    href: "/features#solver",
  },
  {
    icon: CalendarClock,
    title: "Exam preparation plans",
    description:
      "Day-wise revision plans built from high-weightage chapters, plus mock test blueprints and a strategy for your weak areas.",
    href: "/features#exam-prep",
  },
  {
    icon: Layers,
    title: "Flashcards that stick",
    description:
      "Generate decks from any topic, flip through them on your phone, and let spaced reviews bring due cards back when they need another pass.",
    href: "/features#flashcards",
  },
  {
    icon: NotebookPen,
    title: "Private notes & mind maps",
    description:
      "Write searchable notes in Markdown, export them, then organise the ideas into a visual mind map for revision.",
    href: "/notes",
  },
  {
    icon: CircleAlert,
    title: "A useful mistake bank",
    description:
      "Review missed quiz questions with the correct answer and explanation, then jump back into a focused practice session.",
    href: "/mistakes",
  },
  {
    icon: BarChart3,
    title: "Progress you can see",
    description:
      "Quizzes taken, topics practised, learning time and weak subjects — clear charts instead of guesswork.",
    href: "/features#progress",
  },
  {
    icon: Flame,
    title: "Streaks, XP and badges",
    description:
      "A quiet daily habit loop: keep your streak alive, level up as you study, and unlock badges for consistency — no cartoon distractions.",
    href: "/features#streaks",
  },
];

export function FeatureGrid({ limit }: { limit?: number }) {
  const features = limit ? FEATURES.slice(0, limit) : FEATURES;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {features.map((feature) => (
        <Card
          key={feature.title}
          className="group h-full p-5 transition-colors hover:border-primary/35"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <feature.icon className="size-5" />
          </div>
          <h3 className="mt-4 font-display text-[15px] font-semibold">{feature.title}</h3>
          <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">{feature.description}</p>
        </Card>
      ))}
    </div>
  );
}
