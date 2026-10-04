import { guard, readJson } from "@/lib/api/helpers";
import { ok } from "@/lib/http";
import { requireOnboarded } from "@/lib/session";
import { cancelPlan } from "@/lib/payments/service";

export const runtime = "nodejs";

/** Cancels the active plan. Access continues until the paid period ends. */
export async function POST(request: Request) {
  return guard("payments.cancel", async () => {
    const context = await requireOnboarded();
    const body = (await readJson(request)) as { immediate?: boolean };

    const result = await cancelPlan(context, { immediate: Boolean(body.immediate) });
    return ok({ ...result, effective: body.immediate ? "immediate" : "period_end" });
  });
}
