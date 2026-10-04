import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarClock,
  ClipboardList,
  Flame,
  Layers,
  ScanLine,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";

import { CtaBand } from "@/components/marketing/cta-band";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { PricingSection } from "@/components/marketing/pricing-section";
import { Eyebrow, Section, SectionHeading } from "@/components/marketing/section";
import { TutorDemo } from "@/components/marketing/tutor-demo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FAQS } from "@/lib/faq";
import { faqJsonLd } from "@/lib/faq";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `${siteConfig.name} — AI study companion for CBSE, ICSE & State Board students`,
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.shortDescription,
    url: "/",
  },
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            faqJsonLd(),
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: siteConfig.name,
              applicationCategory: "EducationalApplication",
              operatingSystem: "Web, Android, iOS",
              description: siteConfig.shortDescription,
              offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
              author: { "@type": "Person", name: siteConfig.founder },
            },
          ]),
        }}
      />

      {/* ---------------------------------------------------------------- Hero */}
      <Section className="pb-6 pt-12 sm:pt-16 lg:pt-20" bleed>
        <div className="container">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div className="space-y-7">
              <div className="flex flex-wrap items-center gap-2">
                <Eyebrow>
                  <Sparkles className="size-3.5" />
                  Built for Indian students
                </Eyebrow>
                <Badge variant="secondary" className="gap-1.5">
                  CBSE · ICSE · State Board
                </Badge>
              </div>

              <div className="space-y-5">
                <h1 className="text-[34px] font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-[56px]">
                  Everything you study,
                  <br className="hidden sm:block" /> understood properly.
                </h1>
                <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
                  Starvia is your AI study companion for Classes 6–12 — learn concepts, solve doubts,
                  practice with quizzes and walk into exams prepared. Written for your class, your
                  board and your syllabus.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" variant="gradient" className="sm:w-auto">
                  <Link href="/signup">
                    Start learning free
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="sm:w-auto">
                  <Link href="#features">Explore features</Link>
                </Button>
              </div>

              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
                {[
                  { icon: Zap, label: "Answers in seconds" },
                  { icon: Smartphone, label: "Made for phones" },
                  { icon: BadgeCheck, label: "Free plan, no card" },
                ].map((item) => (
                  <li key={item.label} className="inline-flex items-center gap-1.5">
                    <item.icon className="size-4 text-primary" />
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div
                className="absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-tr from-primary/10 via-transparent to-sky-400/10 blur-2xl"
                aria-hidden
              />
              <TutorDemo />
            </div>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------------- Metrics */}
      <Section className="py-8 sm:py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { value: "7", label: "Classes covered (6–12)" },
            { value: "3", label: "Boards supported at launch" },
            { value: "6", label: "AI study tools in one workspace" },
            { value: "₹0", label: "To get started today" },
          ].map((stat) => (
            <Card key={stat.label} className="p-5">
              <p className="font-display text-3xl font-semibold tracking-tight text-gradient">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------------------------ Features */}
      <Section id="features" className="border-t border-border/60">
        <SectionHeading
          eyebrow="One workspace"
          title="Six study tools that work together"
          description="Ask, generate, practise, revise and track — without juggling five different apps or losing your progress."
        />
        <div className="mt-10">
          <FeatureGrid />
        </div>
      </Section>

      {/* ----------------------------------------------------------- Tutorials */}
      <Section className="border-t border-border/60 bg-muted/20">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-5">
            <Eyebrow>
              <BookIcon />
              AI Tutorials
            </Eyebrow>
            <h2 className="text-2xl font-semibold leading-tight sm:text-3xl lg:text-[34px]">
              A full chapter explained the way a good teacher would
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Pick your class, board, subject and topic. Starvia writes a structured tutorial:
              learning objectives, an introduction that connects to what you already know, worked
              examples, key terms, exam tips, common mistakes and practice questions with hints.
            </p>
            <ul className="space-y-2.5 text-sm">
              {[
                "Stay inside your syllabus — no confusing extra depth",
                "Mathematical notation rendered properly",
                "Mark complete and it appears in your progress",
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant="outline">
              <Link href="/tutorials">
                Generate a tutorial
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <Card className="overflow-hidden">
            <div className="border-b border-border/70 bg-muted/30 px-4 py-3">
              <p className="text-sm font-medium">Ohm&apos;s Law — Class 10 · CBSE · Science</p>
            </div>
            <div className="space-y-4 p-5">
              {[
                { label: "Learning objectives", progress: 100 },
                { label: "Concept explanation", progress: 100 },
                { label: "Worked examples", progress: 65 },
                { label: "Practice + summary", progress: 20 },
              ].map((row) => (
                <div key={row.label} className="space-y-2">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium">{row.progress}%</span>
                  </div>
                  <Progress value={row.progress} className="h-1.5" />
                </div>
              ))}
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 text-[13px] text-muted-foreground">
                <span className="font-medium text-foreground">Exam tip:</span> always state the
                constant-temperature condition when you write V = IR.
              </div>
            </div>
          </Card>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- Quiz */}
      <Section className="border-t border-border/60">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Card className="order-2 overflow-hidden lg:order-1">
            <div className="flex items-center justify-between border-b border-border/70 bg-muted/30 px-4 py-3">
              <p className="text-sm font-medium">Electricity — quick check</p>
              <Badge variant="secondary">3 / 10</Badge>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm font-medium">The SI unit of resistance is:</p>
              <div className="space-y-2.5">
                {["Volt", "Ohm", "Ampere", "Watt"].map((option, index) => (
                  <div
                    key={option}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm ${
                      index === 1
                        ? "border-success/50 bg-success/[0.07]"
                        : "border-border/70 bg-background/60"
                    }`}
                  >
                    <span className="flex size-6 items-center justify-center rounded-full border border-border/70 text-xs font-medium">
                      {String.fromCharCode(65 + index)}
                    </span>
                    {option}
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 text-[13px] text-muted-foreground">
                <span className="font-medium text-foreground">Explanation:</span> resistance is
                measured in ohms (Ω), named after Georg Simon Ohm.
              </div>
            </div>
          </Card>

          <div className="order-1 space-y-5 lg:order-2">
            <Eyebrow>
              <ClipboardList className="size-3.5" />
              AI Quiz
            </Eyebrow>
            <h2 className="text-2xl font-semibold leading-tight sm:text-3xl lg:text-[34px]">
              Practise, then find out exactly what to fix
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Generate MCQs, true/false and short-answer questions from any chapter. Answers stay
              hidden until you submit, and every attempt ends with explanations, your score and the
              topics you should revise next.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: BarChart3, label: "Score & accuracy" },
                { icon: Layers, label: "Weak topics detected" },
                { icon: CalendarClock, label: "Revision suggestions" },
                { icon: Flame, label: "XP for every attempt" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 rounded-xl border border-border/70 px-3.5 py-2.5 text-[13px]"
                >
                  <item.icon className="size-4 text-primary" />
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------------- Solver */}
      <Section className="border-t border-border/60 bg-muted/20">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-5">
            <Eyebrow>
              <ScanLine className="size-3.5" />
              Question solver
            </Eyebrow>
            <h2 className="text-2xl font-semibold leading-tight sm:text-3xl lg:text-[34px]">
              Stuck at question 7? Photograph it.
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Type a doubt or upload a photo from your textbook. Starvia identifies the subject and
              topic, explains the concept, solves it step by step with units, tells you the examiner
              trap to avoid, and gives you one similar question to try yourself.
            </p>
            <ol className="space-y-3 text-sm">
              {[
                "Subject and topic identified",
                "Concept explained at your level",
                "Step-by-step solution",
                "Final answer with units",
                "A similar practice question",
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <Card className="p-5">
            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/[0.04] p-6 text-center">
              <ScanLine className="mx-auto size-8 text-primary" />
              <p className="mt-3 text-sm font-medium">Drop a photo of your question</p>
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPG or WebP · up to 5 MB</p>
            </div>
            <div className="mt-4 space-y-3 text-[13px]">
              <div className="rounded-xl border border-border/70 bg-background/60 p-3.5">
                <p className="font-medium text-foreground">Concept</p>
                <p className="mt-1 text-muted-foreground">
                  Galvanic cells convert chemical energy into electrical energy through redox
                  reactions.
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/60 p-3.5">
                <p className="font-medium text-foreground">Watch out for</p>
                <p className="mt-1 text-muted-foreground">
                  Reversing the sign of the cell potential — oxidation always happens at the anode.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </Section>

      {/* ----------------------------------------------------------- Exam prep */}
      <Section className="border-t border-border/60">
        <SectionHeading
          eyebrow="Exam preparation"
          title="Walk in prepared, not panicked"
          description="Pick your exam type and Starvia builds a day-wise plan around high-weightage chapters, then tracks each topic as you move it from 'learning' to 'mastered'."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {[
            {
              title: "Revision plan",
              description: "Day-wise tasks with time estimates — realistic for the days you have left.",
              items: ["Highest weightage first", "Formula sheet included", "Adjustable days"],
            },
            {
              title: "Practice set",
              description: "Mixed questions at board level, with marking-style answers.",
              items: ["MCQs + long answers", "Difficulty labelled", "Marks per question"],
            },
            {
              title: "Mock test",
              description: "A full paper blueprint with section-wise marks and timing guidance.",
              items: ["Section blueprint", "Time per section", "Self-evaluation"],
            },
          ].map((card) => (
            <Card key={card.title} className="p-6">
              <h3 className="font-display text-lg font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.description}</p>
              <ul className="mt-4 space-y-2 text-[13px]">
                {card.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Section>

      {/* ----------------------------------------------------------- Progress */}
      <Section className="border-t border-border/60 bg-muted/20">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-5">
            <Eyebrow>
              <BarChart3 className="size-3.5" />
              Progress & streaks
            </Eyebrow>
            <h2 className="text-2xl font-semibold leading-tight sm:text-3xl lg:text-[34px]">
              Watch the effort turn into results
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Tutorials completed, questions asked, quiz accuracy, learning time and weak subjects —
              laid out clearly. Streaks and XP keep the habit going, without turning study into a game
              you forget to open.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Flame, value: "12", label: "Day streak" },
                { icon: Zap, value: "Level 5", label: "1,840 XP" },
                { icon: Layers, value: "38", label: "Topics practised" },
              ].map((stat) => (
                <Card key={stat.label} className="p-4">
                  <stat.icon className="size-4 text-primary" />
                  <p className="mt-2 font-display text-xl font-semibold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </Card>
              ))}
            </div>
          </div>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Quiz accuracy — last 6 attempts</p>
              <Badge variant="success">+14% this month</Badge>
            </div>
            <div className="mt-6 flex h-40 items-end gap-3">
              {[45, 58, 52, 66, 74, 82].map((value, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-lg bg-brand-gradient transition-all"
                    style={{ height: `${value}%` }}
                  />
                  <span className="text-[11px] text-muted-foreground">{value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Section>

      {/* ------------------------------------------------------------ Pricing */}
      <Section id="pricing" className="border-t border-border/60">
        <SectionHeading
          eyebrow="Pricing"
          title="Start free. Upgrade when you're serious."
          description="Every plan includes the full study workspace. Paid plans simply raise your daily AI limits and unlock deeper exam preparation."
        />
        <div className="mt-10">
          <PricingSection />
        </div>
      </Section>

      {/* ---------------------------------------------------------------- FAQ */}
      <Section id="faq" className="border-t border-border/60 bg-muted/20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <SectionHeading
            align="left"
            eyebrow="FAQ"
            title="Questions students actually ask"
            description="Still unsure about something? Write to us — we reply within one working day."
          />
          <Accordion type="single" collapsible className="w-full">
            {FAQS.slice(0, 8).map((faq, index) => (
              <AccordionItem key={faq.question} value={`item-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- CTA */}
      <Section>
        <CtaBand />
      </Section>
    </>
  );
}

function BookIcon() {
  return <Sparkles className="size-3.5" />;
}
