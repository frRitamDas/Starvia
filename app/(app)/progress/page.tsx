import type { Metadata } from "next";
import Link from "next/link";
import { Award, BarChart3, BookOpenCheck, Clock, Flame, Target, TrendingUp, Zap } from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { BarChart, ProgressRing, Sparkline } from "@/components/learn/stat-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { listStudyProgress } from "@/lib/data/progress";
import { listAttempts } from "@/lib/data/quizzes";
import { listTutorials } from "@/lib/data/tutorials";
import { getAchievementStats } from "@/lib/data/stats";
import { ACHIEVEMENTS } from "@/lib/gamification";
import { requireOnboarded } from "@/lib/session";
import { levelFromXp } from "@/lib/plans";
import { formatMinutes, formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Progress",
  description: "Your study statistics: accuracy, topics mastered, learning time and streaks.",
  robots: { index: false, follow: false },
};

export default async function ProgressPage() {
  const context = await requireOnboarded();

  const [topics, attempts, tutorials, stats] = await Promise.all([
    listStudyProgress(context, 300),
    listAttempts(context, 30),
    listTutorials(context, { limit: 100 }),
    getAchievementStats(context),
  ]);

  const level = levelFromXp(stats.xp);
  const accuracy =
    attempts.length > 0
      ? Math.round(attempts.reduce((sum, attempt) => sum + Number(attempt.percentage), 0) / attempts.length)
      : 0;

  const attemptsChronological = [...attempts].reverse();
  const scoreSeries = attemptsChronological.map((attempt) => Number(attempt.percentage));
  const scoreBars = attemptsChronological.slice(-6).map((attempt, index) => ({
    label: `#${Math.max(1, attempts.length - Math.min(5, attempts.length) + index)}`,
    value: Math.round(Number(attempt.percentage)),
    suffix: "%",
  }));

  const bySubject = topics.reduce<Record<string, { total: number; mastered: number; minutes: number }>>(
    (accumulator, topic) => {
      accumulator[topic.subject] = accumulator[topic.subject] ?? { total: 0, mastered: 0, minutes: 0 };
      accumulator[topic.subject]!.total += 1;
      if (topic.status === "mastered") accumulator[topic.subject]!.mastered += 1;
      accumulator[topic.subject]!.minutes += topic.minutes_spent ?? 0;
      return accumulator;
    },
    {},
  );

  const weakSubjects = Object.entries(bySubject)
    .filter(([, value]) => value.total > 0 && value.mastered / value.total < 0.5)
    .sort((a, b) => a[1].mastered / a[1].total - b[1].mastered / b[1].total)
    .slice(0, 3);

  const achievementsEarned = stats.questionsAsked > 0 ? ACHIEVEMENTS.filter((a) => a.test(stats)) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        icon={BarChart3}
        title="Your progress"
        description="Everything here is private to your account. Streaks and study time are measured in IST."
      />

      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: BookOpenCheck, label: "Tutorials completed", value: stats.tutorialsCompleted },
          { icon: Zap, label: "Questions asked", value: stats.questionsAsked },
          { icon: BarChart3, label: "Quiz attempts", value: stats.quizzesCompleted },
          { icon: Target, label: "Topics mastered", value: stats.topicsMastered },
        ].map((stat) => (
          <Card key={stat.label} className="p-5">
            <stat.icon className="size-4 text-primary" />
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight">{stat.value}</p>
            <p className="text-[12px] text-muted-foreground">{stat.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" />
              Quiz accuracy
            </CardTitle>
            {attempts.length > 1 ? (
              <Badge variant={accuracy >= 75 ? "success" : accuracy >= 50 ? "warning" : "destructive"}>
                Average {accuracy}%
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No quiz data yet"
                description="Take a quiz and your accuracy trend will appear here."
                action={{ label: "Generate a quiz", href: "/quiz" }}
                className="border-none bg-transparent py-6"
              />
            ) : (
              <BarChart data={scoreBars} valueSuffix="%" />
            )}
            {scoreSeries.length > 2 ? (
              <div className="mt-4 border-t border-border/70 pt-3">
                <p className="text-[11.5px] text-muted-foreground">Trend across all attempts</p>
                <Sparkline data={scoreSeries} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Level & streak</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <ProgressRing
              value={level.progress}
              label={`Level ${level.level}`}
              sublabel={`${level.xpIntoLevel}/${level.xpForNextLevel} XP`}
            />
            <div className="w-full space-y-2.5">
              <div className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Flame className="size-3.5 text-orange-500" />
                  Current streak
                </span>
                <span className="font-medium">{stats.streak} days</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Award className="size-3.5 text-primary" />
                  Longest streak
                </span>
                <span className="font-medium">{stats.longestStreak} days</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="size-3.5 text-primary" />
                  Total study time
                </span>
                <span className="font-medium">{formatMinutes(stats.studyMinutes)}</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">Best quiz score</span>
                <span className="font-medium">{Math.round(stats.bestQuizPercentage)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Subject mastery */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Subject mastery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(bySubject).length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Study a topic and it will be tracked here automatically.
              </p>
            ) : (
              Object.entries(bySubject).map(([subject, value]) => {
                const percent = Math.round((value.mastered / value.total) * 100);
                return (
                  <div key={subject} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-medium">{subject}</span>
                      <span className="text-muted-foreground">
                        {value.mastered}/{value.total} mastered · {formatMinutes(value.minutes)}
                      </span>
                    </div>
                    <Progress value={percent} />
                  </div>
                );
              })
            )}

            {weakSubjects.length > 0 ? (
              <div className="rounded-xl border border-warning/30 bg-warning/[0.05] p-3.5">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Needs attention
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {weakSubjects.map(([subject]) => (
                    <Button key={subject} asChild size="sm" variant="outline">
                      <Link href={`/tutorials?subject=${encodeURIComponent(subject)}`}>{subject}</Link>
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="size-4 text-primary" />
              Achievements
              <Badge variant="secondary" className="ml-auto">
                {achievementsEarned.length}/{ACHIEVEMENTS.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2.5 sm:grid-cols-2">
            {ACHIEVEMENTS.map((achievement) => {
              const earned = achievementsEarned.some((item) => item.code === achievement.code);
              return (
                <div
                  key={achievement.code}
                  className={
                    earned
                      ? "rounded-xl border border-primary/30 bg-primary/[0.05] p-3.5"
                      : "rounded-xl border border-border/60 p-3.5 opacity-70"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12.5px] font-semibold">{achievement.title}</p>
                    {earned ? <Badge variant="success">Unlocked</Badge> : null}
                  </div>
                  <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
                    {achievement.description}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {[...tutorials, ...attempts].length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Your study history will show up here.</p>
          ) : (
            <>
              {tutorials.slice(0, 5).map((tutorial) => (
                <div
                  key={tutorial.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{tutorial.title}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      Tutorial · {formatRelativeTime(tutorial.created_at)}
                    </p>
                  </div>
                  <Badge variant={tutorial.completed ? "success" : "secondary"}>
                    {tutorial.completed ? "Completed" : "In progress"}
                  </Badge>
                </div>
              ))}
              {attempts.slice(0, 5).map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">
                      Quiz · {attempt.score}/{attempt.total} correct
                    </p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {formatRelativeTime(attempt.created_at)}
                      {attempt.duration_seconds
                        ? ` · ${Math.round(attempt.duration_seconds / 60)} min`
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
                  >
                    {Math.round(attempt.percentage)}%
                  </Badge>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 pb-2">
        <Button asChild variant="gradient">
          <Link href="/tutor">Ask the AI tutor</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/quiz">Take another quiz</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/flashcards">Revise flashcards</Link>
        </Button>
      </div>
    </div>
  );
}
