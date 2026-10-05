import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CalendarCheck2,
  Camera,
  Check,
  ChevronRight,
  ClipboardCheck,
  Flame,
  GraduationCap,
  Layers3,
  MessageCircleQuestion,
  PenLine,
  ScanLine,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

import { CtaBand } from "@/components/marketing/cta-band";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { PricingSection } from "@/components/marketing/pricing-section";
import { Eyebrow, Section, SectionHeading } from "@/components/marketing/section";
import { TutorDemo } from "@/components/marketing/tutor-demo";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FAQS, faqJsonLd } from "@/lib/faq";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `${siteConfig.name} — AI learning workspace for Indian students`,
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.shortDescription,
    url: "/",
  },
};

const STUDY_MODES = [
  { icon: MessageCircleQuestion, title: "Ask anything", text: "Get a class-aware explanation instead of a one-line answer.", href: "/tutor" },
  { icon: BookOpen, title: "Learn a topic", text: "Turn a chapter or concept into a structured mini-lesson.", href: "/tutorials" },
  { icon: ClipboardCheck, title: "Test yourself", text: "Build a quiz, submit it, then see exactly what needs work.", href: "/quiz" },
  { icon: ScanLine, title: "Solve a doubt", text: "Type it or photograph the question and learn the method.", href: "/solve" },
  { icon: CalendarCheck2, title: "Prepare for an exam", text: "Create a focused revision plan around your available time.", href: "/exam-prep" },
  { icon: Layers3, title: "Revise faster", text: "Use flashcards and weak-topic recommendations for your next pass.", href: "/flashcards" },
];

const STUDY_LOOP = [
  { step: "01", title: "Understand", text: "Ask Starvia to explain the idea in language that fits your class." },
  { step: "02", title: "Practise", text: "Use targeted questions to turn recognition into actual recall." },
  { step: "03", title: "Review", text: "See mistakes, weak topics and what deserves another session." },
  { step: "04", title: "Return tomorrow", text: "Your streak and progress make the next study session obvious." },
];

