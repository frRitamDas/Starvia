"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, CheckCircle2, CircleAlert, RotateCcw, Search, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { Markdown } from "@/components/learn/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MistakeReviewItem } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

export function MistakeBank({ items }: { items: MistakeReviewItem[] }) {
  const [query, setQuery] = React.useState("");
  const [subject, setSubject] = React.useState("all");
  const subjects = React.useMemo(() => [...new Set(items.map((item) => item.subject))].sort(), [items]);
  const filtered = React.useMemo(() => {
    const search = query.trim().toLowerCase();
    return items.filter((item) => {
      const inSubject = subject === "all" || item.subject === subject;
      const matches = !search || [item.question, item.subject, item.topic ?? "", item.quizTitle].some((value) => value.toLowerCase().includes(search));
      return inSubject && matches;
    });
  }, [items, query, subject]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Your mistake bank is clear"
        description="When a quiz answer needs another look, it will appear here with the correct answer and explanation. Get a quiz going to build your review list."
        action={{ label: "Generate a quiz", href: "/quiz" }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search questions, topics or quizzes" className="pl-9" aria-label="Search mistake bank" />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Subject
          <select
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="h-10 min-w-36 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Filter by subject"
          >
            <option value="all">All subjects</option>
            {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <Badge variant="secondary" className="self-start sm:self-auto">{filtered.length} to revisit</Badge>
      </div>

      {filtered.length ? (
        <div className="space-y-3">
          {filtered.map((item) => (
            <article key={item.questionId} className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{item.subject}</Badge>
                {item.topic ? <Badge variant="secondary">{item.topic}</Badge> : null}
                {item.timesMissed > 1 ? <Badge variant="warning">Missed {item.timesMissed} times</Badge> : null}
                <span className="ml-auto text-[11px] text-muted-foreground">Last missed {formatRelativeTime(item.lastMissedAt)}</span>
              </div>

              <h2 className="mt-4 text-[15px] font-semibold leading-6">{item.question}</h2>
              {item.options?.length ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {item.options.map((option) => (
                    <div key={option} className="rounded-xl border border-border/70 px-3 py-2 text-sm">
                      {option}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 rounded-xl border border-warning/25 bg-warning/[0.05] px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Your last answer</p>
                <p className="mt-1 text-sm">{item.given || "Not answered"}</p>
              </div>

              <details className="group mt-3 rounded-xl border border-border/70 bg-muted/20">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <CircleAlert className="size-4 text-primary" />
                  Review the answer and explanation
                  <ArrowRight className="ml-auto size-4 transition-transform group-open:rotate-90" />
                </summary>
                <div className="space-y-3 border-t border-border/70 px-3.5 py-3.5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-success">Correct answer</p>
                    <p className="mt-1 text-sm font-medium">{item.correctAnswer}</p>
                  </div>
                  {item.explanation ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Why</p>
                      <Markdown className="mt-1 text-sm">{item.explanation}</Markdown>
                    </div>
                  ) : null}
                </div>
              </details>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/tutor?q=${encodeURIComponent(`Explain this question and why the correct answer is ${item.correctAnswer}: ${item.question}`)}`}>
                    <Sparkles className="size-4" /> Ask the tutor
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/quiz?subject=${encodeURIComponent(item.subject)}&topic=${encodeURIComponent(item.topic ?? item.chapter ?? "")}`}>
                    <RotateCcw className="size-4" /> Practice this topic
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/quiz/${item.quizId}`}>
                    <BookOpenCheck className="size-4" /> Retake quiz
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/80 px-6 py-12 text-center">
          <p className="text-sm font-medium">No questions match those filters</p>
          <p className="mt-1 text-xs text-muted-foreground">Try another search or choose all subjects.</p>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setQuery(""); setSubject("all"); }}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
