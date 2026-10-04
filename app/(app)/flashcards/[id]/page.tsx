import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FlashcardStudy } from "@/components/learn/flashcard-study";
import { getDeck } from "@/lib/data/flashcards";
import { requireOnboarded } from "@/lib/session";

export const metadata: Metadata = {
  title: "Study flashcards",
  robots: { index: false, follow: false },
};

export default async function FlashcardDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireOnboarded();
  const { id } = await params;

  const deck = await getDeck(context, id);
  if (!deck) notFound();

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="font-display text-xl font-semibold sm:text-2xl">{deck.title}</h1>
        <p className="text-sm text-muted-foreground">
          {deck.card_count} cards · {deck.subject}
          {deck.topic ? ` · ${deck.topic}` : ""} · mark each card honestly to get accurate tracking
        </p>
      </div>
      <FlashcardStudy deck={deck} />
    </div>
  );
}
