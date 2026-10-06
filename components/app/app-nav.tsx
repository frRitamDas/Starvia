"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  FileText,
  CalendarCheck2,
  ClipboardList,
  LayoutDashboard,
  Layers,
  Loader2,
  Menu,
  ScanLine,
  Settings2,
  Sparkles,
  UserRound,
} from "lucide-react";

import { StarviaLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { PlanId } from "@/lib/plans";
import { initialsOf } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * App navigation. Desktop = sidebar, mobile = bottom tab bar (thumb friendly)
 * plus a sheet for the full list.
 */

export interface NavItem {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  /** Shown in the mobile bottom bar. */
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, primary: true },
  { title: "AI Tutor", href: "/tutor", icon: Sparkles, primary: true },
  { title: "Tutorials", href: "/tutorials", icon: BookOpenCheck, primary: true },
  { title: "Quizzes", href: "/quiz", icon: ClipboardList, primary: true },
  { title: "Solve a question", href: "/solve", icon: ScanLine },
  { title: "Past papers", href: "/papers", icon: FileText },
  { title: "Exam prep", href: "/exam-prep", icon: CalendarClock },
  { title: "Flashcards", href: "/flashcards", icon: Layers },
  { title: "Progress", href: "/progress", icon: BarChart3, primary: true },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ footer }: { footer?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border/70 bg-card/40 lg:flex lg:flex-col">
      <div className="flex h-16 items-center px-5">
        <StarviaLogo />
      </div>
      <nav aria-label="Study navigation" className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:translate-x-0.5 hover:bg-accent/60 hover:text-foreground",
              isActive(pathname, item.href) && "bg-accent/70 text-foreground shadow-sm",
            )}
          >
            <span className={cn("absolute left-0 h-5 w-0.5 rounded-full bg-primary opacity-0 transition-opacity", isActive(pathname, item.href) && "opacity-100")} />
            <item.icon className="size-4 transition-transform duration-200 group-hover:scale-105" />
            {item.title}
          </Link>
        ))}
      </nav>
      {footer ? <div className="border-t border-border/70 p-3">{footer}</div> : null}
    </aside>
  );
}

