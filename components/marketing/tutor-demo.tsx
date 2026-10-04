"use client";

import * as React from "react";
import { BookOpenCheck, Lightbulb, PencilRuler, Sparkles, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * Landing-page product demo. Fully self-contained and scripted — it never calls
 * the AI API, so the homepage stays instant and costs nothing to serve.
 */

interface DemoStep {
  id: string;
  label: string;
  question: string;
  meta: string;
  answer: React.ReactNode;
}

function Step({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-[13px] font-semibold text-foreground">{title}</p>
        <div className="text-[13.5px] leading-6 text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

const STEPS: DemoStep[] = [
  {
    id: "explain",
    label: "Explain a concept",
    question: "Why does a bulb glow brighter when resistance decreases?",
    meta: "Class 10 · Science · Electricity",
    answer: (
      <div className="space-y-4">
        <Step icon={<Sparkles className="size-3.5" />} title="Direct answer">
          Lower resistance lets more current flow through the filament, and power depends on current —
          so the bulb glows brighter.
        </Step>
        <Step icon={<BookOpenCheck className="size-3.5" />} title="The idea behind it">
          Power dissipated is <span className="font-mono text-xs">P = I²R = V²/R</span>. With the same
          supply voltage, reducing R increases the current, and the filament heats up more.
        </Step>
        <Step icon={<TriangleAlert className="size-3.5" />} title="Common mistake">
          Students often say &quot;less resistance means less light&quot;. Remember: resistance fights
          the current. Less fight → more flow → more heat and light.
        </Step>
        <Step icon={<PencilRuler className="size-3.5" />} title="Try this">
          A 6 V supply is connected to a 2 Ω bulb. Find the power. What happens to the power if the
          resistance drops to 1 Ω?
        </Step>
      </div>
    ),
  },
  {
    id: "solve",
    label: "Solve a question",
    question: "Find the roots of x² − 7x + 12 = 0",
    meta: "Class 10 · Mathematics · Quadratic Equations",
    answer: (
      <div className="space-y-4">
        <Step icon={<BookOpenCheck className="size-3.5" />} title="Concept used">
          Splitting the middle term: we need two numbers whose product is 12 and sum is −7.
        </Step>
        <Step icon={<PencilRuler className="size-3.5" />} title="Step by step">
          <ol className="ml-4 list-decimal space-y-1">
            <li>
              x² − 3x − 4x + 12 = 0
            </li>
            <li>
              x(x − 3) − 4(x − 3) = 0 → (x − 3)(x − 4) = 0
            </li>
            <li>x = 3 or x = 4</li>
          </ol>
        </Step>
        <Step icon={<Sparkles className="size-3.5" />} title="Final answer">
          <span className="font-medium text-foreground">x = 3 and x = 4</span> — verified by
          substituting both values back into the equation.
        </Step>
        <Step icon={<Lightbulb className="size-3.5" />} title="Practice">
          Now try x² − 9x + 20 = 0. Same method — and you can check with the quadratic formula.
        </Step>
      </div>
    ),
  },
  {
    id: "revise",
    label: "Revise before an exam",
    question: "I have my Science half-yearly in 5 days. What should I study?",
    meta: "Class 10 · CBSE · Half-yearly",
    answer: (
      <div className="space-y-4">
        <Step icon={<Sparkles className="size-3.5" />} title="Strategy">
          Highest weightage first: Chemical Reactions, Electricity and Life Processes together carry
          about half the paper.
        </Step>
        <Step icon={<BookOpenCheck className="size-3.5" />} title="5-day plan">
          <ul className="ml-4 list-disc space-y-1">
            <li>Day 1 — Chemical Reactions + 15 MCQs</li>
            <li>Day 2 — Acids, Bases &amp; Salts + flashcards</li>
            <li>Day 3 — Life Processes diagrams + quiz</li>
            <li>Day 4 — Electricity numericals (most-missed topic for you)</li>
            <li>Day 5 — Full mock test, then revise only your mistakes</li>
          </ul>
        </Step>
        <Step icon={<TriangleAlert className="size-3.5" />} title="Weak area detected">
          You scored 62% on Circuit numericals last week — two 20-minute sessions fix most of that.
        </Step>
      </div>
    ),
  },
];

export function TutorDemo() {
  const [active, setActive] = React.useState("explain");
  const step = STEPS.find((item) => item.id === active) ?? STEPS[0]!;

  return (
    <Card className="overflow-hidden border-border/70 bg-card/80 shadow-glow backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/70" />
            <span className="relative inline-flex size-2.5 rounded-full bg-success" />
          </span>
          <p className="text-sm font-medium">Starvia AI Tutor</p>
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex">
          Adapts to your class
        </Badge>
      </div>

      <div className="border-b border-border/70 px-4 py-3">
        <Tabs value={active} onValueChange={setActive}>
          <TabsList className="h-9 w-full justify-start gap-1 overflow-x-auto bg-transparent p-0 no-scrollbar">
            {STEPS.map((item) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                className="shrink-0 rounded-lg border border-transparent px-3 py-1.5 text-[13px] data-[state=active]:border-border/70 data-[state=active]:bg-background"
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-[13.5px] leading-6 text-primary-foreground shadow-sm">
            {step.question}
            <p className="mt-1.5 text-[11px] opacity-80">{step.meta}</p>
          </div>
        </div>

        <div className="flex gap-2.5">
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white">
            <Sparkles className="size-3.5" />
          </div>
          <div
            className={cn(
              "min-w-0 flex-1 rounded-2xl rounded-tl-md border border-border/70 bg-background/70 p-4",
              "animate-fade-up",
            )}
            key={step.id}
          >
            {step.answer}
          </div>
        </div>
      </div>

      <div className="border-t border-border/70 bg-muted/20 px-4 py-3 text-center text-xs text-muted-foreground">
        A real interaction with Starvia · ask anything from your syllabus
      </div>
    </Card>
  );
}
