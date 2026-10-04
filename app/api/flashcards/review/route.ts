import { guard, readJson } from "@/lib/api/helpers";
import { ok } from "@/lib/http";
import { requireOnboarded, touchActivity } from "@/lib/session";
import { reviewCard, flashcardStats } from "@/lib/data/flashcards";
import { awardXp } from "@/lib/gamification";
import { flashcardReviewSchema } from "@/lib/validation";

/** Record a known / unknown review (drives mastery and XP). */
export async function POST(request: Request) {
  return guard("flashcards.review", async () => {
    const context = await requireOnboarded();
    const input = flashcardReviewSchema.parse(await readJson(request));

    const progress = await reviewCard(context, input);
    await awardXp(context, "card_reviewed");
    await touchActivity(context, 1);

    const stats = await flashcardStats(context);
    return ok({ progress, stats });
  });
}
