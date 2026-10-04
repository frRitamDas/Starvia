import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, TrendingUp } from "lucide-react";

import { QuizGenerator } from "@/components/learn/quiz-generator";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAttempts, listQuizzes } from "@/lib/data/quizzes";
import { requireOnboarded } from "@/lib/session";
import { getUsageSummary } from "@/lib/usage";
import { subjectsForClass } from "@/lib/curriculum";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "AI Quizzes",
  description: "Generate chapter quizzes with MCQs, true/false and short answers — graded on the server.",
  robots: { index: false, follow: false },
};

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; topic?: string }>;
}) {
  const context = await requireOnboarded();
  const params = await searchParams;

  const [quizzes, attempts, usage] = await Promise.all([
    listQuizzes(context, 20),
    listAttempts(context, 12),
    getUsageSummary(context),
  ]);

  const subjects = context.profile.subjects?.length
    ? context.profile.subjects
    : subjectsForClass(context.profile.class_level ?? "10");

  const averageScore = attempts.length
    ? Math.round(attempts.reduce((sum, attempt) => sum + Number(attempt.percentage), 0) / attempts.length)
    : null;

  const attemptByQuiz = new Map(attempts.map((attempt) => [attempt.quiz_id, attempt]));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-xl font-semibold sm:text-2xl">AI Quizzes</h1>
        <p className="text-sm text-muted-foreground">
          Practise any chapter with exam-style questions, then see exactly what to fix.
        </p>
      </div>

      <QuizGenerator
        defaultClass={context.profile.class_level ?? "10"}
        defaultBoard={context.profile.board ?? "CBSE"}
        defaultSubjects={subjects}
        defaultSubject={params.subject}
        defaultTopic={params.topic}
        maxQuestions={context.capabilities.maxQuizQuestions}
        remaining={usage.usage.quiz.remaining}
        limit={usage.usage.quiz.limit}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4 text-primary" />
              Your quizzes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {quizzes.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No quizzes yet"
                description="Generate one above and it will appear here with your score."
                className="border-none bg-transparent py-6"
              />
            ) : (
              quizzes.map((quiz) => {
                const attempt = attemptByQuiz.get(quiz.id);
                return (
                  <Link
                    key={quiz.id}
                    href={`/quiz/${quiz.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3.5 py-3 transition-colors hover:border-primary/35 hover:bg-accent/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium">{quiz.title}</p>
                      <p className="truncate text-[11.5px] text-muted-foreground">
                        {quiz.question_count} questions · {quiz.subject} ·{" "}
                        {formatRelativeTime(quiz.created_at)}
                      </p>
                    </div>
                    {attempt ? (
                      <Badge
                        variant={
                          attempt.percentage >= 80
                            ? "success"
                            : attempt.percentage >= 50
                              ? "warning"
                              : "destructive"
                        }
                        className="shrink-0"
                      >
                        {Math.round(attempt.percentage)}%
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        New
                      </Badge>
                    )}
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" />
              Recent attempts
              {averageScore !== null ? (
                <Badge variant="outline" className="ml-auto">
                  Avg {averageScore}%
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {attempts.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Your attempts and scores will show up here.
              </p>
            ) : (
              attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">
                      {attempt.score}/{attempt.total} correct
                    </p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {formatRelativeTime(attempt.created_at)}
                      {attempt.weak_topics?.length
                        ? ` · ${attempt.weak_topics.slice(0, 2).join(", ")}`
                        : ""}
                    </p>
                  </div>
                  <Badge
                    variant={
                      attempt.percentage >= 80
                        ? "success"
                        : attempt.percentage >= 50
                          ? "warning"
                          : "destructive"
                    }
                    className="shrink-0"
                  >
                    {Math.round(attempt.percentage)}%
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
