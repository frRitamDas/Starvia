import type { Metadata } from "next";
import Link from "next/link";
import { Award, BookOpenCheck, ChevronRight, Flame, Sparkles, Trophy, Zap } from "lucide-react";

import { AvatarUploader, SettingsCard, SignOutButton } from "@/components/learn/account-panels";
import { ProfileForm } from "@/components/learn/profile-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BOARDS } from "@/lib/curriculum";
import { getSubscription } from "@/lib/payments/service";
import { PLANS, levelFromXp } from "@/lib/plans";
import { requireOnboarded } from "@/lib/session";
import { formatDate, formatMinutes } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your profile",
  description: "Edit your class, board, subjects and learning preferences.",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const context = await requireOnboarded();
  const subscription = await getSubscription(context);
  const profile = context.profile;
  const level = levelFromXp(profile.xp ?? 0);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/.11),transparent_42%)]" aria-hidden />
        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              <AvatarUploader name={profile.full_name ?? "Student"} avatarUrl={profile.avatar_url} />
              <div className="min-w-0">
                <h1 className="truncate font-display text-2xl font-semibold tracking-tight">
                  {profile.full_name ?? "Student"}
                </h1>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {profile.email ?? "Student account"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="secondary">Class {profile.class_level ?? "—"}</Badge>
                  <Badge variant="outline">
                    {BOARDS.find((board) => board.id === profile.board)?.name ?? "Board not set"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/progress"><Trophy className="size-3.5" /> Progress</Link>
              </Button>
              <Button asChild size="sm" variant="gradient">
                <Link href="/tutor"><Sparkles className="size-3.5" /> Ask Starvia</Link>
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
              <p className="text-[11px] text-muted-foreground">Class</p>
              <p className="mt-1 text-sm font-semibold">{profile.class_level ?? "—"}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
              <p className="text-[11px] text-muted-foreground">Board</p>
              <p className="mt-1 truncate text-sm font-semibold">{BOARDS.find((board) => board.id === profile.board)?.name ?? "—"}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
              <p className="text-[11px] text-muted-foreground">Streak</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold"><Flame className="size-3.5 text-orange-500" /> {profile.streak_count}d</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
              <p className="text-[11px] text-muted-foreground">Level</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold"><Zap className="size-3.5 text-primary" /> {level.level}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">

          <ProfileForm
            mode="profile"
            boards={[...BOARDS]}
            initial={{
              full_name: profile.full_name ?? "",
              class_level: profile.class_level ?? "10",
              board: profile.board ?? "cbse",
              subjects: profile.subjects ?? [],
              learning_level: profile.learning_level ?? "average",
              exam_target: profile.exam_target ?? "",
            }}
          />
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="size-4 text-primary" />
                Learning snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Class {profile.class_level ?? "—"}</Badge>
                <Badge variant="outline">
                  {BOARDS.find((board) => board.id === profile.board)?.name ?? "—"}
                </Badge>
                <Badge variant="gradient">{PLANS[context.plan].name}</Badge>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Zap className="size-3.5 text-primary" />
                    Level {level.level}
                  </span>
                  <span className="text-muted-foreground">
                    {level.xpIntoLevel}/{level.xpForNextLevel} XP
                  </span>
                </div>
                <Progress value={level.progress} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-[12.5px]">
                <div className="rounded-xl border border-border/70 p-3">
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Flame className="size-3.5 text-orange-500" />
                    Streak
                  </p>
                  <p className="mt-1 font-semibold">{profile.streak_count} days</p>
                </div>
                <div className="rounded-xl border border-border/70 p-3">
                  <p className="text-muted-foreground">Study time</p>
                  <p className="mt-1 font-semibold">{formatMinutes(profile.study_minutes)}</p>
                </div>
                <div className="rounded-xl border border-border/70 p-3">
                  <p className="text-muted-foreground">Total XP</p>
                  <p className="mt-1 font-semibold">{profile.xp}</p>
                </div>
                <div className="rounded-xl border border-border/70 p-3">
                  <p className="text-muted-foreground">Member since</p>
                  <p className="mt-1 font-semibold">{formatDate(profile.created_at)}</p>
                </div>
              </div>

              {subscription?.current_period_end && context.plan !== "free" ? (
                <p className="rounded-xl border border-primary/25 bg-primary/[0.05] p-3 text-[12px] text-muted-foreground">
                  {PLANS[context.plan].name} renews on {formatDate(subscription.current_period_end)}.
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/progress">See full progress</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/upgrade">
                    <Sparkles className="size-3.5" />
                    Plans
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Study shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Keep learning", text: "Create a tutorial for your next topic.", href: "/tutorials", icon: BookOpenCheck },
                { label: "Practise", text: "Turn today's lesson into a quick quiz.", href: "/quiz", icon: Sparkles },
                { label: "Review progress", text: "See weak topics and study rhythm.", href: "/progress", icon: Trophy },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-xl border border-border/70 bg-background/50 p-3 transition-colors hover:bg-accent/50"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold">{item.label}</p>
                    <p className="truncate text-[11.5px] text-muted-foreground">{item.text}</p>
                  </div>
                  <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </CardContent>
          </Card>

          <div id="settings" className="scroll-mt-24">
            <SettingsCard
              email={profile.email}
              planName={PLANS[context.plan].name}
              dangerZone
            />
          </div>

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
              <p className="text-[12.5px] text-muted-foreground">
                Signed in as {profile.full_name ?? profile.email ?? "Student"}
              </p>
              <SignOutButton />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
