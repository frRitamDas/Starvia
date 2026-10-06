"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  FileText,
  ClipboardList,
  LayoutDashboard,
  Layers,
  Menu,
  ScanLine,
  Sparkles,
} from "lucide-react";

import { StarviaLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
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
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground",
                    isActive(pathname, item.href) && "bg-accent/70 text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.title}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <StarviaLogo showText markSize={26} textClassName="text-base" />
      </div>
      <div className="flex items-center gap-1">
        {actions}
        <ThemeToggle />
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.primary);

  return (
    <nav
      aria-label="Quick navigation"
      className="glass safe-bottom fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t px-1 pt-1 lg:hidden"
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
