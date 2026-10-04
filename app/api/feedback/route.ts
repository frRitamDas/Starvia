import { guard, readJson } from "@/lib/api/helpers";
import { ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { saveFeedback } from "@/lib/data/feedback";
import { feedbackSchema } from "@/lib/validation";
import { assertRateLimit } from "@/lib/http";

/** In-app feedback (signed in). */
export async function POST(request: Request) {
  return guard("feedback.post", async () => {
    const context = await requireUser();
    assertRateLimit(`feedback:${context.user.id}`, 5, 60 * 60 * 1000);

    const parsed = feedbackSchema.parse(await readJson(request));
    const result = await saveFeedback(context, {
      category: parsed.category,
      message: parsed.message,
      rating: parsed.rating ?? null,
      page: parsed.page ?? null,
    });
    return ok({ id: result.id });
  });
}
