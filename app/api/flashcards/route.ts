import { guard, readJson } from "@/lib/api/helpers";
import { ok } from "@/lib/http";
import { requireOnboarded } from "@/lib/session";
import { createDeck, flashcardStats, listDecks } from "@/lib/data/flashcards";
import { upsertTopicStatus } from "@/lib/data/progress";
import { flashcardDeckSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  return guard("flashcards.list", async () => {
    const context = await requireOnboarded();
    const [decks, stats] = await Promise.all([listDecks(context), flashcardStats(context)]);
    return ok({ decks, stats });
  });
}

/** Create a manual deck (free on every plan — only AI generation is metered). */
export async function POST(request: Request) {
  return guard("flashcards.create", async () => {
    const context = await requireOnboarded();
    const input = flashcardDeckSchema.parse(await readJson(request));

    if (!input.cards || input.cards.length === 0) {
      return ok({ error: "Add at least one card before saving." }, { status: 400 });
    }

    const deck = await createDeck(context, {
      title: input.title,
      subject: input.subject,
      topic: input.topic,
      classLevel: input.classLevel,
      board: input.board,
      source: input.source,
      cards: input.cards,
    });

    await upsertTopicStatus(context, {
      subject: input.subject,
      topic: input.topic ?? input.title,
      status: "learning",
      minutesSpent: 2,
    }).catch(() => undefined);

    return ok({ deck });
  });
}
