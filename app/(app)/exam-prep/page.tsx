import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Target } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { ExamPrepGenerator } from "@/components/learn/exam-prep-generator";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listExamPlans, listStudyProgress } from "@/lib/data/progress";
import { requireOnboarded } from "@/lib/session";
import { getUsageSummary } from "@/lib/usage";
import { subjectsForClass } from "@/lib/curriculum";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Exam preparation",
  description: "Day-wise revision plans, important topics, practice sets and mock test blueprints.",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  learning: "Learning",
  practiced: "Practised",
  mastered: "Mastered",
};

const STATUS_VARIANT: Record<string, "secondary" | "warning" | "default" | "success"> = {
  not_started: "secondary",
  learning: "warning",
  practiced: "default",
  mastered: "success",
};

export default async function ExamPrepPage() {
  const context = await requireOnboarded();

  const [plans, topics, usage] = await Promise.all([
    listExamPlans(context),
    listStudyProgress(context, 200),
    getUsageSummary(context),
  ]);

  const subjects = context.profile.subjects?.length
    ? context.profile.subjects
    : subjectsForClass(context.profile.class_level ?? "10");

  const topicStats = ["not_started", "learning", "practiced", "mastered"].map((status) => ({
    status,
    count: topics.filter((topic) => topic.status === status).length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plan & revise"
        icon={CalendarClock}
        title="Exam preparation"
        description="Tell Starvia your exam type and how many days you have — get a plan weighted toward what actually carries marks."
      />

      <ExamPrepGenerator
        defaultClass={context.profile.class_level ?? "10"}
        defaultBoard={context.profile.board ?? "CBSE"}
        defaultSubjects={subjects}
        advanced={context.capabilities.advancedExamPrep}
        remaining={usage.usage.exam_prep.remaining}
        limit={usage.usage.exam_prep.limit}
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-primary" />
              Saved plans
              <Badge variant="secondary" className="ml-auto">
                {plans.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {plans.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No revision plans yet"
                description="Generate one above — it stays saved so you can tick topics off as you go."
                className="border-none bg-transparent py-6"
              />
            ) : (
              plans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/exam-prep/${plan.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3.5 py-3 transition-colors hover:border-primary/35 hover:bg-accent/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium">{plan.title}</p>
                    <p className="truncate text-[11.5px] text-muted-foreground">
                      {plan.subject} · {plan.planned_days} days · {formatDate(plan.created_at)}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {plan.exam_type.replace("_", " ")}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-primary" />
              Topic tracker
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {topicStats.map((stat) => (
                <div key={stat.status} className="rounded-xl border border-border/70 p-3">
                  <p className="font-display text-lg font-semibold">{stat.count}</p>
                  <p className="text-[11.5px] text-muted-foreground">{STATUS_LABEL[stat.status]}</p>
                </div>
              ))}
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {topics.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  Topics appear here as you study — mark them from any revision plan.
                </p>
              ) : (
                topics.slice(0, 20).map((topic) => (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium">{topic.topic}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{topic.subject}</p>
                    </div>
                    <Badge variant={STATUS_VARIANT[topic.status] ?? "secondary"} className="shrink-0">
                      {STATUS_LABEL[topic.status]}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
