import { guard } from "@/lib/api/helpers";
import { ok } from "@/lib/http";
import { requireOnboarded } from "@/lib/session";
import { getSubscription } from "@/lib/payments/service";
import { daysRemaining } from "@/lib/plans";

/** Subscription + expiry info for the account/billing screens. */
export async function GET() {
  return guard("payments.status", async () => {
    const context = await requireOnboarded();
    const subscription = await getSubscription(context);

    let payments: {
      id: string;
      amount_inr: number;
      status: string;
      created_at: string;
      payment_id: string | null;
    }[] = [];

    if (context.demo) {
      payments = [];
    } else if (context.db) {
      const { data } = await context.db
        .from("payments")
        .select("id, amount_inr, status, created_at, payment_id")
        .eq("user_id", context.user.id)
        .order("created_at", { ascending: false })
        .limit(12);
      payments = data ?? [];
    }

    return ok({
      plan: context.plan,
      subscription,
      daysRemaining: daysRemaining(subscription?.current_period_end ?? null),
      payments,
    });
  });
}
