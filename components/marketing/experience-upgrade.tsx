import Link from "next/link";
import { ArrowUpRight, BookOpen, FileText, FlaskConical, Sparkles, Target, WandSparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const modules = [
  {
    icon: FileText,
    title: "Past paper intelligence",
    text: "Find official board and specimen papers, save them and jump straight into solving.",
    href: "/papers",
    metric: "Boards → Papers → Practice",
  },
  {
    icon: WandSparkles,
    title: "Solve, don't just copy",
    text: "Turn a difficult question into a guided solution, a concept explanation and a fresh practice problem.",
    href: "/solve",
    metric: "Understand → Apply → Repeat",
  },
  {
    icon: FlaskConical,
    title: "Interactive learning",
    text: "Make difficult ideas visual with lightweight simulations and guided mini-experiments.",
    href: "/features",
    metric: "Touch → Explore → Explain",
  },
];

export function ExperienceUpgrade() {
  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-muted/20 py-16 sm:py-20">
      <div className="absolute inset-0 surface-grid opacity-40" aria-hidden />
      <div className="absolute left-1/2 top-[-180px] h-[380px] w-[760px] -translate-x-1/2 rounded-full bg-foreground/[0.045] blur-3xl" aria-hidden />
      <div className="container relative">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="gradient" className="gap-1.5">
                <Sparkles className="size-3.5" /> Starvia, upgraded
              </Badge>
              <Badge variant="outline">Built for real exam prep</Badge>
            </div>

            <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-[46px]">
              A study workspace that feels like a product, not a pile of tools.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              The next Starvia experience puts the student&apos;s next action first: find the paper,
              understand the question, practise the weak point, and see what to do next.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="gradient">
                <Link href="/papers">Explore past papers <ArrowUpRight /></Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/signup">Start free</Link>
              </Button>
            </div>

            <div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                ["01", "Focused", "One next action"],
                ["02", "Personal", "Your board + class"],
                ["03", "Persistent", "Progress follows you"],
              ].map(([number, title, text]) => (
                <div key={number} className="rounded-2xl border border-border/70 bg-card/70 p-3.5 backdrop-blur">
                  <p className="font-mono text-[10px] text-muted-foreground">{number}</p>
                  <p className="mt-2 text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <Card className="overflow-hidden rounded-[28px] border-border/80 bg-card/90 p-2 shadow-[0_30px_100px_-45px_hsl(var(--foreground)/.35)] backdrop-blur-xl">
              <div className="rounded-[22px] border border-border/70 bg-background/85 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Today&apos;s study cockpit</p>
                    <p className="mt-1 text-lg font-semibold">Class 10 · Board ready</p>
                  </div>
                  <div className="rounded-full border border-border/70 px-3 py-1 text-[11px] font-medium">Ready</div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1.35fr_.65fr]">
                  <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Target className="size-5" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Recommended next</p>
                        <p className="text-sm font-semibold">Solve a 2026 board question</p>
                      </div>
                    </div>
                    <div className="mt-5 h-2 rounded-full bg-muted">
                      <div className="h-full w-[72%] rounded-full bg-primary" />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10.5px] text-muted-foreground">
                      <span>72% of today&apos;s goal</span>
                      <span>18 / 25 min</span>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-border/70 bg-background p-3.5">
                      <p className="text-[11px] text-muted-foreground">Streak</p>
                      <p className="mt-1 text-xl font-semibold">7 days</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background p-3.5">
                      <p className="text-[11px] text-muted-foreground">Weak topic</p>
                      <p className="mt-1 text-sm font-semibold">Refraction</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {modules.map((item, index) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="group interactive-card rounded-2xl border border-border/70 bg-background p-3.5"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-muted text-foreground">
                          <item.icon className="size-4" />
                        </div>
                        <ArrowUpRight className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </div>
                      <p className="mt-3 text-xs font-semibold">{item.title}</p>
                      <p className="mt-1.5 text-[10.5px] leading-4 text-muted-foreground">{item.text}</p>
                      <p className="mt-3 font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">{item.metric}</p>
                    </Link>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/20 px-3.5 py-3 text-[11px] text-muted-foreground">
                  <BookOpen className="size-3.5 shrink-0" />
                  Saved papers stay on this device so your next session starts where you left off.
                </div>
              </div>
            </Card>

            <div className="pointer-events-none absolute -right-5 -top-5 hidden rounded-2xl border border-border/70 bg-card/90 px-3 py-2 text-[10px] shadow-lg sm:block">
              <span className="inline-flex items-center gap-1.5"><Sparkles className="size-3 text-primary" /> Smooth, intentional motion</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
