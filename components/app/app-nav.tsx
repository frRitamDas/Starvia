"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  Layers,
  Menu,
  MoreHorizontal,
  ScanLine,
  Search,
  Sparkles,
} from "lucide-react";

import { openCommandPalette } from "@/components/app/command-palette";
import { StarviaLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  { title: "Tutorials", href: "/tutorials", icon: BookOpenCheck },
  { title: "Quizzes", href: "/quiz", icon: ClipboardList, primary: true },
  { title: "Solve a question", href: "/solve", icon: ScanLine, primary: true },
  { title: "Exam prep", href: "/exam-prep", icon: CalendarClock },
  { title: "Flashcards", href: "/flashcards", icon: Layers },
  { title: "Progress", href: "/progress", icon: BarChart3 },
];

const NAV_GROUPS = [
  { label: "Workspace", items: NAV_ITEMS.slice(0, 1) },
  { label: "Learn", items: NAV_ITEMS.slice(1, 5) },
  { label: "Plan & revise", items: NAV_ITEMS.slice(5) },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ footer }: { footer?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-card/55 backdrop-blur-xl lg:flex lg:flex-col">
      <div className="flex h-16 items-center px-5">
        <StarviaLogo />
      </div>
      <button
        type="button"
        onClick={openCommandPalette}
        className="mx-3 mb-2 flex h-10 items-center gap-2.5 rounded-xl border border-border/70 bg-background/65 px-3 text-left text-xs text-muted-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-foreground"
      >
        <Search className="size-3.5" />
        <span className="flex-1">Quick search</span>
        <kbd className="rounded border border-border/70 bg-muted px-1.5 py-0.5 text-[9px]">⌘K</kbd>
      </button>
      <nav aria-label="Study navigation" className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/60 hover:text-foreground",
                    isActive(pathname, item.href) && "bg-primary/[0.09] text-primary shadow-[inset_3px_0_0_hsl(var(--primary))]",
                  )}
                >
                  <item.icon className="size-4 transition-transform group-hover:scale-105" />
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      {footer ? <div className="border-t border-border/70 p-3">{footer}</div> : null}
    </aside>
  );
}

export function MobileTopBar({ actions }: { actions?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b px-3 lg:hidden">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Open navigation">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[78%] max-w-[300px] p-4">
            <SheetHeader className="px-1">
              <SheetTitle>
                <StarviaLogo href={null} />
              </SheetTitle>
            </SheetHeader>
            <nav aria-label="Study navigation" className="mt-4 space-y-1">
              {NAV_ITEMS.map((item) => (
                <SheetClose asChild key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground",
                      isActive(pathname, item.href) && "bg-accent/70 text-foreground",
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.title}
                  </Link>
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <StarviaLogo showText markSize={26} textClassName="text-base" />
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={openCommandPalette} aria-label="Search Starvia">
          <Search className="size-[18px]" />
        </Button>
        {actions}
        <ThemeToggle />
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.primary);
  const secondary = NAV_ITEMS.filter((item) => !item.primary);
  const secondaryActive = secondary.some((item) => isActive(pathname, item.href));
  const tabClass =
    "relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors";

  return (
    <nav
      aria-label="Quick navigation"
      className="glass safe-bottom fixed inset-x-2 bottom-2 z-30 flex items-stretch justify-around rounded-2xl border px-1 pt-1 shadow-[0_16px_50px_-18px_rgba(15,23,42,.45)] lg:hidden"
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(tabClass, active ? "text-primary" : "text-muted-foreground")}
          >
            {active ? <span className="absolute -top-1 h-0.5 w-5 rounded-full bg-primary" /> : null}
            <item.icon className={cn("size-5", active && "text-primary")} />
            <span className="max-w-full truncate">{item.title.replace("AI ", "").replace(" a question", "")}</span>
          </Link>
        );
      })}

      <Sheet>
        <SheetTrigger asChild>
          <button type="button" className={cn(tabClass, secondaryActive ? "text-primary" : "text-muted-foreground")}>
            {secondaryActive ? <span className="absolute -top-1 h-0.5 w-5 rounded-full bg-primary" /> : null}
            <MoreHorizontal className="size-5" />
            <span>More</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-[28px] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" aria-hidden />
          <SheetHeader>
            <SheetTitle>More study tools</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {secondary.map((item) => (
              <SheetClose asChild key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-w-0 items-center gap-3 rounded-2xl border border-border/70 bg-background/70 p-3.5 text-sm font-medium",
                    isActive(pathname, item.href) && "border-primary/30 bg-primary/[0.07] text-primary",
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="size-4" />
                  </span>
                  <span className="truncate">{item.title}</span>
                </Link>
              </SheetClose>
            ))}
          </div>
          <SheetClose asChild>
            <button
              type="button"
              onClick={openCommandPalette}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border/70 py-3 text-sm font-medium text-muted-foreground"
            >
              <Search className="size-4" />
              Search everything
            </button>
          </SheetClose>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
