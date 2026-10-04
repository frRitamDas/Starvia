import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpenCheck, CalendarDays, ClipboardList, Lightbulb, Sigma, Target } from "lucide-react";

import { Markdown } from "@/components/learn/markdown";
import { TopicStatusControl } from "@/components/learn/topic-status-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getExamPlan, listStudyProgress } from "@/lib/data/progress";
import { requireOnboarded } from "@/lib/session";
import { examTypeLabel } from "@/lib/curriculum";

export const metadata: Metadata = {
  title: "Revision plan",
  robots: { index: false, follow: false },
};

export default async function ExamPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireOnboarded();
  const { id } = await params;

  const [plan, topics] = await Promise.all([
    getExamPlan(context, id),
    listStudyProgress(context, 300),
  ]);

  if (!plan) notFound();

  const content = plan.content;
  const statusFor = (topicName: string) =>
    topics.find((topic) => topic.topic.toLowerCase() === topicName.toLowerCase())?.status ??
    "not_started";

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {plan.class_level} · {plan.board}
          </Badge>
          <Badge variant="outline">{plan.subject}</Badge>
          <Badge variant="outline">{examTypeLabel(plan.exam_type)}</Badge>
          <Badge variant="outline">{plan.planned_days}-day plan</Badge>
        </div>
        <h1 className="font-display text-2xl font-semibold leading-tight sm:text-[28px]">
          {content.title}
        </h1>
        <Markdown className="text-muted-foreground">{content.overview}</Markdown>
        {content.totalStudyHours ? (
          <p className="text-[13px] text-muted-foreground">
            Approximate study time: <span className="font-medium text-foreground">{content.totalStudyHours} hours</span>
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        {/* Important topics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-primary" />
              Important topics & weightage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {content.importantTopics?.map((topic) => (
              <div key={topic.name} className="space-y-2 rounded-xl border border-border/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13.5px] font-semibold">{topic.name}</p>
                    {topic.why ? (
                      <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">{topic.why}</p>
                    ) : null}
                  </div>
                  <Badge
                    variant={
                      topic.weightage === "high"
                        ? "destructive"
                        : topic.weightage === "medium"
                          ? "warning"
                          : "secondary"
                    }
                    className="shrink-0 capitalize"
                  >
                    {topic.weightage}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <TopicStatusControl
                    subject={plan.subject}
                    chapter={plan.chapter}
                    topic={topic.name}
                    initialStatus={statusFor(topic.name)}
                  />
                  {topic.estimatedMinutes ? (
                    <span className="text-[11.5px] text-muted-foreground">
                      ~{topic.estimatedMinutes} min
                    </span>
                  ) : null}
                </div>
              </div>
            ))}

            {content.weakAreaStrategy?.length ? (
              <div className="rounded-xl border border-warning/30 bg-warning/[0.05] p-4">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Fix your weak areas
                </p>
                <ul className="mt-2 space-y-1.5 text-[13px] text-muted-foreground">
                  {content.weakAreaStrategy.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-warning" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Day-wise plan */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-primary" />
              Day-wise plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {content.plan?.map((day) => (
              <div key={day.day} className="rounded-xl border border-border/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold">
                    Day {day.day} · {day.focus}
                  </p>
                  <span className="text-[11.5px] text-muted-foreground">{day.minutes} min</span>
                </div>
                <ul className="mt-2 space-y-1.5 text-[12.5px] text-muted-foreground">
                  {day.tasks?.map((task) => (
                    <li key={task} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Formulas */}
      {content.keyFormulas?.length ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sigma className="size-4 text-primary" />
              Formula sheet
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {content.keyFormulas.map((item) => (
              <div key={item.name} className="rounded-xl border border-border/70 p-3.5">
                <p className="text-[12.5px] font-medium">{item.name}</p>
                <Markdown className="mt-1 text-[13px]">{`$$${item.formula}$$`}</Markdown>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Practice + MCQs */}
      <div className="grid gap-5 lg:grid-cols-2">
        {content.practiceQuestions?.length ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="size-4 text-primary" />
                Practice questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {content.practiceQuestions.map((question, index) => (
                <details
                  key={`${question.question}-${index}`}
                  className="rounded-xl border border-border/70 p-4 [&_summary]:cursor-pointer"
                >
                  <summary className="text-[13.5px] font-medium marker:content-none">
                    {index + 1}. {question.question}
                    <span className="ml-2 text-[11px] text-muted-foreground">
                      {question.marks} marks · {question.difficulty}
                    </span>
                  </summary>
                  <div className="mt-3 rounded-lg bg-success/[0.07] p-3">
                    <Markdown>{question.answer}</Markdown>
                  </div>
                </details>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-5">
          {content.mcqs?.length ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpenCheck className="size-4 text-primary" />
                  Quick MCQs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {content.mcqs.map((mcq, index) => (
                  <details
                    key={`${mcq.question}-${index}`}
                    className="rounded-xl border border-border/70 p-4 [&_summary]:cursor-pointer"
                  >
                    <summary className="text-[13.5px] font-medium marker:content-none">
                      {index + 1}. {mcq.question}
                    </summary>
                    <ul className="mt-3 space-y-1.5 text-[13px]">
                      {mcq.options.map((option) => (
                        <li
                          key={option}
                          className={
                            option === mcq.correctAnswer
                              ? "rounded-lg bg-success/[0.08] px-3 py-2 font-medium"
                              : "rounded-lg px-3 py-2 text-muted-foreground"
                          }
                        >
                          {option}
                        </li>
                      ))}
                    </ul>
                    {mcq.explanation ? (
                      <p className="mt-2 text-[12.5px] text-muted-foreground">{mcq.explanation}</p>
                    ) : null}
                  </details>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {content.mockTestBlueprint?.length ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Mock test blueprint</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {content.mockTestBlueprint.map((section) => (
                  <div key={section.section} className="rounded-xl border border-border/70 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-medium">{section.section}</p>
                      <span className="text-[11.5px] text-muted-foreground">
                        {section.questionCount} Q · {section.marks} marks
                      </span>
                    </div>
                    {section.guidance ? (
                      <p className="mt-1 text-[12px] text-muted-foreground">{section.guidance}</p>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {content.examDayTips?.length ? (
        <Card className="border-primary/25 bg-primary/[0.04]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Exam day tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-[13px] text-muted-foreground">
              {content.examDayTips.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2 pb-2">
        <Button asChild variant="gradient">
          <Link href={`/quiz?subject=${encodeURIComponent(plan.subject)}`}>Test myself</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/tutorials?subject=${encodeURIComponent(plan.subject)}`}>Study a topic</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/exam-prep">All plans</Link>
        </Button>
      </div>
    </div>
  );
}
