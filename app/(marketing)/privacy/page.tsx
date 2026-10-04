import type { Metadata } from "next";

import { PageHero } from "@/components/marketing/page-hero";
import { Section } from "@/components/marketing/section";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Starvia collects, uses, stores and protects student data — including what we never do with your study content.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "4 October 2026";

const SECTIONS: { title: string; body: string[]; list?: string[] }[] = [
  {
    title: "1. Who we are",
    body: [
      `${siteConfig.name} ("Starvia", "we", "us") is an AI study platform for school students in India, founded by ${siteConfig.founder}. This policy explains what personal information we collect, why we collect it, and the choices you have.`,
      `For any privacy question or request, write to ${siteConfig.supportEmail}.`,
    ],
  },
  {
    title: "2. Information we collect",
    body: ["We collect only what is needed to teach you well:"],
    list: [
      "Account details — your name, email address and password (stored as a secure hash by our authentication provider).",
      "Study profile — class, board, subjects, learning level and optional exam target.",
      "Study activity — tutorials, quizzes and attempts, flashcard reviews, topic progress, streaks, XP and achievements.",
      "AI conversations — your messages and the AI's replies, so you can revisit them later.",
      "Uploaded images — only when you choose to photograph a question. Images are processed to answer the question and are not used for advertising.",
      "Technical data — basic logs such as error events, request counts and approximate timestamps, used for reliability and abuse prevention.",
    ],
  },
  {
    title: "3. How we use your information",
    body: [
      "To generate explanations, tutorials, quizzes and revision plans that match your class and board. To keep your history and progress in sync across devices. To enforce daily plan limits and prevent abuse. To provide customer support when you contact us. To understand overall product usage so we can improve the product.",
      "We do not sell your personal data. We do not use your study content to train third-party AI models.",
    ],
  },
  {
    title: "4. AI processing",
    body: [
      "When you ask a question, the relevant text (and an image if you uploaded one) is sent from our servers to Google's Gemini API so it can generate a response. Your request is never sent directly from your browser, and our API keys are never exposed to your device.",
      "Google processes this data under its own API terms. We recommend not sharing sensitive personal information (such as addresses, phone numbers or identification documents) in your prompts.",
    ],
  },
  {
    title: "5. Payments",
    body: [
      "Subscription payments are processed by Razorpay. We never see or store your card number, UPI PIN or net-banking credentials. We receive limited information — such as payment status, payment identifier and amount — so we can activate your plan and keep accurate billing records.",
    ],
  },
  {
    title: "6. Data storage and security",
    body: ["Your data is stored in a managed PostgreSQL database (Supabase) with:"],
    list: [
      "Row-level security, so your records are readable only by your own account.",
      "Encryption in transit (HTTPS) for all traffic between your device and our servers.",
      "Server-side processing of all AI and payment operations, with secrets stored as environment variables on the server only.",
      "Access controls that limit administrative access to a small number of authorised people.",
    ],
  },
  {
    title: "7. Data retention",
    body: [
      "Your study data is retained while your account is active. If you delete your account, we delete your profile and associated study content within 30 days, except where we are required to keep limited records (for example, payment records for tax and accounting purposes).",
    ],
  },
  {
    title: "8. Your rights",
    body: [
      `You can view and edit your study profile at any time from your profile page. You can delete conversations, tutorials, quizzes and decks individually. To request a copy of your data or the deletion of your account, email ${siteConfig.supportEmail} from your registered email address and we will action verified requests within 30 days.`,
      "Students under 18 should use Starvia with the knowledge of a parent or guardian.",
    ],
  },
  {
    title: "9. Cookies and local storage",
    body: [
      "We use essential cookies to keep you signed in, and local storage to remember your theme preference. We do not use advertising cookies or third-party trackers for behavioural profiling.",
    ],
  },
  {
    title: "10. Changes to this policy",
    body: [
      "If we make material changes, we will update this page and revise the date above. Continued use of Starvia after an update means you accept the revised policy.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        align="left"
        eyebrow="Legal"
        title="Privacy Policy"
        description={`Last updated ${LAST_UPDATED} · This policy is written in plain language on purpose.`}
      />
      <Section className="pt-12 sm:pt-16">
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card className="h-fit p-5 lg:sticky lg:top-24">
          <p className="text-sm font-medium">On this page</p>
          <ul className="mt-3 space-y-2 text-sm">
            {SECTIONS.map((section) => (
              <li key={section.title}>
                <a
                  href={`#${section.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-8">
          {SECTIONS.map((section) => (
            <section
              key={section.title}
              id={section.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}
              className="scroll-mt-24"
            >
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
          ))}

          <p className="text-xs text-muted-foreground">
            Questions about this policy? Email{" "}
            <a href={`mailto:${siteConfig.supportEmail}`} className="underline">
              {siteConfig.supportEmail}
            </a>
            .
          </p>
          </div>
        </div>
      </Section>
    </>
  );
}
