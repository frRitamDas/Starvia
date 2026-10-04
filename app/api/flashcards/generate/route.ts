import { guard, readJson } from "@/lib/api/helpers";
import { ok } from "@/lib/http";
import { requireOnboarded, touchActivity } from "@/lib/session";
import { consumeQuota, logAiEvent } from "@/lib/usage";
import { generateAndSaveDeck } from "@/lib/data/flashcards";
import { generateFlashcards } from "@/lib/ai";
import { demoFlashcards } from "@/lib/ai/demo-generator";
import { demoMode } from "@/lib/env";
import { flashcardGenerateSchema } from "@/lib/validation";
import { ApiError } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  return guard("flashcards.generate", async () => {
    const context = await requireOnboarded();
    const input = flashcardGenerateSchema.parse(await readJson(request));

    const capabilities = context.capabilities;
    if (!capabilities.flashcardGeneration) {
      throw new ApiError(
        "PAYMENT_REQUIRED",
        "AI flashcard generation is part of Pro and Ultra. You can still create decks manually for free.",
        { upgrade: true },
      );
    }

    const count = Math.min(input.count, capabilities.maxFlashcards || input.count);
    await consumeQuota(context, "flashcards");

    const payload = demoMode()
      ? demoFlashcards({ subject: input.subject, topic: input.topic, count })
      : (
          await generateFlashcards(
            {
              subject: input.subject,
              topic: input.topic,
              chapter: input.chapter,
              classLevel: input.classLevel ?? context.profile.class_level,
              board: input.board ?? context.profile.board,
              count,
            },
            context.admin ?? context.db,
          )
        ).payload;

    const { deck, cards } = await generateAndSaveDeck(context, {
      payload,
      subject: input.subject,
      topic: input.topic,
      chapter: input.chapter,
      classLevel: input.classLevel,
      board: input.board,
      save: input.save,
    });

    await touchActivity(context, 2);
    await logAiEvent(context, { feature: "flashcards", status: "success" });

    return ok({ deck, cards, saved: input.save });
  });
}
