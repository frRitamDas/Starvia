import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { CtaBand } from "@/components/marketing/cta-band";
import { FEATURES } from "@/components/marketing/feature-grid";
import { Eyebrow, Section, SectionHeading } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Features — AI tutor, tutorials, quizzes, solver & exam prep",
  description:
    "Explore every Starvia feature: class-aware AI tutor, structured tutorials, adaptive quizzes, photo question solver, exam preparation plans, flashcards and progress tracking for CBSE, ICSE and State Board students.",
  alternates: { canonical: "/features" },
};

const DETAILS: Record<
  string,
  { id: string; headline: string; points: string[]; footnote: string }
> = {
  "AI tutor that teaches": {
    id: "tutor",
    headline: "An AI tutor that knows your class, board and syllabus",
    points: [
      "Remembers the context of your conversation, so follow-up questions make sense",
      "Explains with analogies, worked examples and short formulas in proper maths notation",
      "Adds an exam tip, a common mistake to avoid and one practice question",
      "Ask in English, Hinglish or Hindi — technical terms stay in English",
      "Copy any answer, regenerate it, or mark it helpful / not helpful",
    ],
    footnote: "Best for daily doubts, homework help and concept building.",
  },
  "Structured AI tutorials": {
    id: "tutorials",
    headline: "Tutorials that read like a well-planned class",
    points: [
      "Learning objectives, introduction, 4–6 progressive sections",
      "Two or three fully worked examples, with every step shown",
      "Important terms, exam tips and the mistakes examiners see most",
      "Practice questions with hints and answers",
      "Generated tutorials are saved, so you can reopen them instead of regenerating",
    ],
    footnote: "Each tutorial is stored in your library and counts toward your progress.",
  },
  "Adaptive quizzes": {
    id: "quiz",
    headline: "Quizzes with the answer key kept on the server",
    points: [
      "MCQs, true/false and short answers — choose the mix yourself",
      "Correct answers and explanations are revealed only after you submit",
      "Server-side grading, so nothing can be tampered with from the browser",
      "Score, per-question review and the exact topics you got wrong",
      "Recommended revision topics at the end of every attempt",
    ],
    footnote: "Quiz attempts feed your weak-topic detection and progress charts.",
  },
  "Question solver with photo": {
    id: "solver",
    headline: "Type it or photograph it — get the full method",
    points: [
      "Vision model reads printed and handwritten questions",
      "Identifies subject and topic before solving",
      "Explains the concept, then solves step by step with units",
      "Flags the examiner trap and gives a similar practice question",
      "Hint mode nudges you toward the answer without giving it away",
    ],
    footnote: "Best for numericals, diagrams-based questions and long-form problems.",
  },
  "Exam preparation plans": {
    id: "exam-prep",
    headline: "A revision plan that fits the days you actually have",
    points: [
      "Choose board, class, subject, chapter and exam type",
      "Day-wise plan weighted toward high-scoring chapters",
      "Formula sheet, practice questions and MCQs in the same pack",
      "Mock test blueprint with section-wise marks and timing",
      "Track every topic as not started, learning, practised or mastered",
    ],
    footnote: "Advanced mock tests and full analytics are included in Pro and Ultra.",
  },
  "Flashcards that stick": {
    id: "flashcards",
    headline: "Revision you can do in five minutes",
    points: [
      "Create cards yourself or generate a deck from any topic",
      "Flip, mark known / unknown, and repeat only what you missed",
      "Cards become 'mastered' after three correct recalls in a row",
      "Works perfectly on a phone between classes",
    ],
    footnote: "AI flashcard generation is part of Pro and Ultra; manual decks are free.",
  },
  "Progress you can see": {
    id: "progress",
    headline: "Know exactly where you stand",
    points: [
      "Tutorials completed, questions asked, quizzes taken and average accuracy",
      "Learning time and topic-level mastery across subjects",
      "Weak subjects surfaced automatically from your quiz history",
      "Streaks, XP and badges for consistency",
    ],
    footnote: "All progress is private to your account — nobody else can read it.",
  },
  "Streaks, XP and badges": {
    id: "streaks",
    headline: "A quiet daily habit loop",
    points: [
      "Streak counter with your longest streak as a personal record",
      "XP for tutorials, quizzes, solved questions and reviews",
      "Levels that grow with sustained practice",
      "Achievement badges — subtle, not childish",
    ],
    footnote: "Streaks reset at midnight IST if you miss a day. Study time is counted in IST.",
  },
};

export default function FeaturesPage() {
  return (
    <>
      <Section className="pb-8 pt-14 sm:pt-20">
        <SectionHeading
          eyebrow="Features"
          title="Built around how students actually study"
          description="Every Starvia tool shares one thing: your class, board and syllabus context. That's why the explanations feel written for you instead of copied from a textbook."
        />
      </Section>

      <Section className="py-0">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="p-5">
              <feature.icon className="size-5 text-primary" />
              <h2 className="mt-3.5 font-display text-[15px] font-semibold">{feature.title}</h2>
              <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <div className="container space-y-6 py-16 sm:py-20">
        {Object.entries(DETAILS).map(([title, detail], index) => (
          <Card key={title} id={detail.id} className="scroll-mt-24 p-6 sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
              <div className="space-y-3">
                <Eyebrow>{String(index + 1).padStart(2, "0")} · {title}</Eyebrow>
                <h2 className="text-xl font-semibold leading-snug sm:text-2xl">
                  {detail.headline}
                </h2>
                <p className="text-sm text-muted-foreground">{detail.footnote}</p>
              </div>
              <ul className="space-y-3 text-sm">
                {detail.points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      <Section className="border-t border-border/60 bg-muted/20 py-14">
        <SectionHeading
          eyebrow="Also included"
          title="The details that make it usable every day"
          description="Small things matter when you're studying on a phone at 11 pm before a test."
        />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Dark mode that's easy on the eyes",
            "Works on Android, iPhone, tablet and laptop",
            "Keyboard-friendly and screen-reader friendly",
            "Daily limits shown clearly, so nothing is a surprise",
            "Saved conversations you can rename, pin or delete",
            "Progress and streaks that motivate without nagging",
            "UPI, cards and net banking via Razorpay",
            "Your data protected by row-level security",
          ].map((item) => (
            <div
              key={item}
              className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-card px-3.5 py-3 text-[13px] text-muted-foreground"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              {item}
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Button asChild variant="gradient" size="lg">
            <Link href="/signup">
              Start learning free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </Section>

      <Section>
        <CtaBand
          title="Ready to study smarter?"
          description={`Join students across India using ${siteConfig.name} to understand concepts properly — not just finish homework.`}
        />
      </Section>
    </>
  );
}
