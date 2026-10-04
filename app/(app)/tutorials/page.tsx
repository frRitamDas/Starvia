import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, Clock, Sparkles } from "lucide-react";

import { TutorialGenerator } from "@/components/learn/tutorial-generator";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listTutorials } from "@/lib/data/tutorials";
import { requireOnboarded } from "@/lib/session";
import { getUsageSummary } from "@/lib/usage";
import { subjectsForClass } from "@/lib/curriculum";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "AI Tutorials",
  description: "Generate structured, syllabus-accurate tutorials for any topic in your class.",
  robots: { index: false, follow: false },
};

export default async function TutorialsPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; subject?: string }>;
}) {
  const context = await requireOnboarded();
  const params = await searchParams;

  const [tutorials, usage] = await Promise.all([
    listTutorials(context, { limit: 60 }),
    getUsageSummary(context),
  ]);

  const subjects = context.profile.subjects?.length
    ? context.profile.subjects
    : subjectsForClass(context.profile.class_level ?? "10");

  const grouped = tutorials.reduce<Record<string, typeof tutorials>>((accumulator, tutorial) => {
    const key = tutorial.subject;
    accumulator[key] = accumulator[key] ?? [];
    accumulator[key]!.push(tutorial);
    return accumulator;
  }, {});

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-xl font-semibold sm:text-2xl">AI Tutorials</h1>
        <p className="text-sm text-muted-foreground">
          A complete, exam-focused explanation of any topic — objectives, worked examples, common
          mistakes and practice questions.
        </p>
      </div>

      <TutorialGenerator
        defaultClass={context.profile.class_level ?? "10"}
        defaultBoard={context.profile.board ?? "CBSE"}
        defaultSubjects={subjects}
        defaultTopic={params.topic}
        remaining={usage.usage.tutorial.remaining}
        limit={usage.usage.tutorial.limit}
        demo={context.demo}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <BookOpenCheck className="size-4 text-primary" />
              Your library
            </span>
            <Badge variant="secondary">{tutorials.length} saved</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {tutorials.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Your library is empty"
              description="Generate your first tutorial above — it will be saved here so you never lose it."
              className="border-none bg-transparent py-6"
            />
          ) : (
            Object.entries(grouped).map(([subject, items]) => (
              <div key={subject} className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {subject}
                </p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {items.map((tutorial) => (
                    <Link
                      key={tutorial.id}
                      href={`/tutorials/${tutorial.id}`}
                      className="flex flex-col gap-2 rounded-xl border border-border/70 p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13.5px] font-semibold leading-snug">{tutorial.title}</p>
                        {tutorial.completed ? (
                          <Badge variant="success" className="shrink-0">
                            Done
                          </Badge>
                        ) : null}
                      </div>
                      <p className="line-clamp-2 text-[12px] leading-5 text-muted-foreground">
                        {tutorial.content?.introduction?.slice(0, 140) ?? tutorial.topic}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatRelativeTime(tutorial.created_at)}
                        </span>
                        <span>·</span>
                        <span className="capitalize">{tutorial.difficulty}</span>
                        {tutorial.chapter ? (
                          <>
                            <span>·</span>
                            <span className="truncate">{tutorial.chapter}</span>
                          </>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
