import type { Metadata } from "next";

import { CtaBand } from "@/components/marketing/cta-band";
import { PricingSection } from "@/components/marketing/pricing-section";
import { Section, SectionHeading } from "@/components/marketing/section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getSessionContext } from "@/lib/session";
import { FAQS } from "@/lib/faq";

export const metadata: Metadata = {
  title: "Pricing — free plan, Pro ₹99 and Ultra ₹249",
  description:
    "Starvia pricing for Indian students: start free, then upgrade to Pro (₹99/month) or Ultra (₹249/month) for higher daily AI limits, flashcards, advanced exam preparation and deeper analytics.",
  alternates: { canonical: "/pricing" },
};

const BILLING_FAQS = [
  ...FAQS.filter((faq) => faq.category === "Plans & payments"),
  ...FAQS.filter((faq) => faq.category === "Getting started").slice(0, 2),
];

export default async function PricingPage() {
  const session = await getSessionContext().catch(() => null);

  return (
    <>
      <Section className="pb-8 pt-14 sm:pt-20">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple plans, honest limits"
          description="Every plan includes the full workspace. Paid plans raise your daily AI limits and unlock advanced exam preparation, flashcards and analytics."
        />
      </Section>

      <Section className="py-0">
        <PricingSection
          currentPlan={session?.plan ?? "free"}
          signedIn={Boolean(session?.user)}
        />
      </Section>

      <Section className="border-t border-border/60 bg-muted/20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <SectionHeading
            align="left"
            eyebrow="Billing FAQ"
            title="Payments, plans and limits"
            description="Everything about how upgrades, limits and cancellations work."
          />
          <Accordion type="single" collapsible>
            {BILLING_FAQS.map((faq, index) => (
              <AccordionItem key={faq.question} value={`billing-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>

      <Section>
        <CtaBand
          title="Try everything on the free plan"
          description="No card required. Upgrade only when the daily limits start holding you back."
        />
      </Section>
    </>
  );
}
