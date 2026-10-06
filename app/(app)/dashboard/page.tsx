import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  ClipboardList,
  Flame,
  Layers,
  Play,
  ScanLine,
  Sparkles,
  CirclePlay,
  Target,
  Timer,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getDashboardSnapshot } from "@/lib/data/dashboard";
import { requireOnboarded } from "@/lib/session";
import { AI_FEATURES, FEATURE_LABELS, type AiFeature } from "@/lib/plans";
import { cn, formatMinutes, formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your Starvia study dashboard — today's progress, streaks and recommended topics.",
  robots: { index: false, follow: false },
};

const QUICK_ACTIONS = [
  { title: "Ask AI", description: "Clear a doubt", href: "/tutor", icon: Sparkles },
  { title: "Create tutorial", description: "Learn a topic", href: "/tutorials", icon: BookOpenCheck },
  { title: "Generate quiz", description: "Test yourself", href: "/quiz", icon: ClipboardList },
  { title: "Solve question", description: "Photo or text", href: "/solve", icon: ScanLine },
  { title: "Exam prep", description: "Revision plan", href: "/exam-prep", icon: CalendarClock },
  { title: "Flashcards", description: "Quick revision", href: "/flashcards", icon: Layers },
] as const;

const DAILY_GOAL_MINUTES = 45;

