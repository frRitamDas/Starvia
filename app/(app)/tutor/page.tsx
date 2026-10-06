import type { Metadata } from "next";

import { TutorChat } from "@/components/learn/tutor-chat";
import { getConversation, listConversations } from "@/lib/data/tutor";
import { requireOnboarded } from "@/lib/session";
import { getUsageSummary } from "@/lib/usage";
import { subjectsForClass } from "@/lib/curriculum";

export const metadata: Metadata = {
  title: "AI Tutor",
  description: "Ask your doubt and get an explanation written for your class and board.",
  robots: { index: false, follow: false },
};

export default async function TutorPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; q?: string }>;
}) {
  const context = await requireOnboarded();
  const params = await searchParams;

  const [conversations, usage] = await Promise.all([
    listConversations(context, 40),
    getUsageSummary(context),
  ]);

  const activeId = params.c ?? conversations[0]?.id ?? null;
  const active = activeId ? await getConversation(context, activeId) : null;

  const subjects =
    context.profile.subjects?.length
      ? context.profile.subjects
      : subjectsForClass(context.profile.class_level ?? "10");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-semibold sm:text-2xl">AI Tutor</h1>
        <p className="text-sm text-muted-foreground">
          Explanations matched to your class, board and syllabus. Ask follow-ups freely — Starvia
          remembers the conversation.
        </p>
      </div>

      <TutorChat
        conversations={conversations}
        conversation={active?.conversation ?? null}
        messages={active?.messages ?? []}
        subjects={subjects}
        classLevel={context.profile.class_level ?? null}
        board={context.profile.board ?? null}
        remaining={usage.usage.tutor.remaining}
        limit={usage.usage.tutor.limit}
        streak={context.profile.streak_count ?? 0}
        studyMinutes={context.profile.study_minutes ?? 0}
        xp={context.profile.xp ?? 0}
        demo={context.demo}
      />
    </div>
  );
}
