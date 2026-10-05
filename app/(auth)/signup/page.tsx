import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GraduationCap, Sparkles, Zap } from "lucide-react";

import { GoogleButton } from "@/components/auth/auth-form";
import { DemoNotice } from "@/components/auth/demo-notice";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getSessionContext } from "@/lib/session";
import { demoMode } from "@/lib/env";

export const metadata: Metadata = {
  title: "Create your free account",
  description:
    "Create a Starvia account with Google — AI tutoring, tutorials, quizzes and exam preparation for CBSE, ICSE and State Board students.",
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

  const demo = demoMode();

  return (
    <Card className="p-6 sm:p-8">
      <div className="space-y-1.5 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-brand-gradient text-white">
          <Sparkles className="size-5" />
        </div>
        <h1 className="pt-2 font-display text-xl font-semibold">Start learning free</h1>
        <p className="text-sm text-muted-foreground">
          Create your account in seconds with Google.
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

      <div className="mt-5 space-y-3">
        <GoogleButton next={params.next ?? "/onboarding"} />
        <p className="text-center text-xs leading-5 text-muted-foreground">
          Your Google account provides your basic profile details. Starvia will ask for
          your class, board and subjects during onboarding.
        </p>
        {demo ? <DemoNotice /> : null}
      </div>
    </Card>
  );
}
