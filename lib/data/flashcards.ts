import "server-only";

import { demoId, demoStore } from "@/lib/demo/store";
import { ApiError } from "@/lib/http";
import type { SessionContext } from "@/lib/session";
import type { Flashcard, FlashcardDeck, FlashcardProgress } from "@/lib/types";
import type { FlashcardPayload } from "@/lib/ai/schemas";

/** Flashcard decks, cards and spaced-repetition-lite review tracking. */

export interface DeckWithCards extends FlashcardDeck {
  cards: (Flashcard & { progress: FlashcardProgress | null })[];
}

export async function listDecks(context: SessionContext, limit = 40): Promise<FlashcardDeck[]> {
  if (!context.user) return [];
  if (context.demo) {
    return [...demoStore().decks]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit)
      .map(({ cards: _cards, ...deck }) => deck);
  }
  const { data, error } = await context.db!
    .from("flashcard_decks")
    .select("*")
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as FlashcardDeck[];
}

export async function getDeck(context: SessionContext, deckId: string): Promise<DeckWithCards | null> {
  if (!context.user) return null;

  if (context.demo) {
    const store = demoStore();
    const deck = store.decks.find((item) => item.id === deckId);
    if (!deck) return null;
    const { cards, ...rest } = deck;
    return {
      ...rest,
      cards: cards.map((card) => ({
        ...card,
        progress: store.cardProgress.get(card.id) ?? null,
      })),
    };
  }

  const { data: deck, error } = await context.db!
    .from("flashcard_decks")
    .select("*")
    .eq("id", deckId)
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (error || !deck) return null;

  const [{ data: cards }, { data: progress }] = await Promise.all([
    context.db!
      .from("flashcards")
      .select("*")
      .eq("deck_id", deckId)
      .eq("user_id", context.user.id)
      .order("created_at", { ascending: true }),
    context.db!
      .from("flashcard_progress")
      .select("*")
      .eq("deck_id", deckId)
      .eq("user_id", context.user.id),
  ]);

  const progressByCard = new Map(
    ((progress ?? []) as unknown as FlashcardProgress[]).map((row) => [row.card_id, row]),
  );

  return {
    ...(deck as unknown as FlashcardDeck),
    cards: ((cards ?? []) as unknown as Flashcard[]).map((card) => ({
      ...card,
      progress: progressByCard.get(card.id) ?? null,
    })),
  };
}

export async function createDeck(
  context: SessionContext,
  input: {
    title: string;
    subject: string;
    topic?: string | null;
    classLevel?: string | null;
    board?: string | null;
    source?: "manual" | "ai" | "tutorial";
    cards: { front: string; back: string; hint?: string | null }[];
  },
): Promise<DeckWithCards> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");
  if (input.cards.length === 0) throw new ApiError("BAD_REQUEST", "Add at least one card.");

  const deckPayload = {
    user_id: context.user.id,
    title: input.title.slice(0, 120),
    subject: input.subject,
    topic: input.topic ?? null,
    class_level: input.classLevel ?? context.profile?.class_level ?? null,
    board: input.board ?? context.profile?.board ?? null,
    source: input.source ?? "manual",
    card_count: input.cards.length,
  };

  if (context.demo) {
    const store = demoStore();
    const now = new Date().toISOString();
    const deckId = demoId("5");
    const cards: Flashcard[] = input.cards.map((card) => ({
      id: demoId("5"),
      user_id: context.user!.id,
      deck_id: deckId,
      front: card.front,
      back: card.back,
      hint: card.hint ?? null,
      subject: input.subject,
      topic: input.topic ?? null,
      created_at: now,
    }));
    const deck = { id: deckId, ...deckPayload, created_at: now, updated_at: now, cards };
    store.decks.unshift(deck);
    return { ...deck, cards: cards.map((card) => ({ ...card, progress: null })) };
  }

  const { data: deck, error } = await context.db!
    .from("flashcard_decks")
    .insert(deckPayload)
    .select("*")
    .single();
  if (error || !deck) {
    console.error("[flashcards] createDeck:", error?.message);
    throw new ApiError("SERVER_ERROR", "Could not create that deck.");
  }

  const rows = input.cards.map((card) => ({
    user_id: context.user!.id,
    deck_id: (deck as { id: string }).id,
    front: card.front,
    back: card.back,
    hint: card.hint ?? null,
    subject: input.subject,
    topic: input.topic ?? null,
  }));

  const { data: cards, error: cardsError } = await context.db!.from("flashcards").insert(rows).select("*");
  if (cardsError) {
    console.error("[flashcards] createDeck cards:", cardsError.message);
    throw new ApiError("SERVER_ERROR", "Could not save the cards.");
  }

  return {
    ...(deck as unknown as FlashcardDeck),
    cards: ((cards ?? []) as unknown as Flashcard[]).map((card) => ({ ...card, progress: null })),
  };
}

