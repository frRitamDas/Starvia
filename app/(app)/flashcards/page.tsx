import type { Metadata } from "next";
import { Layers } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { FlashcardManager } from "@/components/learn/flashcard-manager";
import { flashcardStats, listDecks } from "@/lib/data/flashcards";
import { requireOnboarded } from "@/lib/session";
import { getUsageSummary } from "@/lib/usage";
import { subjectsForClass } from "@/lib/curriculum";

export const metadata: Metadata = {
  title: "Flashcards",
  description: "Revise faster with AI-generated and hand-built flashcard decks.",
  robots: { index: false, follow: false },
};

export default async function FlashcardsPage() {
  const context = await requireOnboarded();

  const [decks, stats, usage] = await Promise.all([
    listDecks(context, 60),
    flashcardStats(context),
    getUsageSummary(context),
  ]);

  const subjects = context.profile.subjects?.length
    ? context.profile.subjects
    : subjectsForClass(context.profile.class_level ?? "10");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recall"
        icon={Layers}
        title="Flashcards"
        description="Five minutes of recall beats an hour of re-reading. Generate a deck or build your own."
      />

      <FlashcardManager
        decks={decks}
        subjects={subjects}
        stats={stats}
        aiEnabled={context.capabilities.flashcardGeneration}
        remaining={usage.usage.flashcards.remaining}
        limit={usage.usage.flashcards.limit}
        defaultClass={context.profile.class_level ?? "10"}
        defaultBoard={context.profile.board ?? "CBSE"}
      />
    </div>
  );
}
