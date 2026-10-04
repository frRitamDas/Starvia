import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CtaBand } from "@/components/marketing/cta-band";
import { Section, SectionHeading } from "@/components/marketing/section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { FAQS, FAQ_CATEGORIES, faqJsonLd } from "@/lib/faq";

export const metadata: Metadata = {
  title: "FAQ — Starvia AI study platform",
  description:
    "Answers to common questions about Starvia: supported classes and boards, how the AI tutor works, daily limits, payments, refunds and privacy.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />

      <Section className="pb-8 pt-14 sm:pt-20">
        <SectionHeading
          eyebrow="Help centre"
          title="Frequently asked questions"
          description="Everything about classes, boards, AI behaviour, limits, payments and privacy."
        />
      </Section>

      <Section className="space-y-10 py-0">
        {FAQ_CATEGORIES.map((category) => {
          const items = FAQS.filter((faq) => faq.category === category);
          return (
            <div key={category} id={category.toLowerCase().replace(/\s+/g, "-")} className="scroll-mt-24">
              <h2 className="font-display text-lg font-semibold">{category}</h2>
              <Accordion type="single" collapsible className="mt-2">
                {items.map((faq, index) => (
                  <AccordionItem key={faq.question} value={`${category}-${index}`}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          );
        })}

        <div className="rounded-2xl border border-border/70 bg-muted/30 p-6">
          <h2 className="font-display text-lg font-semibold">Still need help?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Write to us with your question, class and board — we usually reply within one working day.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/contact">
              Contact support
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </Section>

      <Section>
        <CtaBand
          title="Ready when you are"
          description="Create a free account and ask your first doubt in under a minute."
        />
      </Section>
    </>
  );
}
