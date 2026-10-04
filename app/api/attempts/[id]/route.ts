import { guard } from "@/lib/api/helpers";
import { ApiError, ok } from "@/lib/http";
import { requireOnboarded } from "@/lib/session";
import { getAttempt } from "@/lib/data/quizzes";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guard("attempts.get", async () => {
    const context = await requireOnboarded();
    const { id } = await params;

    const result = await getAttempt(context, id);
    if (!result) throw new ApiError("NOT_FOUND", "That attempt doesn't exist.");

    return ok(result);
  });
}
