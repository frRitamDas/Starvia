import { guard, readJson } from "@/lib/api/helpers";
import { ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { rateMessage } from "@/lib/data/tutor";
import { messageFeedbackSchema } from "@/lib/validation";

/** Helpful / not-helpful feedback on an assistant message. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guard("tutor.message.feedback", async () => {
    const context = await requireUser();
    const { id } = await params;

    const parsed = messageFeedbackSchema.parse({ ...(await readJson(request)) as object, messageId: id });
    await rateMessage(context, parsed.messageId, parsed.rating);
    return ok({ rated: true });
  });
}