const TRUST_POINTS = [
  "CBSE, ICSE and State Board ready",
  "Classes 6–12",
  "Your profile shapes every AI response",
  "Free plan with no card required",
];

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

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 premium-grain opacity-70" aria-hidden />
        <div className="absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-foreground/[0.035] blur-3xl" aria-hidden />
        <div className="container relative py-14 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-5xl text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Eyebrow><Sparkles className="size-3.5" /> Built around how students actually study</Eyebrow>
              <Badge variant="secondary">CBSE · ICSE · State Board</Badge>
            </div>

            <h1 className="mx-auto mt-7 max-w-4xl text-[42px] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-[78px]">
              Study with clarity.
              <br />
              <span className="text-muted-foreground">Not more noise.</span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-[16px] leading-7 text-muted-foreground sm:text-lg">
              Starvia is a focused AI learning workspace for Indian school students. Ask, understand,
              practise, revise and track your progress — all around your class, board and goals.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="gradient" className="h-13 px-7">
                <Link href="/signup">Create your free study space <ArrowRight /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-13 px-7">
                <Link href="#tools">See what you can do</Link>
              </Button>
            </div>

            <div className="mx-auto mt-7 flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground sm:text-sm">
              {TRUST_POINTS.map((point) => (
                <span key={point} className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-foreground" /> {point}
                </span>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-14 max-w-5xl sm:mt-16">
            <div className="rounded-[28px] border border-border/80 bg-card p-2 shadow-[0_24px_80px_-32px_hsl(var(--foreground)/.28)] sm:p-3">
              <TutorDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Personalised entry point */}
      <Section id="tools" className="py-16 sm:py-20">
        <SectionHeading
          eyebrow="Your next move"
          title="Open Starvia and know exactly what to do."
          description="No empty dashboard. Choose the kind of help you need and go straight into a focused study session."
        />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STUDY_MODES.map((item) => (
            <Link key={item.title} href={item.href} className="group min-w-0">
              <Card className="h-full p-5 transition-[transform,border-color,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:border-foreground/30 group-hover:shadow-soft">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-foreground/[0.07] text-foreground">
                    <item.icon className="size-5" />
                  </div>
                  <ChevronRight className="mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
                <h3 className="mt-5 font-display text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      {/* Study loop */}
      <Section id="how-it-works" className="border-y border-border/60 bg-muted/25">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-20">
          <div className="lg:sticky lg:top-24">
            <Eyebrow><Target className="size-3.5" /> The Starvia study loop</Eyebrow>
            <h2 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">
              Less searching.
              <br />
              More actual learning.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
              Starvia connects explanation, practice and revision so each session has a purpose.
              Your activity feeds your progress instead of disappearing after you close the tab.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/dashboard">See the learning space <ArrowRight /></Link>
            </Button>
          </div>

          <div className="grid gap-3">
            {STUDY_LOOP.map((item, index) => (
              <Card key={item.step} className="group p-5 sm:p-6">
                <div className="grid gap-5 sm:grid-cols-[64px_1fr] sm:items-start">
                  <span className="font-mono text-xs font-semibold text-muted-foreground">{item.step}</span>
                  <div>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{item.text}</p>
                    <div className="mt-4 h-px w-0 bg-foreground transition-all duration-500 group-hover:w-16" />
                  </div>
                </div>
                {index < STUDY_LOOP.length - 1 ? null : (
                  <div className="mt-5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Flame className="size-3.5" /> Keep the habit going with your daily streak.
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* Feature system */}
      <Section className="py-16 sm:py-20 lg:py-24">
        <SectionHeading
          eyebrow="One learning system"
          title="Everything important, connected."
          description="Starvia is not just a chat box. Each tool has a job, and the outputs become useful inputs for your next study session."
        />
        <div className="mt-10">
          <FeatureGrid />
        </div>
      </Section>

      {/* Tutorial + quiz */}
      <Section className="border-y border-border/60 bg-muted/25">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-border/70 p-5 sm:p-6">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <BookOpen className="size-4" /> LEARN
              </div>
              <h2 className="mt-3 text-2xl font-semibold">Turn a topic into a lesson.</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Learning objectives, concept breakdown, examples, exam tips, common mistakes and practice —
                generated as structured content you can actually revise.
              </p>
            </div>
            <div className="space-y-3 p-5 sm:p-6">
              {["Learning objectives", "Core concept", "Worked example", "Exam tip", "Practice question"].map((label, index) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
                  <span className="flex size-7 items-center justify-center rounded-full bg-foreground/[0.07] text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">{label}</span>
                  <Check className="ml-auto size-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-border/70 p-5 sm:p-6">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <ClipboardCheck className="size-4" /> PRACTISE
              </div>
              <h2 className="mt-3 text-2xl font-semibold">Know what you know.</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Generate a syllabus-aware quiz, submit it without seeing the answers early, then use
                the explanations and weak areas to decide what comes next.
              </p>
            </div>
            <div className="p-5 sm:p-6">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Class 9 · Biology</span>
                  <span>Question 6 / 10</span>
                </div>
                <p className="mt-5 text-sm font-semibold">Which structure controls what enters a cell?</p>
                <div className="mt-4 space-y-2">
                  {["Cell wall", "Cell membrane", "Cytoplasm", "Nucleus"].map((option, index) => (
                    <div key={option} className="flex items-center gap-3 rounded-xl border border-border/70 bg-background p-3 text-sm">
                      <span className="flex size-6 items-center justify-center rounded-full border border-border text-xs">
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Section>

      {/* Solve + exam */}
      <Section>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-border/70 p-6 sm:p-8">
              <Eyebrow><Camera className="size-3.5" /> Question solver</Eyebrow>
              <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-tight">
                A difficult question should become a learning moment.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Upload a textbook photo or type the problem. Starvia identifies the subject, explains
                the idea, works through the method and gives you a similar problem to attempt.
              </p>
            </div>
            <div className="grid gap-3 p-6 sm:grid-cols-3 sm:p-8">
              {[
                { icon: ScanLine, title: "Read", text: "Understand the question." },
                { icon: BrainCircuit, title: "Explain", text: "Connect it to the concept." },
                { icon: PenLine, title: "Practise", text: "Try a similar one." },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-border/70 p-4">
                  <item.icon className="size-4" />
                  <p className="mt-3 text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 sm:p-8">
            <Eyebrow><CalendarCheck2 className="size-3.5" /> Exam prep</Eyebrow>
            <h2 className="mt-5 text-3xl font-semibold leading-tight">Know what to study next.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Build a revision plan from your board, class, chapters and exam date. Move topics through
              Not started → Learning → Practised → Mastered.
            </p>
            <div className="mt-7 space-y-3">
              {[
                { label: "Important topics", value: 82 },
                { label: "Practice coverage", value: 61 },
                { label: "Revision readiness", value: 44 },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}%</span>
                  </div>
                  <Progress value={item.value} className="h-1.5" />
                </div>
              ))}
            </div>
            <Button asChild className="mt-7" variant="outline">
              <Link href="/exam-prep">Build a revision plan <ArrowRight /></Link>
            </Button>
          </Card>
        </div>
      </Section>

      {/* Progress */}
      <Section className="border-y border-border/60 bg-foreground text-background">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-background/20 bg-background/10 px-3 py-1 text-xs font-medium">
              <BarChart3 className="size-3.5" /> Your progress
            </div>
            <h2 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">
              Make progress visible.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-background/65 sm:text-base">
              Study time, topics practised, quiz accuracy, weak subjects, streaks and achievements —
              presented as useful signals, not vanity numbers.
            </p>
            <div className="mt-7 grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { value: "12", label: "day streak", icon: Flame },
                { value: "1.8k", label: "XP earned", icon: Zap },
                { value: "38", label: "topics", icon: GraduationCap },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-background/15 bg-background/[0.06] p-4">
                  <item.icon className="size-4 text-background/70" />
                  <p className="mt-3 text-xl font-semibold">{item.value}</p>
                  <p className="mt-1 text-[11px] text-background/55">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-background/15 bg-background/[0.06] p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Weekly study rhythm</p>
                <p className="mt-1 text-xs text-background/50">Small sessions add up.</p>
              </div>
              <Trophy className="size-5 text-background/70" />
            </div>
            <div className="mt-7 grid grid-cols-7 gap-2">
              {[34, 58, 46, 78, 62, 88, 70].map((value, index) => (
                <div key={index} className="flex h-36 flex-col justify-end gap-2">
                  <div className="rounded-t-lg bg-background/80" style={{ height: `${value}%` }} />
                  <span className="text-center text-[10px] text-background/45">{["M","T","W","T","F","S","S"][index]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Pricing */}
      <Section id="pricing">
        <SectionHeading
          eyebrow="Simple plans"
          title="Start free. Upgrade when you need more."
          description="The full study workflow is available from day one. Paid plans increase AI capacity and unlock deeper preparation features."
        />
        <div className="mt-10">
          <PricingSection />
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" className="border-t border-border/60 bg-muted/20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <Eyebrow><MessageCircleQuestion className="size-3.5" /> FAQ</Eyebrow>
            <h2 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">
              Clear answers before you begin.
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Everything important about plans, AI, privacy and getting started is explained plainly.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/faq">Read all FAQs <ArrowRight /></Link>
            </Button>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.slice(0, 7).map((faq, index) => (
              <AccordionItem key={faq.question} value={`item-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>

      {/* Final CTA */}
      <Section className="py-14 sm:py-20">
        <CtaBand />
      </Section>
    </>
  );
}
