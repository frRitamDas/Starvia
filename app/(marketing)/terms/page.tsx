import type { Metadata } from "next";

import { Section, SectionHeading } from "@/components/marketing/section";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of Starvia — accounts, acceptable use, subscriptions, refunds and limitations.",
  alternates: { canonical: "/terms" },
};

const LAST_UPDATED = "4 October 2026";

const SECTIONS: { title: string; id?: string; body: string[]; list?: string[] }[] = [
  {
    title: "1. Agreement",
    body: [
      `By creating a Starvia account or using the platform, you agree to these Terms of Service. If you are under 18, you confirm that a parent or guardian is aware of and supports your use of ${siteConfig.name}.`,
      "If you do not agree with these terms, please do not use the service.",
    ],
  },
  {
    title: "2. Your account",
    body: [
      "You are responsible for keeping your password secure and for activity that happens under your account. Provide accurate information during onboarding so the AI can teach you at the right level. One account per student.",
      "We may suspend or terminate accounts that are used for abuse, automated scraping, resale of generated content, or any attempt to bypass plan limits or payment.",
    ],
  },
  {
    title: "3. Acceptable use",
    body: ["Starvia is for personal study. You agree not to:"],
    list: [
      "Use the service to cheat in a live examination or assessment where AI assistance is prohibited.",
      "Attempt to access other users' data, probe our security, or interfere with the service.",
      "Upload content that is unlawful, harmful, or that you do not have the right to share.",
      "Resell, rebrand or redistribute Starvia content or API access without written permission.",
      "Circumvent daily limits, referral systems or payment verification.",
    ],
  },
  {
    title: "4. AI-generated content",
    body: [
      "Starvia uses large language models to generate explanations, tutorials, quizzes and solutions. AI can make mistakes. Always cross-check important answers with your textbook or teacher, and treat generated content as a study aid rather than an authoritative source.",
      "We work to keep answers inside your syllabus and to state uncertainty clearly, but we cannot guarantee that every response will be accurate, complete or free of errors.",
    ],
  },
  {
    title: "5. Plans, limits and fair use",
    body: [
      "The free Starter plan includes daily limits that reset at midnight IST. Pro (₹99/month) and Ultra (₹249/month) raise these limits. Limits are enforced server-side and shown in your dashboard.",
      "We may adjust plan features, daily limits or pricing with reasonable notice. If you are on a paid plan, changes will not reduce what you have already paid for during the current billing period.",
    ],
  },
  {
    title: "6. Payments and billing",
    id: "payments",
    body: [
      "Payments are processed by Razorpay using UPI, cards, net banking or wallets. Plans renew automatically at the end of each billing period unless cancelled. Prices are shown in Indian Rupees and are inclusive of applicable taxes unless stated otherwise.",
      "Your plan is activated only after our servers verify the payment with Razorpay. We never rely on information sent by the browser.",
    ],
  },
  {
    title: "7. Cancellation and refunds",
    id: "refunds",
    body: [
      "You can cancel at any time from your account. Cancellation stops future renewals, and you keep access to your paid plan until the end of the period you have already paid for. No further charges are made after cancellation.",
      "Refunds: if you were charged in error, charged twice, or could not access the paid features you paid for, write to us within 7 days of the charge and we will investigate. Verified billing errors are refunded in full to the original payment method. Because AI usage has a real per-request cost, refunds are not available simply because you changed your mind after using the plan, except where required by law.",
    ],
  },
  {
    title: "8. Availability",
    body: [
      "We aim to keep Starvia available and fast, but the service is provided on an \"as is\" and \"as available\" basis. We may temporarily suspend access for maintenance, or when a third-party provider (AI model, database or payment gateway) is unavailable.",
      "Daily limits protect the service so that all students can use it fairly on our current AI budget.",
    ],
  },
  {
    title: "9. Intellectual property",
    body: [
      `The ${siteConfig.name} name, logo, interface and code are owned by ${siteConfig.founder}. Tutorials, quizzes and explanations generated for you inside your account are for your personal study use.`,
      "Your own study content — the questions you ask and the notes you create — remains yours.",
    ],
  },
  {
    title: "10. Limitation of liability",
    body: [
      "To the extent permitted by law, Starvia is not liable for indirect or consequential losses, including loss of marks, results or data, arising from your use of the service. Our total liability for any claim is limited to the amount you paid us in the three months before the claim.",
    ],
  },
  {
    title: "11. Changes and governing law",
    body: [
      "We may update these terms; material changes will be reflected on this page with a new date. These terms are governed by the laws of India, and disputes are subject to the exclusive jurisdiction of the courts in Kolkata, West Bengal.",
    ],
  },
];

export default function TermsPage() {
  return (
    <Section className="pt-14 sm:pt-20">
      <SectionHeading
        align="left"
        eyebrow="Legal"
        title="Terms of Service"
        description={`Last updated ${LAST_UPDATED} · Please read these before using ${siteConfig.name}.`}
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card className="h-fit p-5 lg:sticky lg:top-24">
          <p className="text-sm font-medium">On this page</p>
          <ul className="mt-3 space-y-2 text-sm">
            {SECTIONS.map((section) => (
              <li key={section.title}>
                <a
                  href={`#${(section.id ?? section.title).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-8">
          {SECTIONS.map((section) => {
            const id = (section.id ?? section.title).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
            return (
              <section key={section.title} id={id} className="scroll-mt-24">
                <h2 className="font-display text-lg font-semibold">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.list ? (
                    <ul className="ml-5 list-disc space-y-1.5">
                      {section.list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </section>
            );
          })}

          <p className="text-xs text-muted-foreground">
            Questions about these terms? Email{" "}
            <a href={`mailto:${siteConfig.supportEmail}`} className="underline">
              {siteConfig.supportEmail}
            </a>
            .
          </p>
        </div>
      </div>
    </Section>
  );
}
