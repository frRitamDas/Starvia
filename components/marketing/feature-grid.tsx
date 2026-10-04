import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  ClipboardList,
  Flame,
  Layers,
  ScanLine,
  Sparkles,
} from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
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
      "Explains concepts step by step at your class level — with analogies, worked examples, exam tips and one practice question to lock it in.",
    href: "/features#tutor",
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
      "MCQs, true/false and short answers generated from your syllabus. Score, explanations and weak topics appear only after you submit.",
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
      "Generate decks from any topic, flip through them on your phone, and Starvia tracks what you know versus what needs another pass.",
    href: "/features#flashcards",
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
      {features.map((feature, index) => (
        <Reveal key={feature.title} delay={(index % 4) * 70} className="h-full min-w-0">
          <Card className="card-lift group h-full min-w-0 p-5 transition-colors hover:border-primary/35">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <feature.icon className="size-5" />
            </div>
            <h3 className="mt-4 font-display text-[15px] font-semibold">{feature.title}</h3>
            <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">{feature.description}</p>
          </Card>
        </Reveal>
      ))}
    </div>
  );
}
