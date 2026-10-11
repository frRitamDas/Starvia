import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Flame,
  GraduationCap,
  Layers3,
  Sparkles,
  Target,
} from "lucide-react";

import { requireOnboarded } from "@/lib/session";
import { getDashboardSnapshot } from "@/lib/data/dashboard";
import { formatMinutes, formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Study workspace · Starvia",
  description: "A focused, personal workspace for your next study session.",
  robots: { index: false, follow: false },
};

const actions = [
  { href: "/tutor", label: "Ask your tutor", detail: "Understand a difficult concept", icon: BrainCircuit, accent: "from-sky-500/20 to-blue-500/5" },
  { href: "/tutorials", label: "Learn a topic", detail: "Build a guided lesson", icon: BookOpen, accent: "from-violet-500/20 to-indigo-500/5" },
  { href: "/quiz", label: "Practice questions", detail: "Check what you remember", icon: Target, accent: "from-emerald-500/20 to-teal-500/5" },
  { href: "/flashcards", label: "Quick revision", detail: "Recall the essentials", icon: Layers3, accent: "from-amber-500/20 to-orange-500/5" },
];

export default async function WorkspacePage() {
  const context = await requireOnboarded();
  const snapshot = await getDashboardSnapshot(context);
  const name = context.profile.full_name?.trim().split(/\s+/)[0] || "there";
  const todayPercent = Math.min(100, Math.round((snapshot.todayMinutes / 45) * 100));
  const focus = snapshot.continueTutorial
    ? { title: snapshot.continueTutorial.title, detail: "Pick up where you left off", href: `/tutorials/${snapshot.continueTutorial.id}`, action: "Continue lesson" }
    : snapshot.weakTopics[0]
      ? { title: snapshot.weakTopics[0].topic, detail: snapshot.weakTopics[0].reason, href: `/tutorials?topic=${encodeURIComponent(snapshot.weakTopics[0].topic)}`, action: "Revise this topic" }
      : { title: "Start with one question", detail: "A focused question is a great way to begin.", href: "/tutor", action: "Open AI tutor" };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-sky-400/20 bg-card">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.17),transparent_48%),radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.10),transparent_45%)]" />
        <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.4fr_0.6fr] lg:items-end lg:p-11">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-700 dark:text-sky-200">
              <Sparkles className="size-3.5" /> YOUR PERSONAL STUDY SPACE
            </div>
            <p className="mt-6 text-sm text-muted-foreground">A little progress, every day.</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">Welcome back, {name}.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Learn with purpose. Practise what matters. Keep your next step clear.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={focus.href} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                {focus.action} <ArrowUpRight className="size-4" />
              </Link>
              <Link href="/papers" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/70 px-5 py-3 text-sm font-semibold transition hover:bg-accent">
                Explore past papers
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Today’s study goal</p>
                <p className="mt-1 text-xs text-muted-foreground">45 minutes · at your pace</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-300"><GraduationCap className="size-5" /></div>
            </div>
            <div className="mt-6 flex items-end justify-between gap-3">
              <p className="text-3xl font-semibold tabular-nums">{formatMinutes(snapshot.todayMinutes)}</p>
              <p className="text-sm text-muted-foreground">{todayPercent}% of goal</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all" style={{ width: `${todayPercent}%` }} /></div>
            <p className="mt-3 text-xs text-muted-foreground">{todayPercent >= 100 ? "Daily goal complete. Excellent work." : `${Math.max(0, 45 - snapshot.todayMinutes)} minutes to reach your daily goal.`}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Study time", value: formatMinutes(snapshot.studyMinutes), icon: Clock3, note: "Total tracked" },
          { label: "Current streak", value: `${snapshot.streak} days`, icon: Flame, note: "Keep showing up" },
          { label: "Lessons completed", value: String(snapshot.completedToday), icon: CheckCircle2, note: "Today" },
          { label: "Quiz attempts", value: String(snapshot.attempts.length), icon: Target, note: "Recent activity" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground sm:text-sm">{item.label}</p>
              <item.icon className="size-4 text-sky-600 dark:text-sky-300" />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{item.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-300">Choose your next step</p><h2 className="mt-2 text-xl font-semibold sm:text-2xl">Make this session count</h2></div>
          <span className="hidden text-xs text-muted-foreground sm:block">Built around your study flow</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map((action) => (
            <Link key={action.href} href={action.href} className="group flex min-h-32 items-center gap-4 rounded-2xl border border-border/70 bg-card p-5 transition duration-200 hover:-translate-y-0.5 hover:border-sky-400/40 hover:shadow-lg hover:shadow-sky-950/5 sm:p-6">
              <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${action.accent}`}><action.icon className="size-5" /></div>
              <div className="min-w-0 flex-1"><h3 className="font-semibold">{action.label}</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">{action.detail}</p></div>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Recommended focus</p><h2 className="mt-2 text-lg font-semibold">{focus.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{focus.detail}</p></div><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500"><Target className="size-5" /></div></div>
          <Link href={focus.href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300">{focus.action} <ArrowUpRight className="size-4" /></Link>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Continue learning</p><h2 className="mt-2 text-lg font-semibold">Your recent lessons</h2></div><BookOpen className="size-5 text-sky-600 dark:text-sky-300" /></div>
          {snapshot.tutorials.length ? <div className="mt-4 space-y-2">{snapshot.tutorials.slice(0, 3).map((lesson) => <Link key={lesson.id} href={`/tutorials/${lesson.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3.5 py-3 transition hover:bg-accent/50"><div className="min-w-0"><p className="truncate text-sm font-medium">{lesson.title}</p><p className="mt-1 text-xs text-muted-foreground">{lesson.subject} · {formatRelativeTime(lesson.updated_at)}</p></div><ArrowUpRight className="size-4 shrink-0 text-muted-foreground" /></Link>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm leading-6 text-muted-foreground">Your lessons will appear here after you create your first one. Start with a topic you want to understand better.</p>}
        </div>
      </section>
      <p className="text-center text-xs text-muted-foreground">Your workspace · {context.profile.board} · Class {context.profile.class_level} · {context.plan === "free" ? "Starter plan" : context.plan === "pro" ? "Pro plan" : "Ultra plan"}</p>
    </main>
  );
}
