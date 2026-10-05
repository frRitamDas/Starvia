import type { Metadata } from "next";
import { BookOpen, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/learn/profile-form";
import { BOARDS } from "@/lib/curriculum";
import { getProfile } from "@/lib/data/profile";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Set up your Starvia learning profile",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const context = await requireUser();
  const profile = await getProfile(context);

  if (profile?.onboarded_at) redirect("/dashboard");

  return (
    <div className="py-8 sm:py-12">
      <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:gap-12">
        <aside className="lg:sticky lg:top-8">
          <div className="inline-flex size-11 items-center justify-center rounded-2xl border border-border bg-card shadow-soft">
            <Sparkles className="size-5" />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Your Starvia setup
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
            Make Starvia feel like it was built for you.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Tell us a little about how you study. We use it to tune explanations, tutorials, quizzes
            and revision plans to your level.
          </p>

          <div className="mt-7 space-y-3">
            {[
              { icon: BookOpen, title: "Your syllabus", text: "Class, board and subjects." },
              { icon: CheckCircle2, title: "Your level", text: "How confident you feel right now." },
              { icon: ShieldCheck, title: "Private by design", text: "You can edit these details anytime." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 rounded-2xl border border-border/70 bg-card p-4">
                <item.icon className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5">
            <p className="text-sm font-medium">Let&apos;s get your study space ready.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Three short steps. Nothing complicated.
            </p>
          </div>
          <ProfileForm
            mode="onboarding"
            boards={[...BOARDS]}
            initial={{
              full_name: profile?.full_name ?? "",
              class_level: profile?.class_level ?? "10",
              board: profile?.board ?? "cbse",
              subjects: profile?.subjects ?? [],
              learning_level: profile?.learning_level ?? "average",
              exam_target: profile?.exam_target ?? "",
            }}
          />
        </div>
      </div>
    </div>
  );
}
