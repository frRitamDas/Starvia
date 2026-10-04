import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, GraduationCap, Instagram, Mail, Target, Users } from "lucide-react";

import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Starvia — built for Indian school students",
  description:
    "Starvia was founded by Ritam Das to give Indian school students an honest, class-aware AI study companion — one that teaches instead of just handing over answers.",
  alternates: { canonical: "/about" },
};

const VALUES = [
  {
    icon: GraduationCap,
    title: "Teach, don't just answer",
    body: "Anyone can paste a question into a chatbot. Starvia explains the method, shows the working and asks you a question back, because understanding is what earns marks in the exam hall.",
  },
  {
    icon: Target,
    title: "Respect the syllabus",
    body: "CBSE, ICSE and state boards each have their own scope and conventions. Starvia sticks to yours instead of dumping university-level detail that leaves you more confused.",
  },
  {
    icon: Users,
    title: "Built for Indian classrooms",
    body: "Classes 6 to 12, Hindi and Hinglish support, low-data photo uploads and a mobile-first interface — because most students study on a phone, not a laptop.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title={<>Built because studying alone can feel <span className="text-gradient-animated">impossibly hard</span></>}
        description="Starvia gives Indian school students a patient, syllabus-aware study companion whenever a teacher or friend isn't around."
      />
      <Section className="pt-14 sm:pt-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="space-y-6">
            <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">
              <p>
                Every student has had the same experience: you&apos;re halfway through a numerical,
                you get stuck, and there&apos;s nobody around to ask. A textbook repeats the same
                explanation, a search result gives you the final answer with no working, and by the
                next day you&apos;ve forgotten it completely.
              </p>
              <p>
                <span className="font-medium text-foreground">{siteConfig.name}</span> was created to
                close that gap. Not another chatbot that hands you homework answers, but a study
                companion that knows your class, your board and your weak topics — and explains
                everything the way a patient teacher would.
              </p>
              <p>
                Today Starvia brings an AI tutor, structured tutorials, adaptive quizzes, a
                photo-based question solver, exam revision plans, flashcards and progress tracking
                into one fast, focused workspace that works just as well on a budget Android phone as
                it does on a laptop.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="gradient">
                <Link href="/signup">
                  Start learning free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/contact">Talk to us</Link>
              </Button>
            </div>
          </div>

          <Card className="h-fit p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Founder
            </p>
            <p className="mt-2 font-display text-2xl font-semibold">{siteConfig.founder}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              &quot;I wanted students in India to have a study tool that respects their time and
              their syllabus — one that explains the &apos;why&apos; behind every answer.{" "}
              {siteConfig.name} is that tool, and it keeps getting better with every student who uses
              it.&quot;
            </p>
            <div className="mt-6 space-y-2.5 text-sm">
              <a
                href={siteConfig.instagram}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 font-medium text-foreground transition-colors hover:text-primary"
              >
                <Instagram className="size-4" />
                {siteConfig.instagramHandle}
              </a>
              <br />
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Mail className="size-4" />
                {siteConfig.supportEmail}
              </a>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-border/70 px-2.5 py-1 text-muted-foreground">
                {siteConfig.version}
              </span>
              <span className="rounded-full border border-border/70 px-2.5 py-1 text-muted-foreground">
                Made in India
              </span>
            </div>
          </Card>
        </div>
      </Section>

      <Section className="border-t border-border/60 bg-muted/20">
        <SectionHeading
          eyebrow="Principles"
          title="What we optimise for"
          description="Three decisions shape every feature we ship."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {VALUES.map((value) => (
            <Card key={value.title} className="p-6">
              <value.icon className="size-5 text-primary" />
              <h2 className="mt-4 font-display text-lg font-semibold">{value.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{value.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section>
        <CtaBand
          title="Study with Starvia today"
          description="Free to start, built to be the study tool you actually keep using."
        />
      </Section>
    </>
  );
}
