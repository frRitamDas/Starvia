"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Lightbulb,
  Loader2,
  NotebookPen,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { Markdown } from "@/components/learn/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { apiFetch, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import type { Tutorial } from "@/lib/types";

export function TutorialView({ tutorial }: { tutorial: Tutorial }) {
  const router = useRouter();
  const content = tutorial.content;

  const [completed, setCompleted] = React.useState(tutorial.completed);
  const [pending, setPending] = React.useState(false);
  const [revealed, setRevealed] = React.useState<Record<number, boolean>>({});
  const [activeSection, setActiveSection] = React.useState(0);

  const sections = content?.sections ?? [];
  const readPercent = completed
    ? 100
    : Math.round(((activeSection + 1) / Math.max(sections.length, 1)) * 100);

  async function toggleComplete() {
    setPending(true);
    try {
      const data = await apiFetch<{ completed: boolean; xpGained: number; achievements: string[] }>(
        `/api/tutorials/${tutorial.id}`,
        { method: "PATCH", json: { completed: !completed } },
      );
      setCompleted(data.completed);
      if (data.completed) {
        toast.success(
          data.xpGained > 0 ? `Tutorial completed · +${data.xpGained} XP` : "Tutorial completed",
        );
        (data.achievements ?? []).forEach((title) => toast.success(`Achievement: ${title}`));
      }
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "Could not update that tutorial.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              Class {tutorial.class_level} · {tutorial.board}
            </Badge>
            <Badge variant="outline">{tutorial.subject}</Badge>
            <Badge variant="outline" className="capitalize">
              {tutorial.difficulty}
            </Badge>
            {tutorial.chapter ? <Badge variant="outline">{tutorial.chapter}</Badge> : null}
          </div>
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight sm:text-[28px]">
            {content?.title ?? tutorial.title}
          </h1>
        </div>

        {/* Objectives */}
        {content?.learningObjectives?.length ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="size-4 text-primary" />
                What you&apos;ll learn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {content.learningObjectives.map((objective) => (
                  <li key={objective} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    <span className="text-muted-foreground">{objective}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {/* Introduction */}
        {content?.introduction ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Introduction</CardTitle>
            </CardHeader>
            <CardContent>
              <Markdown>{content.introduction}</Markdown>
            </CardContent>
          </Card>
        ) : null}

        {/* Sections */}
        {sections.map((section, index) => (
          <Card
            key={`${section.heading}-${index}`}
            id={`section-${index}`}
            className={cn(
              "scroll-mt-24 transition-colors",
              activeSection === index && "border-primary/35",
            )}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-semibold text-primary">
                  {index + 1}
                </span>
                {section.heading}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Markdown>{section.body}</Markdown>
              {section.keyPoints?.length ? (
                <ul className="space-y-1.5 rounded-xl border border-border/70 bg-muted/25 p-3.5">
                  {section.keyPoints.map((point) => (
                    <li key={point} className="flex gap-2 text-[13px]">
                      <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-warning" />
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        ))}

        {/* Examples */}
        {content?.examples?.length ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <NotebookPen className="size-4 text-primary" />
                Worked examples
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.examples.map((example, index) => (
                <div key={`${example.title}-${index}`} className="space-y-2.5 rounded-xl border border-border/70 p-4">
                  <p className="text-[13.5px] font-semibold">{example.title}</p>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Problem
                    </p>
                    <Markdown className="mt-1">{example.problem}</Markdown>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Solution
                    </p>
                    <Markdown className="mt-1">{example.solution}</Markdown>
                  </div>
                  {example.takeaway ? (
                    <p className="text-[12.5px] text-muted-foreground">
                      <span className="font-medium text-foreground">Takeaway:</span> {example.takeaway}
                    </p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {/* Terms */}
        {content?.importantTerms?.length ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Important terms</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {content.importantTerms.map((term) => (
                <div key={term.term} className="rounded-xl border border-border/70 p-3.5">
                  <p className="text-[13px] font-semibold">{term.term}</p>
                  <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">{term.meaning}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {/* Exam tips + mistakes */}
        <div className="grid gap-4 sm:grid-cols-2">
          {content?.examTips?.length ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-4 text-primary" />
                  Exam tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-[13px] text-muted-foreground">
                  {content.examTips.map((tip) => (
                    <li key={tip} className="flex gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {content?.commonMistakes?.length ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CircleAlert className="size-4 text-destructive" />
                  Common mistakes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-[13px] text-muted-foreground">
                  {content.commonMistakes.map((mistake) => (
                    <li key={mistake} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive/70" />
                      {mistake}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Practice */}
        {content?.practiceQuestions?.length ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="size-4 text-primary" />
                Practice questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {content.practiceQuestions.map((question, index) => (
                <div key={`${question.question}-${index}`} className="rounded-xl border border-border/70 p-4">
                  <p className="text-[13.5px] font-medium">
                    {index + 1}. {question.question}
                  </p>
                  {question.hint ? (
                    <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                      <span className="font-medium text-foreground">Hint:</span> {question.hint}
                    </p>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 px-2 text-xs"
                    onClick={() =>
                      setRevealed((current) => ({ ...current, [index]: !current[index] }))
                    }
                  >
                    {revealed[index] ? "Hide answer" : "Show answer"}
                    <ChevronRight
                      className={cn("size-3.5 transition-transform", revealed[index] && "rotate-90")}
                    />
                  </Button>
                  {revealed[index] ? (
                    <div className="mt-2 rounded-lg bg-success/[0.07] p-3">
                      <Markdown>{question.answer}</Markdown>
                    </div>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {/* Summary */}
        {content?.summary ? (
          <Card className="border-primary/25 bg-primary/[0.04]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Markdown>{content.summary}</Markdown>
            </CardContent>
          </Card>
        ) : null}

        {/* Completion */}
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13.5px] font-semibold">
                {completed ? "You've completed this tutorial" : "Finished reading?"}
              </p>
              <p className="text-[12.5px] text-muted-foreground">
                Marking it complete earns XP and records the topic in your progress.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`/quiz?subject=${encodeURIComponent(tutorial.subject)}&topic=${encodeURIComponent(tutorial.topic)}`}>
                  Quiz me
                </Link>
              </Button>
              <Button
                variant={completed ? "secondary" : "gradient"}
                onClick={toggleComplete}
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                {completed ? "Mark as not done" : "Mark as complete"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Reading progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={readPercent} indicatorClassName="bg-brand-gradient" />
            <p className="text-xs text-muted-foreground">{readPercent}% of this tutorial</p>
            <div className="space-y-1">
              {sections.map((section, index) => (
                <button
                  key={`${section.heading}-nav-${index}`}
                  type="button"
                  onClick={() => {
                    setActiveSection(index);
                    document
                      .getElementById(`section-${index}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={cn(
                    "block w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors",
                    activeSection === index
                      ? "bg-accent/70 text-foreground"
                      : "text-muted-foreground hover:bg-accent/40",
                  )}
                >
                  {index + 1}. {section.heading}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BookOpenCheck className="size-4 text-primary" />
              Keep going
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" size="sm" className="w-full justify-start">
              <Link href="/tutorials">Back to library</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full justify-start">
              <Link
                href={`/tutor?q=${encodeURIComponent(`I have a doubt in ${tutorial.topic}`)}`}
              >
                Ask the AI tutor
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full justify-start">
              <Link href="/flashcards">Make flashcards</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
