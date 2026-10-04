import { guard } from "@/lib/api/helpers";
import { ApiError, ok } from "@/lib/http";
import { requireOnboarded } from "@/lib/session";
import { getExamPlan } from "@/lib/data/progress";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guard("examplan.get", async () => {
    const context = await requireOnboarded();
    const { id } = await params;

    const plan = await getExamPlan(context, id);
    if (!plan) throw new ApiError("NOT_FOUND", "That revision plan doesn't exist.");

    return ok({ plan });
  });
}
