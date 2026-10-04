import { guard } from "@/lib/api/helpers";
import { ok } from "@/lib/http";
import { getSessionContext, requireUser } from "@/lib/session";
import { getUsageSummary } from "@/lib/usage";
import { getPlan } from "@/lib/plans";

/** Live quota snapshot — the dashboard uses this to render the usage widget. */
export async function GET() {
  return guard("usage.get", async () => {
    const context = await getSessionContext();
    if (!context.user) {
      const plan = getPlan("free");
      return ok({
        authenticated: false,
        plan: plan.id,
        limits: plan.limits,
        capabilities: plan.capabilities,
      });
    }
    const authed = await requireUser();
    const usage = await getUsageSummary(authed);
    return ok({
      authenticated: true,
      demo: authed.demo,
      plan: authed.plan,
      planName: getPlan(authed.plan).name,
      limits: authed.limits,
      capabilities: authed.capabilities,
      usage: usage.usage,
      resetsInMs: usage.resetsInMs,
      subscription: authed.subscription
        ? {
            plan: authed.subscription.plan,
            status: authed.subscription.status,
            currentPeriodEnd: authed.subscription.current_period_end,
            cancelAtPeriodEnd: authed.subscription.cancel_at_period_end,
          }
        : null,
    });
  });
}
