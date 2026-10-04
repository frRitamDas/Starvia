import { guard, readJson } from "@/lib/api/helpers";
import { assertRateLimit, ok } from "@/lib/http";
import { requireOnboarded } from "@/lib/session";
import { startCheckout } from "@/lib/payments/service";
import { checkoutSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Creates a Razorpay order/subscription (or a clearly-labelled mock session
 * when payments aren't configured). Nothing is activated until verification.
 */
export async function POST(request: Request) {
  return guard("payments.checkout", async () => {
    const context = await requireOnboarded();
    assertRateLimit(`checkout:${context.user.id}`, 10, 10 * 60 * 1000);

    const input = checkoutSchema.parse(await readJson(request));
    const session = await startCheckout(context, { plan: input.plan, billing: input.billing });

    return ok({ checkout: session });
  });
}