export default async function DashboardPage() {
  const context = await requireOnboarded();
  const snapshot = await getDashboardSnapshot(context);
  const profile = context.profile;

  const todayPercent = Math.min(
    100,
    Math.round((snapshot.todayMinutes / DAILY_GOAL_MINUTES) * 100),
  );

  const greeting = (() => {
    const hour = Number(
      new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(
        new Date(),
      ),
    );
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  const usageFeatures: AiFeature[] = ["tutor", "tutorial", "quiz", "image"];

  const focus = snapshot.continueTutorial
    ? {
        title: `Continue ${snapshot.continueTutorial.title}`,
        description: `${snapshot.continueTutorial.subject} · pick up exactly where you stopped.`,
        href: `/tutorials/${snapshot.continueTutorial.id}`,
        label: "Resume lesson",
      }
    : snapshot.weakTopics[0]
      ? {
          title: `Fix ${snapshot.weakTopics[0].topic}`,
          description: snapshot.weakTopics[0].reason,
          href: `/tutorials?topic=${encodeURIComponent(snapshot.weakTopics[0].topic)}`,
          label: "Revise now",
        }
      : {
          title: "Start a focused AI session",
          description: "Ask one question, practise it, and let Starvia decide the next useful step.",
          href: "/tutor",
          label: "Ask Starvia",
        };

  return (
    <div className="space-y-6">
      {/* Today at Starvia */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
        <Card className="ambient-study-shell overflow-hidden border-primary/20">
          <CardContent className="relative p-5 sm:p-6 lg:p-7">
            <div className="absolute -right-20 -top-24 size-56 rounded-full bg-blue-500/10 blur-3xl" aria-hidden />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1.5 border-primary/25 bg-primary/[0.05]">
                  <CirclePlay className="size-3.5 text-primary" />
                  Today&apos;s mission
                </Badge>
                <Badge variant="secondary" className="gap-1.5">
                  <Flame className="size-3.5 text-orange-500" />
                  ${snapshot.streak}-day streak
                </Badge>
              </div>
              <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
                    ${greeting}, ${snapshot.firstName} 👋
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {${profile?.board ? `${profile.board} · ` : ""}Class ${profile?.class_level ?? "—"} · ${profile?.subjects?.slice(0, 3).join(", ") ?? "Build your subject set"}}
                  </p>
                  <h2 className="mt-5 max-w-2xl text-lg font-semibold sm:text-xl">${focus.title}</h2>
                  <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-muted-foreground">${focus.description}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button asChild variant="gradient">
                      <Link href={focus.href}>${focus.label}<ArrowRight className="size-4" /></Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/tutor"><Sparkles className="size-4" />Ask Starvia</Link>
                    </Button>
                  </div>
                </div>
                <div className="grid w-full max-w-sm grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-border/70 bg-background/55 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Today</p>
                    <p className="mt-1 text-lg font-semibold">${formatMinutes(snapshot.todayMinutes)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/55 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Done</p>
                    <p className="mt-1 text-lg font-semibold">${snapshot.completedToday}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/55 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Level</p>
                    <p className="mt-1 text-lg font-semibold">${snapshot.level.level}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              Study League
              <Badge variant="secondary">{context.plan === "free" ? "Starter" : context.plan === "pro" ? "Pro" : "Ultra"}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-primary">Current tier</p>
                  <p className="mt-1 text-lg font-semibold">Level ${snapshot.level.level}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {${snapshot.level.xpForNextLevel > snapshot.level.xpIntoLevel
                      ? `${snapshot.level.xpForNextLevel - snapshot.level.xpIntoLevel} XP to your next level.`
                      : "Next level unlocked."}}
                  </p>
                </div>
                <Trophy className="size-5 text-primary" />
              </div>
              <Progress value={snapshot.level.progress} className="mt-4 h-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border/70 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Personal best</p>
                <p className="mt-1 text-base font-semibold">${profile?.longest_streak ?? 0} days</p>
              </div>
              <div className="rounded-xl border border-border/70 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Today&apos;s goal</p>
                <p className="mt-1 text-base font-semibold">${todayPercent}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group interactive-card rounded-2xl border border-border/70 bg-card p-3.5"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <action.icon className="size-4" />
            </div>
            <p className="mt-2.5 text-[13px] font-semibold">{action.title}</p>
            <p className="text-[11.5px] text-muted-foreground">{action.description}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Today's progress */}
        <Card className="interactive-card lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Today&apos;s learning</CardTitle>
            <Badge variant="outline" className="gap-1.5">
              <Timer className="size-3.5" />
              Goal {DAILY_GOAL_MINUTES}m
            </Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatMinutes(snapshot.todayMinutes)} studied today
                </span>
                <span className="font-medium">{todayPercent}%</span>
              </div>
              <Progress value={todayPercent} indicatorClassName="bg-brand-gradient" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Tutorials done", value: snapshot.completedToday },
                { label: "Total study time", value: formatMinutes(snapshot.studyMinutes) },
                { label: "Quiz attempts", value: snapshot.attempts.length },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border/70 bg-muted/25 p-3">
                  <p className="font-display text-lg font-semibold">{stat.value}</p>
                  <p className="text-[11.5px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Weekly streak dots */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Last 7 days</p>
              <div className="flex gap-2">
                {Array.from({ length: 7 }).map((_, index) => {
                  const daysAgo = 6 - index;
                  const active = daysAgo < Math.max(snapshot.streak, 1);
                  return (
                    <div
                      key={index}
                      className={cn(
                        "h-9 flex-1 rounded-lg border",
                        active
                          ? "border-primary/30 bg-primary/15"
                          : "border-border/70 bg-muted/40",
                      )}
                      title={active ? "Studied" : "No activity"}
                    />
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI usage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              AI usage today
              <Badge variant={context.plan === "free" ? "secondary" : "gradient"}>
                {context.plan === "free" ? "Starter" : context.plan === "pro" ? "Pro" : "Ultra"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {usageFeatures.map((feature) => {
              const row = snapshot.usage.usage[feature];
              const limit = row.limit || 1;
              const percent = Math.min(100, Math.round((row.used / limit) * 100));
              const exhausted = row.remaining <= 0;
              return (
                <div key={feature} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-muted-foreground">{FEATURE_LABELS[feature]}</span>
                    <span className={cn("font-medium", exhausted && "text-destructive")}>
                      {row.used}/{row.limit}
                    </span>
                  </div>
                  <Progress
                    value={percent}
                    className="h-1.5"
                    indicatorClassName={exhausted ? "bg-destructive" : undefined}
                  />
                </div>
              );
            })}

            {context.plan === "free" ? (
              <Button asChild size="sm" variant="gradient" className="w-full">
                <Link href="/upgrade">
                  <Sparkles className="size-4" />
                  Get more daily AI
                </Link>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Limits reset at midnight IST. Managed on the server, so they can&apos;t be bypassed.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Continue learning */}
      {snapshot.continueTutorial ? (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <Badge variant="outline" className="gap-1.5">
                <Play className="size-3" />
                Continue learning
              </Badge>
              <p className="font-display text-[15px] font-semibold">
                {snapshot.continueTutorial.title}
              </p>
              <p className="text-[13px] text-muted-foreground">
                {snapshot.continueTutorial.subject}
                {snapshot.continueTutorial.chapter ? ` · ${snapshot.continueTutorial.chapter}` : ""} ·
                opened {formatRelativeTime(snapshot.continueTutorial.updated_at)}
              </p>
            </div>
            <Button asChild variant="gradient">
              <Link href={`/tutorials/${snapshot.continueTutorial.id}`}>
                Resume
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Recent tutorials */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Recent tutorials</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/tutorials">
                All <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {snapshot.tutorials.length === 0 ? (
              <EmptyState
                icon={BookOpenCheck}
                title="No tutorials yet"
                description="Generate your first tutorial and it will appear here with your progress."
                action={{ label: "Create a tutorial", href: "/tutorials" }}
                className="border-none bg-transparent py-6"
              />
            ) : (
              snapshot.tutorials.slice(0, 4).map((tutorial) => (
                <Link
                  key={tutorial.id}
                  href={`/tutorials/${tutorial.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3.5 py-3 transition-colors hover:border-primary/35 hover:bg-accent/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium">{tutorial.title}</p>
                    <p className="truncate text-[11.5px] text-muted-foreground">
                      {tutorial.subject} · {formatRelativeTime(tutorial.created_at)}
                    </p>
                  </div>
                  {tutorial.completed ? (
                    <Badge variant="success" className="shrink-0">
                      Done
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">
                      In progress
                    </Badge>
                  )}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent quizzes */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Recent quizzes</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/quiz">
                All <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {snapshot.attempts.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No quiz attempts yet"
                description="Take a quiz to see your score, explanations and weak topics here."
                action={{ label: "Generate a quiz", href: "/quiz" }}
                className="border-none bg-transparent py-6"
              />
            ) : (
              snapshot.attempts.slice(0, 4).map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium">
                      {snapshot.quizzes.find((quiz) => quiz.id === attempt.quiz_id)?.title ??
                        "Quiz attempt"}
                    </p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {attempt.score}/{attempt.total} · {formatRelativeTime(attempt.created_at)}
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

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Weak topics */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-destructive" />
              Topics to fix next
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {snapshot.weakTopics.length === 0 ? (
              <EmptyState
                icon={Target}
                title="Nothing flagged yet"
                description="Once you take quizzes, Starvia highlights the topics that need another pass."
                action={{ label: "Take a quiz", href: "/quiz" }}
                className="border-none bg-transparent py-6"
              />
            ) : (
              snapshot.weakTopics.map((topic) => (
                <div
                  key={topic.topic}
                  className="flex flex-col gap-2 rounded-xl border border-border/70 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium">{topic.topic}</p>
                    <p className="text-[11.5px] text-muted-foreground">{topic.reason}</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="shrink-0">
                    <Link href={`/tutorials?topic=${encodeURIComponent(topic.topic)}`}>Revise</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="size-4 text-primary" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {snapshot.achievements.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Study to unlock badges — your first one arrives after your first question.
              </p>
            ) : (
              snapshot.achievements.slice(0, 4).map((achievement) => (
                <div key={achievement.code} className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Award className="size-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium">{achievement.title}</p>
                    <p className="text-[11.5px] text-muted-foreground">{achievement.description}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommended */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4 text-primary" />
            Recommended for you
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {snapshot.recommended.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Finish a tutorial or quiz and Starvia will start recommending what to study next.
            </p>
          ) : (
            snapshot.recommended.map((item) => (
              <div key={`${item.subject}-${item.topic}`} className="rounded-xl border border-border/70 p-4">
                <p className="text-[11.5px] uppercase tracking-wide text-muted-foreground">
                  {item.subject}
                </p>
                <p className="mt-1 text-[13.5px] font-semibold">{item.topic}</p>
                <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">{item.reason}</p>
                <div className="mt-3 flex gap-2">
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                    <Link
                      href={`/tutorials?subject=${encodeURIComponent(item.subject)}&topic=${encodeURIComponent(item.topic)}`}
                    >
                      Tutorial
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
                    <Link
                      href={`/quiz?subject=${encodeURIComponent(item.subject)}&topic=${encodeURIComponent(item.topic)}`}
                    >
                      Quiz
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <p className="pb-2 text-center text-[11px] text-muted-foreground">
        Showing {usageFeatures.length} of {AI_FEATURES.length} tracked AI features · limits reset at
        midnight IST
      </p>
    </div>
  );
}
