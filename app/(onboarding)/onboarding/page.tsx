import type { Metadata } from "next";
import { redirect } from "next/navigation";

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

  if (profile?.onboarded_at) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">
          Let&apos;s personalise Starvia
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
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
          board: profile?.board ?? "cbse",
          subjects: profile?.subjects ?? [],
          learning_level: profile?.learning_level ?? "average",
          exam_target: profile?.exam_target ?? "",
        }}
      />
    </div>
  );
}
