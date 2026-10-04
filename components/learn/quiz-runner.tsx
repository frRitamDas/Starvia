"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Loader2,
  RotateCcw,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Markdown } from "@/components/learn/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, ApiClientError } from "@/lib/client/api";
import { cn, secondsToClock } from "@/lib/utils";
import type { Quiz, SafeQuizQuestion } from "@/lib/types";

interface ReviewItem {
  questionId: string;
  question: string;
  type: string;
  options: string[] | null;
  given: string;
  correctAnswer: string;
  explanation: string;
  correct: boolean;
  topic: string | null;
}

interface SubmitResult {
  attempt: { id: string; score: number; total: number; percentage: number };
  review: ReviewItem[];
  weakTopics: string[];
  xpGained: number;
  achievements: string[];
}

export function QuizRunner({
  quiz,
  questions,
}: {
  quiz: Quiz;
  questions: SafeQuizQuestion[];
}) {
  const router = useRouter();

  const [started, setStarted] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [seconds, setSeconds] = React.useState(0);
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<SubmitResult | null>(null);

  const current = questions[index];
  const answeredCount = Object.values(answers).filter((value) => value.trim().length > 0).length;

  React.useEffect(() => {
    if (!started || result) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [started, result]);

  async function submit() {
    setPending(true);
    try {
      const data = await apiFetch<SubmitResult>(`/api/quizzes/${quiz.id}/submit`, {
        method: "POST",
        json: {
          answers: questions.map((question) => ({
            questionId: question.id,
            answer: answers[question.id] ?? "",
          })),
          durationSeconds: seconds,
        },
      });
      setResult(data);
      toast.success(`Scored ${data.attempt.score}/${data.attempt.total}`);
      if (data.xpGained > 0) toast.success(`+${data.xpGained} XP`);
      (data.achievements ?? []).forEach((title) => toast.success(`Achievement: ${title}`));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Could not submit your quiz.");
    } finally {
      setPending(false);
    }
  }

  /* ------------------------------ results view ---------------------------- */
  if (result) {
    const percent = Math.round(result.attempt.percentage);
    return (
      <div className="space-y-5">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{quiz.title}</p>
              <p className="font-display text-2xl font-semibold">
                {result.attempt.score}/{result.attempt.total} correct · {percent}%
              </p>
              <p className="text-[13px] text-muted-foreground">
                Time taken {secondsToClock(seconds)} ·{" "}
                {percent >= 80
                  ? "Excellent — this topic looks solid."
                  : percent >= 50
                    ? "Good effort — revise the flagged topics."
                    : "Needs another pass — start with the explanations below."}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <Badge variant={percent >= 80 ? "success" : percent >= 50 ? "warning" : "destructive"}>
                {percent >= 80 ? "Strong" : percent >= 50 ? "Fair" : "Needs work"}
              </Badge>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/quiz">
                    <RotateCcw className="size-4" />
                    New quiz
                  </Link>
                </Button>
                <Button
                  variant="gradient"
                  size="sm"
                  onClick={() => {
                    setResult(null);
                    setAnswers({});
                    setIndex(0);
                    setSeconds(0);
                    setStarted(false);
                  }}
                >
                  Retake
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {result.weakTopics.length > 0 ? (
          <Card className="border-warning/30 bg-warning/[0.05]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CircleAlert className="size-4 text-warning" />
                Revise these next
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {result.weakTopics.map((topic) => (
                <Button key={topic} asChild variant="outline" size="sm">
                  <Link href={`/tutorials?topic=${encodeURIComponent(topic)}`}>{topic}</Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-3">
          {result.review.map((item, itemIndex) => (
            <Card
              key={item.questionId}
              className={cn(item.correct ? "border-success/30" : "border-destructive/30")}
            >
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13.5px] font-medium leading-relaxed">
                    {itemIndex + 1}. {item.question}
                  </p>
                  <Badge variant={item.correct ? "success" : "destructive"} className="shrink-0 gap-1">
                    {item.correct ? <Check className="size-3" /> : <X className="size-3" />}
                    {item.correct ? "Correct" : "Incorrect"}
                  </Badge>
                </div>

                {item.options?.length ? (
                  <div className="space-y-1.5">
                    {item.options.map((option) => {
                      const isCorrect = option === item.correctAnswer;
                      const isGiven = option === item.given;
                      return (
                        <div
                          key={option}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-[13px]",
                            isCorrect && "border-success/50 bg-success/[0.07]",
                            !isCorrect && isGiven && "border-destructive/50 bg-destructive/[0.06]",
                            !isCorrect && !isGiven && "border-border/70",
                          )}
                        >
                          {option}
                          {isCorrect ? (
                            <span className="ml-2 text-[11px] font-medium text-success">correct</span>
                          ) : null}
                          {!isCorrect && isGiven ? (
                            <span className="ml-2 text-[11px] font-medium text-destructive">
                              your answer
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-border/70 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Your answer
                      </p>
                      <p className="mt-1 text-[13px]">{item.given || "— not answered —"}</p>
                    </div>
                    <div className="rounded-lg border border-success/40 bg-success/[0.06] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Model answer
                      </p>
                      <p className="mt-1 text-[13px]">{item.correctAnswer}</p>
                    </div>
                  </div>
                )}

                {item.explanation ? (
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Explanation
                    </p>
                    <Markdown className="mt-1">{item.explanation}</Markdown>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  /* ------------------------------ intro screen ---------------------------- */
  if (!started) {
    return (
      <Card>
        <CardContent className="space-y-5 p-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Trophy className="size-5" />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-display text-xl font-semibold">{quiz.title}</h1>
            <p className="text-sm text-muted-foreground">
              {questions.length} questions · {quiz.subject}
              {quiz.chapter ? ` · ${quiz.chapter}` : ""} · <span className="capitalize">{quiz.difficulty}</span>
            </p>
          </div>
          <ul className="mx-auto max-w-md space-y-2 text-left text-[13px] text-muted-foreground">
            <li>• Answers are graded on the server — no peeking before you submit.</li>
            <li>• You can move between questions and change answers until you submit.</li>
            <li>• After submitting you&apos;ll get explanations and topics to revise.</li>
          </ul>
          <Button variant="gradient" size="lg" onClick={() => setStarted(true)}>
            Start quiz
          </Button>
          <div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/quiz">Back to quizzes</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ------------------------------- attempt -------------------------------- */
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            Question {index + 1} of {questions.length}
          </Badge>
          <Badge variant="outline">⏱ {secondsToClock(seconds)}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{answeredCount} answered</p>
      </div>

      <Progress value={((index + 1) / questions.length) * 100} className="h-1.5" />

      {current ? (
        <Card>
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {current.type.replace("_", " ")}
              </Badge>
              {current.difficulty ? (
                <Badge variant="secondary" className="capitalize">
                  {current.difficulty}
                </Badge>
              ) : null}
            </div>

            <p className="text-[15px] font-medium leading-relaxed">{current.question}</p>

            {current.options?.length ? (
              <div className="space-y-2">
                {current.options.map((option, optionIndex) => {
                  const selected = answers[current.id] === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setAnswers((existing) => ({ ...existing, [current.id]: option }))
                      }
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-[14px] transition-colors",
                        selected
                          ? "border-primary bg-primary/[0.07]"
                          : "border-border/70 hover:border-primary/40 hover:bg-accent/30",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                          selected ? "border-primary bg-primary text-primary-foreground" : "border-border/70",
                        )}
                      >
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>
            ) : current.type === "short_answer" ? (
              <Textarea
                value={answers[current.id] ?? ""}
                onChange={(event) =>
                  setAnswers((existing) => ({ ...existing, [current.id]: event.target.value }))
                }
                rows={3}
                placeholder="Write a short answer in one or two sentences…"
              />
            ) : (
              <Input
                value={answers[current.id] ?? ""}
                onChange={(event) =>
                  setAnswers((existing) => ({ ...existing, [current.id]: event.target.value }))
                }
                placeholder="Your answer"
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0}
        >
          <ArrowLeft className="size-4" />
          Previous
        </Button>

        {index < questions.length - 1 ? (
          <Button variant="secondary" onClick={() => setIndex((value) => value + 1)}>
            Next
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button variant="gradient" onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {pending ? "Grading…" : "Submit quiz"}
          </Button>
        )}
      </div>

      {index < questions.length - 1 ? (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={submit} disabled={pending}>
            Submit anyway
          </Button>
        </div>
      ) : null}
    </div>
  );
}
