import type { Metadata } from "next";

import { QuestionSolver } from "@/components/learn/question-solver";
import { requireOnboarded } from "@/lib/session";
import { getUsageSummary } from "@/lib/usage";
import { subjectsForClass } from "@/lib/curriculum";

export const metadata: Metadata = {
  title: "Question solver",
  description: "Photograph or type any question and get a step-by-step solution for your class level.",
  robots: { index: false, follow: false },
};

export default async function SolvePage() {
  const context = await requireOnboarded();
  const usage = await getUsageSummary(context);

  const subjects = context.profile.subjects?.length
    ? context.profile.subjects
    : subjectsForClass(context.profile.class_level ?? "10");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-xl font-semibold sm:text-2xl">Question solver</h1>
        <p className="text-sm text-muted-foreground">
          Stuck on a question? Type it or upload a photo — Starvia explains the concept, solves it step
          by step, and gives you one to practise.
        </p>
      </div>

      <QuestionSolver
        subjects={subjects}
        imageRemaining={usage.usage.image.remaining}
        imageLimit={usage.usage.image.limit}
        solverRemaining={usage.usage.solver.remaining}
        solverLimit={usage.usage.solver.limit}
      />
    </div>
  );
}