export function MobileTopBar({
  name,
  email,
  avatarUrl,
  plan,
  streak,
  xp,
  level,
  levelProgress,
  actions,
}: {
  name: string;
  email: string | null;
  avatarUrl: string | null;
  plan: PlanId;
  streak: number;
  xp: number;
  level: number;
  levelProgress: number;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [keyboardOpen, setKeyboardOpen] = React.useState(false);
  const [usage, setUsage] = React.useState<{
    tutor: { used: number; limit: number; remaining: number };
    tutorial: { used: number; limit: number; remaining: number };
    quiz: { used: number; limit: number; remaining: number };
    image: { used: number; limit: number; remaining: number };
  } | null>(null);
  const [usageLoading, setUsageLoading] = React.useState(false);

  React.useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      setKeyboardOpen(viewport.height < window.innerHeight - 120);
    };
    update();
    viewport.addEventListener("resize", update);
    return () => viewport.removeEventListener("resize", update);
  }, []);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!open || usage || usageLoading) return;

    let cancelled = false;
    setUsageLoading(true);

    fetch("/api/usage", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || !payload?.ok || !payload.data?.usage) return;
        setUsage(payload.data.usage);
      })
      .catch(() => {
        // Drawer remains usable if the live quota endpoint is unavailable.
      })
      .finally(() => {
        if (!cancelled) setUsageLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, usage, usageLoading]);

  const planLabel = plan === "free" ? "Starter · Free" : plan === "pro" ? "Pro" : "Ultra";

  return (
    <header
      data-mobile-topbar
      className={cn(
        "glass fixed inset-x-0 top-0 z-40 flex h-[var(--starvia-mobile-topbar)] items-center justify-between gap-2 border-b px-3 pt-[env(safe-area-inset-top)] transition-transform duration-200 lg:hidden",
        keyboardOpen && "pointer-events-none -translate-y-full opacity-0",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Open Starvia menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="flex w-[min(90vw,360px)] max-w-[360px] flex-col overflow-hidden border-border bg-card p-0"
          >
            <SheetHeader className="border-b border-border/70 px-5 pb-4 pt-12">
              <div className="flex items-center gap-3">
                <Avatar className="size-11">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                  <AvatarFallback>{initialsOf(name) || "S"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="truncate text-left text-base">{name}</SheetTitle>
                  <p className="truncate text-xs text-muted-foreground">{email ?? "Student account"}</p>
                  <Badge variant={plan === "free" ? "secondary" : "gradient"} className="mt-1.5">
                    {planLabel}
                  </Badge>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Study status</p>
                    <p className="mt-1 text-lg font-semibold">Level {level}</p>
                  </div>
                  <div className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-xs font-medium">{xp} XP</div>
                </div>
                <Progress value={levelProgress} className="mt-3 h-1.5" />
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Daily streak</span>
                  <span className="font-medium text-foreground">🔥 {streak} day{streak === 1 ? "" : "s"}</span>
                </div>
              </div>

            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">AI usage</p>
                  <p className="mt-1 text-sm font-semibold">Today's allowance</p>
                </div>
                {usageLoading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
              </div>
              {usage ? (
                <div className="mt-3 space-y-2.5">
                  {([["Tutor", usage.tutor], ["Tutorials", usage.tutorial], ["Quizzes", usage.quiz], ["Photo solver", usage.image]] as const).map(([label, row]) => {
                    const unlimited = row.limit >= 9007199254740000;
                    const percent = unlimited ? 4 : Math.min(100, Math.round((row.used / Math.max(1, row.limit)) * 100));
                    return (
                      <div key={label} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{unlimited ? "∞" : row.remaining + "/" + row.limit}</span>
                        </div>
                        <Progress value={percent} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Usage loads when you open the menu. Your study tools remain available while it refreshes.
                </p>
              )}
            </div>
              <div className="mt-5">
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Learn</p>
                <nav aria-label="Study navigation" className="mt-2 space-y-1">
                  {NAV_ITEMS.slice(0, 6).map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                          active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                        )}
                      >
                        <item.icon className="size-4" />
                        {item.title}
                        {active ? <span className="ml-auto size-1.5 rounded-full bg-primary" /> : null}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="mt-5">
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Practice</p>
                <nav className="mt-2 space-y-1">
                  {NAV_ITEMS.slice(6).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                        isActive(pathname, item.href) ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                      )}
                    >
                      <item.icon className="size-4" />
                      {item.title}
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-border/70 bg-background p-3 text-xs font-medium"
                >
                  <UserRound className="size-4 text-primary" />
                  <span className="mt-2 block">My profile</span>
                </Link>
                <Link
                  href="/profile#settings"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-border/70 bg-background p-3 text-xs font-medium"
                >
                  <Settings2 className="size-4 text-primary" />
                  <span className="mt-2 block">Settings</span>
                </Link>
              </div>
            </div>

            <div className="border-t border-border/70 bg-background/80 p-4 safe-bottom">
              {plan === "free" ? (
                <Button asChild variant="gradient" className="w-full" onClick={() => setOpen(false)}>
                  <Link href="/upgrade"><Sparkles className="size-4" /> Upgrade plan</Link>
                </Button>
              ) : (
                <Button asChild variant="outline" className="w-full" onClick={() => setOpen(false)}>
                  <Link href="/upgrade"><CalendarCheck2 className="size-4" /> Manage plan</Link>
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
        <StarviaLogo showText markSize={28} textClassName="text-base" />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {actions}
        <ThemeToggle />
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.primary);

  const [keyboardOpen, setKeyboardOpen] = React.useState(false);

  React.useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => setKeyboardOpen(viewport.height < window.innerHeight - 120);
    update();
    viewport.addEventListener("resize", update);
    return () => viewport.removeEventListener("resize", update);
  }, []);

  return (
    <nav
      data-mobile-bottomnav
      aria-label="Quick navigation"
      className={cn(
        "glass safe-bottom fixed inset-x-0 bottom-0 z-40 flex min-h-[var(--starvia-mobile-bottomnav)] items-stretch justify-around border-t px-1 pt-1 transition-transform duration-200 lg:hidden",
        keyboardOpen && "pointer-events-none translate-y-full opacity-0",
      )}
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10.5px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className={cn("size-5", active && "text-primary")} />
            <span className="truncate">{item.title.replace("AI ", "")}</span>
          </Link>
        );
      })}
    </nav>
  );
}
