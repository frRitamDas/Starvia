import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, BookOpenCheck, Sparkles } from "lucide-react";

import { Aurora } from "@/components/motion/aurora";
import { ProfileForm } from "@/components/learn/profile-form";
import { BOARDS } from "@/lib/curriculum";
import { getProfile } from "@/lib/data/profile";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Set up your learning profile",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const context = await requireUser();
  const profile = await getProfile(context);

  // Keep the full wizard visible in demo mode so reviewers can inspect it.
  if (profile?.onboarded_at && !context.demo) redirect("/dashboard");

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-12">
      <aside className="relative hidden min-h-[610px] overflow-hidden rounded-[32px] border border-border/60 bg-card/70 p-8 lg:flex lg:flex-col">
        <Aurora />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/65 px-3 py-1.5 text-xs font-medium text-primary backdrop-blur">
            <Sparkles className="size-3.5" />
            Built around you
          </span>
          <h2 className="mt-6 font-display text-3xl font-semibold leading-tight tracking-tight">
            One minute now. Better explanations every day.
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Starvia uses these choices only to match your syllabus, pace and exam goals.
          </p>
        </div>

        <div className="relative mt-10 space-y-3">
          {[
            "Answers matched to your class and board",
            "Quizzes tuned to your current level",
            "Revision plans shaped around your goal",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/60 p-3.5 text-sm backdrop-blur">
              <BadgeCheck className="size-4 shrink-0 text-success" />
              {item}
            </div>
          ))}
        </div>

        <div className="relative mt-auto rounded-2xl border border-primary/20 bg-primary/[0.07] p-4">
          <BookOpenCheck className="size-5 text-primary" />
          <p className="mt-3 text-sm font-medium">Private by design</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Your learning profile stays inside your account and can be changed whenever school changes.
          </p>
        </div>
      </aside>

      <div className="min-w-0 space-y-6">
        <div className="space-y-2 text-center lg:text-left">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Let&apos;s personalise Starvia
          </h1>
          <p className="max-w-lg text-sm leading-6 text-muted-foreground">
            A few details so every explanation, tutorial and quiz matches your class, board and exam
            target.
          </p>
        </div>

        <ProfileForm
          mode="onboarding"
          boards={[...BOARDS]}
          initial={{
            full_name: profile?.full_name ?? "",
            class_level: profile?.class_level ?? "10",
            board: profile?.board ?? "CBSE",
            subjects: profile?.subjects ?? [],
            learning_level: profile?.learning_level ?? "developing",
            exam_target: profile?.exam_target ?? "",
          }}
        />
      </div>
    </div>
  );
}
