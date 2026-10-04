"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  Home,
  Layers,
  ScanLine,
  Search,
  Settings,
  Sparkles,
  UserRound,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const COMMAND_PALETTE_EVENT = "starvia:command-palette";

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_EVENT));
}

type Command = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  group: "Learn" | "Plan & revise" | "Account";
  keywords: string;
};

const COMMANDS: Command[] = [
  { title: "Dashboard", description: "Your study overview", href: "/dashboard", icon: Home, group: "Learn", keywords: "home overview" },
  { title: "Ask AI Tutor", description: "Explain any doubt step by step", href: "/tutor", icon: Sparkles, group: "Learn", keywords: "chat doubt question" },
  { title: "Create tutorial", description: "Learn a chapter from the ground up", href: "/tutorials", icon: BookOpenCheck, group: "Learn", keywords: "lesson concept chapter" },
  { title: "Take a quiz", description: "Practise and find weak topics", href: "/quiz", icon: ClipboardList, group: "Learn", keywords: "test mcq practice" },
  { title: "Solve a question", description: "Type or photograph a problem", href: "/solve", icon: ScanLine, group: "Learn", keywords: "photo image homework" },
  { title: "Exam preparation", description: "Build a focused revision plan", href: "/exam-prep", icon: CalendarClock, group: "Plan & revise", keywords: "schedule mock revision" },
  { title: "Flashcards", description: "Review what needs another pass", href: "/flashcards", icon: Layers, group: "Plan & revise", keywords: "cards recall memory" },
  { title: "Progress", description: "See mastery, streaks and accuracy", href: "/progress", icon: BarChart3, group: "Plan & revise", keywords: "analytics stats marks" },
  { title: "Plans", description: "Compare Starter, Pro and Ultra", href: "/upgrade", icon: Zap, group: "Account", keywords: "pricing upgrade subscription" },
  { title: "Profile", description: "Update class, board and subjects", href: "/profile", icon: UserRound, group: "Account", keywords: "settings student account" },
  { title: "Learning preferences", description: "Personalise how Starvia teaches", href: "/profile#learning", icon: Settings, group: "Account", keywords: "difficulty language" },
  { title: "Explore features", description: "See everything Starvia can do", href: "/features", icon: GraduationCap, group: "Account", keywords: "marketing tools" },
];

export function CommandPalette() {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(COMMAND_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(COMMAND_PALETTE_EVENT, onOpen);
    };
  }, []);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
      return;
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const results = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return COMMANDS;
    return COMMANDS.filter((command) =>
      `${command.title} ${command.description} ${command.keywords}`.toLowerCase().includes(term),
    );
  }, [query]);

  React.useEffect(() => setActive(0), [query]);

  function choose(command: Command) {
    setOpen(false);
    router.push(command.href);
  }

  const groups = ["Learn", "Plan & revise", "Account"] as const;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="top-[12vh] block max-h-[76vh] max-w-xl translate-y-0 overflow-hidden p-0 sm:top-[16vh]"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">Search Starvia</DialogTitle>
        <DialogDescription className="sr-only">
          Jump to any study tool or account page.
        </DialogDescription>
        <div className="flex items-center gap-3 border-b border-border/70 px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((value) => Math.min(results.length - 1, value + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((value) => Math.max(0, value - 1));
              } else if (event.key === "Enter" && results[active]) {
                event.preventDefault();
                choose(results[active]);
              }
            }}
            placeholder="Search tools, pages and actions…"
            className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search Starvia"
          />
          <kbd className="hidden rounded-md border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-flex">
            ESC
          </kbd>
        </div>

        <div className="max-h-[58vh] overflow-y-auto p-2">
          {results.length ? (
            groups.map((group) => {
              const commands = results.filter((command) => command.group === group);
              if (!commands.length) return null;
              return (
                <div key={group} className="pb-2 last:pb-0">
                  <p className="px-2 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {group}
                  </p>
                  {commands.map((command) => {
                    const index = results.indexOf(command);
                    return (
                      <button
                        key={command.href}
                        type="button"
                        onClick={() => choose(command)}
                        onMouseEnter={() => setActive(index)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                          active === index ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                        )}
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background">
                          <command.icon className="size-4 text-primary" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium text-foreground">{command.title}</span>
                          <span className="block truncate text-[11.5px]">{command.description}</span>
                        </span>
                        <span className="text-xs opacity-45">↵</span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          ) : (
            <div className="px-4 py-12 text-center">
              <Search className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No results for “{query}”</p>
              <p className="mt-1 text-xs text-muted-foreground">Try “quiz”, “photo” or “progress”.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/70 bg-muted/30 px-4 py-2 text-[10px] text-muted-foreground">
          <span>↑↓ navigate · ↵ open</span>
          <span>Starvia quick actions</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
