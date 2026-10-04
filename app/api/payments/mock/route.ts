import { guard, readJson } from "@/lib/api/helpers";
import { ApiError, ok } from "@/lib/http";
import { requireOnboarded } from "@/lib/session";
import { mockActivate, mockCheckoutAvailable } from "@/lib/payments/service";
import { mockCheckoutSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Development-only activation so the upgrade flow can be tested end-to-end
 * without real credentials. It is hard-disabled in production builds and on any
 * deployment that has Razorpay configured — see mockCheckoutAvailable().
 */
export async function POST(request: Request) {
  return guard("payments.mock", async () => {
    if (!mockCheckoutAvailable()) {
      throw new ApiError(
        "NOT_CONFIGURED",
        "Test activation is disabled on this deployment. Configure Razorpay to enable real upgrades.",
      );
    }

    const context = await requireOnboarded();
    const input = mockCheckoutSchema.parse(await readJson(request));

    if (input.action === "cancel") {
      const { cancelPlan } = await import("@/lib/payments/service");
      const result = await cancelPlan(context, { immediate: true });
      return ok({ plan: result.plan, mode: "mock-cancel" });
    }

    const result = await mockActivate(context, input.plan);
    return ok({ plan: result.plan, mode: "mock" });
  });
}
