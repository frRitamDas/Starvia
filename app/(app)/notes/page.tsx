import type { Metadata } from "next";
import { BookOpenText, LockKeyhole, Sparkles } from "lucide-react";

import { NotesWorkspace } from "@/components/learn/notes-workspace";
import { Badge } from "@/components/ui/badge";
import { listStudyNotes } from "@/lib/data/notes";
import { subjectsForClass } from "@/lib/curriculum";
import { requireOnboarded } from "@/lib/session";
import { getUsageSummary } from "@/lib/usage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Study notebook",
  description: "Keep class notes, build visual mind maps and revisit your key ideas in one private notebook.",
  robots: { index: false, follow: false },
};

export default async function NotesPage() {
  const context = await requireOnboarded();
  const [notes, usage] = await Promise.all([
    listStudyNotes(context),
    getUsageSummary(context),
  ]);
  const subjects = context.profile.subjects?.length
    ? context.profile.subjects
    : subjectsForClass(context.profile.class_level ?? "10");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-xl font-semibold sm:text-2xl">Study notebook</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Keep the explanations, formulas and examples you want to remember. Turn any saved note into a visual mind map when you&apos;re ready to revise.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1.5"><LockKeyhole className="size-3.5" />Private to you</Badge>
          <Badge variant="secondary" className="gap-1.5"><BookOpenText className="size-3.5" />Markdown notes</Badge>
          <Badge variant="secondary" className="gap-1.5"><Sparkles className="size-3.5" />AI mind maps</Badge>
        </div>
      </div>

      <NotesWorkspace
        initialNotes={notes}
        subjects={subjects}
        mapCreditsRemaining={usage.usage.tutorial.remaining}
        mapCreditsLimit={usage.usage.tutorial.limit}
      />
    </div>
  );
}
