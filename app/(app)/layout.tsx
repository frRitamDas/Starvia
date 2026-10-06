import Link from "next/link";
import { redirect } from "next/navigation";
import { Flame, Sparkles, Zap } from "lucide-react";

import { AppSidebar, MobileBottomNav, MobileTopBar } from "@/components/app/app-nav";
import { UserMenu } from "@/components/app/user-menu";
import { DemoBanner } from "@/components/app/demo-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getSessionContext } from "@/lib/session";
import { levelFromXp } from "@/lib/plans";
import { demoMode } from "@/lib/env";
import { cn } from "@/lib/utils";

/**
 * Protected study shell: sidebar on desktop, bottom navigation on mobile.
 * Session and entitlements are resolved server-side for every render.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await getSessionContext();

  if (!context.user && !context.demo) {
    redirect("/login");
  }

  const profile = context.profile;
  const name = profile?.full_name || context.user?.name || "Student";
  const xp = profile?.xp ?? 0;
  const level = levelFromXp(xp);
  const streak = profile?.streak_count ?? 0;
  const isDemo = demoMode();

  const planBadge = (
    <Badge variant={context.plan === "free" ? "secondary" : "gradient"} className="shrink-0">
      {context.plan === "free" ? "Starter" : context.plan === "pro" ? "Pro" : "Ultra"}
    </Badge>
  );

  const stats = (
    <div className="flex items-center gap-2">
      <div
        className="hidden items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-1 text-xs font-medium sm:inline-flex"
        title={`${streak} day streak`}
      >
        <Flame className={cn("size-3.5", streak > 0 ? "text-orange-500" : "text-muted-foreground")} />
        {streak}
      </div>
      <div
        className="hidden items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-1 text-xs font-medium sm:inline-flex"
        title={`${xp} XP · Level ${level.level}`}
      >
        <Zap className="size-3.5 text-primary" />
        Lv {level.level}
      </div>
      {planBadge}
    </div>
  );

  const sidebarFooter = (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/70 bg-card p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Level {level.level}</span>
          <span className="font-medium">
            {level.xpIntoLevel}/{level.xpForNextLevel} XP
          </span>
        </div>
        <Progress value={level.progress} className="mt-2 h-1.5" />
      </div>
      {context.plan === "free" ? (
        <Button asChild size="sm" variant="gradient" className="w-full">
          <Link href="/upgrade">
            <Sparkles className="size-4" />
            Upgrade plan
          </Link>
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-background">
      <AppSidebar footer={sidebarFooter} />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar
          actions={
            <UserMenu
              name={name}
              email={context.user?.email ?? null}
              avatarUrl={profile?.avatar_url ?? null}
              plan={context.plan}
              isAdmin={context.isAdmin}
              compact
            />
          }
        />

        <div className="hidden h-16 items-center justify-end gap-3 border-b border-border/70 px-6 lg:flex">
          {stats}
          <UserMenu
            name={name}
            email={context.user?.email ?? null}
            avatarUrl={profile?.avatar_url ?? null}
            plan={context.plan}
            isAdmin={context.isAdmin}
          />
        </div>

        <main
          id="main"
          className="min-w-0 flex-1 overflow-x-hidden px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+env(safe-area-inset-top))] sm:px-6 lg:pb-10 lg:pt-6"
        >
          <div className="mx-auto w-full max-w-6xl space-y-6">
            {isDemo ? <DemoBanner /> : null}
            {children}
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