export async function generateAndSaveDeck(
  context: SessionContext,
  input: {
    payload: FlashcardPayload;
    subject: string;
    topic: string;
    chapter?: string | null;
    classLevel?: string | null;
    board?: string | null;
    save: boolean;
  },
): Promise<{ deck: DeckWithCards | null; cards: FlashcardPayload["cards"] }> {
  if (!input.save) return { deck: null, cards: input.payload.cards };
  const deck = await createDeck(context, {
    title: input.payload.title,
    subject: input.subject,
    topic: input.topic,
    classLevel: input.classLevel ?? null,
    board: input.board ?? null,
    source: "ai",
    cards: input.payload.cards.map((card) => ({
      front: card.front,
      back: card.back,
      hint: card.hint ?? null,
    })),
  });
  return { deck, cards: input.payload.cards };
}

export async function reviewCard(
  context: SessionContext,
  input: { cardId: string; deckId: string; result: "known" | "unknown" },
): Promise<FlashcardProgress> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  const known = input.result === "known";

  if (context.demo) {
    const store = demoStore();
    const existing = store.cardProgress.get(input.cardId);
    const next: FlashcardProgress = existing
      ? {
          ...existing,
          known_count: existing.known_count + (known ? 1 : 0),
          unknown_count: existing.unknown_count + (known ? 0 : 1),
          streak: known ? existing.streak + 1 : 0,
          mastered: known && existing.streak + 1 >= 3 ? true : existing.mastered,
          last_reviewed_at: new Date().toISOString(),
        }
      : {
          id: demoId("5"),
          user_id: context.user.id,
          card_id: input.cardId,
          deck_id: input.deckId,
          known_count: known ? 1 : 0,
          unknown_count: known ? 0 : 1,
          streak: known ? 1 : 0,
          mastered: false,
          last_reviewed_at: new Date().toISOString(),
          next_review_at: null,
        };
    store.cardProgress.set(input.cardId, next);
    return next;
  }

  const { data: existing } = await context.db!
    .from("flashcard_progress")
    .select("*")
    .eq("user_id", context.user.id)
    .eq("card_id", input.cardId)
    .maybeSingle();

  const current = existing as unknown as FlashcardProgress | null;
  const patch = {
    user_id: context.user.id,
    card_id: input.cardId,
    deck_id: input.deckId,
    known_count: (current?.known_count ?? 0) + (known ? 1 : 0),
    unknown_count: (current?.unknown_count ?? 0) + (known ? 0 : 1),
    streak: known ? (current?.streak ?? 0) + 1 : 0,
    mastered: known ? (current?.streak ?? 0) + 1 >= 3 : (current?.mastered ?? false),
    last_reviewed_at: new Date().toISOString(),
  };

  const { data, error } = await context.db!
    .from("flashcard_progress")
    .upsert(patch, { onConflict: "user_id,card_id" })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[flashcards] reviewCard:", error?.message);
    throw new ApiError("SERVER_ERROR", "Could not save your review.");
  }
  return data as unknown as FlashcardProgress;
}

export async function deleteDeck(context: SessionContext, deckId: string) {
  if (!context.user) throw new ApiError("UNAUTHORIZED");
  if (context.demo) {
    const store = demoStore();
    store.decks = store.decks.filter((deck) => deck.id !== deckId);
    return;
  }
  const { error } = await context.db!.from("flashcard_decks")
    .delete()
    .eq("id", deckId)
    .eq("user_id", context.user.id);
  if (error) throw new ApiError("SERVER_ERROR", "Could not delete that deck.");
}

export async function flashcardStats(context: SessionContext) {
  if (!context.user) return { decks: 0, cards: 0, mastered: 0, reviewsToday: 0 };

  if (context.demo) {
    const store = demoStore();
    const cards = store.decks.reduce((sum, deck) => sum + deck.cards.length, 0);
    const progress = [...store.cardProgress.values()];
    const today = new Date().toDateString();
    return {
      decks: store.decks.length,
      cards,
      mastered: progress.filter((row) => row.mastered).length,
      reviewsToday: progress.filter(
        (row) => row.last_reviewed_at && new Date(row.last_reviewed_at).toDateString() === today,
      ).length,
    };
  }

  const [{ count: deckCount }, { count: cardCount }, { data: progress }] = await Promise.all([
    context.db!.from("flashcard_decks").select("id", { count: "exact", head: true }).eq("user_id", context.user.id),
    context.db!.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", context.user.id),
    context.db!.from("flashcard_progress").select("mastered, last_reviewed_at").eq("user_id", context.user.id),
  ]);

  const rows = (progress ?? []) as { mastered: boolean; last_reviewed_at: string | null }[];
  const today = new Date().toDateString();

  return {
    decks: deckCount ?? 0,
    cards: cardCount ?? 0,
    mastered: rows.filter((row) => row.mastered).length,
    reviewsToday: rows.filter(
      (row) => row.last_reviewed_at && new Date(row.last_reviewed_at).toDateString() === today,
    ).length,
  };
}
