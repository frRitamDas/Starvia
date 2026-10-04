import { guard, readJson } from "@/lib/api/helpers";
import { ApiError, ok } from "@/lib/http";
import { requireOnboarded } from "@/lib/session";
import { confirmOrderPayment, confirmSubscriptionPayment } from "@/lib/payments/service";
import { logAiEvent } from "@/lib/usage";

export const runtime = "nodejs";

/**
 * Verifies the Razorpay checkout handshake server-side, re-checks the payment
 * with Razorpay, and only then activates the plan.
 * The browser's claim of "payment successful" is never trusted.
 */
export async function POST(request: Request) {
  return guard("payments.verify", async () => {
    const context = await requireOnboarded();
    const body = (await readJson(request)) as {
      plan?: "pro" | "ultra";
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
      razorpay_subscription_id?: string;
      billing?: "monthly" | "yearly";
    };

    if (!body.razorpay_payment_id || !body.razorpay_signature) {
      throw new ApiError("BAD_REQUEST", "That payment is missing verification details.");
    }

    if (body.razorpay_subscription_id) {
      const result = await confirmSubscriptionPayment(context, {
        subscriptionId: body.razorpay_subscription_id,
        paymentId: body.razorpay_payment_id,
        signature: body.razorpay_signature,
      });
      await logAiEvent(context, { feature: "payment", status: "success" });
      return ok({ plan: result.plan, mode: "subscription" });
    }

    if (!body.razorpay_order_id || !body.plan) {
      throw new ApiError("BAD_REQUEST", "That payment is missing verification details.");
    }

    const result = await confirmOrderPayment(context, {
      plan: body.plan,
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
      billing: body.billing ?? "monthly",
    });

    await logAiEvent(context, { feature: "payment", status: "success" });
    return ok({ plan: result.plan, mode: "order" });
  });
}
