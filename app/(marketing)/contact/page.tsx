import type { Metadata } from "next";
import { Clock, Instagram, Mail, MessageSquare } from "lucide-react";

import { ContactForm } from "@/components/marketing/contact-form";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Starvia — support, feedback and school enquiries",
  description:
    "Get in touch with the Starvia team for support, bug reports, content corrections, billing questions or school and bulk enquiries.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <Section className="pt-14 sm:pt-20">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
        <div className="space-y-8">
          <SectionHeading
            align="left"
            eyebrow="Contact"
            title="We'd love to hear from you"
            description="Whether something broke, a quiz answer looked wrong, or you want Starvia for your school — send us a message."
          />

          <div className="space-y-3">
            <Card className="flex items-start gap-3.5 p-4">
              <Mail className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {siteConfig.supportEmail}
                </a>
              </div>
            </Card>
            <Card className="flex items-start gap-3.5 p-4">
              <Instagram className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Instagram</p>
                <a
                  href={siteConfig.instagram}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {siteConfig.instagramHandle}
                </a>
              </div>
            </Card>
            <Card className="flex items-start gap-3.5 p-4">
              <Clock className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Response time</p>
                <p className="text-sm text-muted-foreground">Usually within one working day (IST).</p>
              </div>
            </Card>
            <Card className="flex items-start gap-3.5 p-4">
              <MessageSquare className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="text-sm font-medium">In-app feedback</p>
                <p className="text-sm text-muted-foreground">
                  Signed in? Use the feedback button in your dashboard to report an issue with context
                  attached automatically.
                </p>
              </div>
            </Card>
          </div>
        </div>

        <Card className="p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold">Send us a message</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            The more detail you give (class, board, subject, topic), the faster we can help.
          </p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </Card>
      </div>
    </Section>
  );
}
