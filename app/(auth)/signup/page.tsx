import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GraduationCap, Sparkles, Zap } from "lucide-react";

import { AuthDivider, AuthForm, AuthLink, GoogleButton } from "@/components/auth/auth-form";
import { DemoNotice } from "@/components/auth/demo-notice";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { signUpAction } from "@/app/(auth)/actions";
import { getSessionContext } from "@/lib/session";
import { demoMode, integrationStatus } from "@/lib/env";

export const metadata: Metadata = {
  title: "Create your free account",
  description:
    "Create a free Starvia account — AI tutor, tutorials, quizzes and exam preparation for CBSE, ICSE and State Board students.",
  alternates: { canonical: "/signup" },
};

const PERKS = [
  { icon: Zap, label: "AI tutor messages every day, free" },
  { icon: GraduationCap, label: "Explanations matched to your class & board" },
  { icon: Sparkles, label: "Quizzes, flashcards and streaks from day one" },
];

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const session = await getSessionContext().catch(() => null);
  if (session?.user && !demoMode()) {
    redirect(params.next && params.next.startsWith("/") ? params.next : "/dashboard");
  }

  const status = integrationStatus();
  const demo = demoMode();

  return (
    <Card className="p-6 sm:p-8">
      <div className="space-y-1.5 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-brand-gradient text-white">
          <Sparkles className="size-5" />
        </div>
        <h1 className="pt-2 font-display text-xl font-semibold">Start learning free</h1>
        <p className="text-sm text-muted-foreground">
          No card needed. Takes less than a minute.
        </p>
      </div>

      <div className="mt-5 space-y-2">
        {PERKS.map((perk) => (
          <div key={perk.label} className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
            <perk.icon className="size-4 text-primary" />
            {perk.label}
          </div>
        ))}
      </div>

      <Badge variant="secondary" className="mt-5">
        Classes 6–12 · CBSE, ICSE & State Board
      </Badge>

      <div className="mt-5">
        <AuthForm
          action={signUpAction}
          hidden={{ next: params.next ?? "/onboarding" }}
          fields={[
            {
              name: "fullName",
              label: "Your name",
              placeholder: "Aarav Sharma",
              autoComplete: "name",
              required: true,
              minLength: 2,
            },
            {
              name: "email",
              label: "Email",
              type: "email",
              placeholder: "you@example.com",
              autoComplete: "email",
              required: true,
            },
            {
              name: "password",
              label: "Password",
              type: "password",
              autoComplete: "new-password",
              required: true,
              minLength: 8,
              hint: "8+ characters",
            },
          ]}
          submitLabel="Create my account"
          footer={
            <p>
              Already have an account? <AuthLink href="/login">Sign in</AuthLink>
            </p>
          }
        />

        {status.googleOAuth ? (
          <>
            <AuthDivider label="or sign up with" />
            <GoogleButton next={params.next} />
          </>
        ) : null}

        {demo ? <DemoNotice /> : null}
      </div>
    </Card>
  );
}
