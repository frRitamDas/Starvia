import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BrainCircuit, CheckCircle2, CircleAlert } from "lucide-react";

import { MistakeBank } from "@/components/learn/mistake-bank";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listMistakeBank } from "@/lib/data/quizzes";
import { requireOnboarded } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mistake review",
  description: "Review missed quiz questions, understand the correct method and practise weak topics again.",
  robots: { index: false, follow: false },
};

export default async function MistakesPage() {
  const context = await requireOnboarded();
  const mistakes = await listMistakeBank(context);
  const repeatCount = mistakes.filter((item) => item.timesMissed > 1).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-xl font-semibold sm:text-2xl">Mistake review</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            A missed question is a useful clue. Revisit the explanation, ask the tutor for another angle, then practise the topic again.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/progress"><BrainCircuit className="size-4" /> See weak topics <ArrowRight className="size-4" /></Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><CircleAlert className="size-4 text-warning" />Need another pass</p>
          <p className="mt-2 font-display text-2xl font-semibold">{mistakes.length}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Questions missed on your latest attempt</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="size-4 text-success" />Repeated misses</p>
          <p className="mt-2 font-display text-2xl font-semibold">{repeatCount}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Good candidates for a short revision session</p>
        </div>
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/[0.045] p-4 sm:col-span-1">
          <div>
            <Badge variant="secondary">Study loop</Badge>
            <p className="mt-2 text-sm font-semibold">Understand it, then try again.</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">A question leaves this list after your latest recorded attempt is correct.</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="self-start px-0">
            <Link href="/quiz">Make a new quiz <ArrowRight /></Link>
          </Button>
        </div>
      </div>

      <MistakeBank items={mistakes} />
    </div>
  );
}
