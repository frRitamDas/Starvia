import type { Metadata } from "next";
import Link from "next/link";
import { Award, Flame, Sparkles, Zap } from "lucide-react";

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
      <div className="space-y-1">
        <h1 className="font-display text-xl font-semibold sm:text-2xl">Your profile</h1>
        <p className="text-sm text-muted-foreground">
          Keep these details current — they decide how Starvia explains things to you.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <AvatarUploader name={profile.full_name ?? "Student"} avatarUrl={profile.avatar_url} />
            </CardContent>
          </Card>

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
                At a glance
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
