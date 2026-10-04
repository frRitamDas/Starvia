import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
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
      <PageHeader
        eyebrow="Learn"
        icon={Sparkles}
        title="AI Tutor"
        description="Explanations matched to your class, board and syllabus. Ask follow-ups freely — Starvia remembers the conversation."
      />

      <TutorChat
        conversations={conversations}
        conversation={active?.conversation ?? null}
        messages={active?.messages ?? []}
        subjects={subjects}
        classLevel={context.profile.class_level ?? null}
        board={context.profile.board ?? null}
        remaining={usage.usage.tutor.remaining}
        limit={usage.usage.tutor.limit}
        demo={context.demo}
      />
    </div>
  );
}
