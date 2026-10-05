import "server-only";

import type { BillingInterval, PlanId } from "@/lib/plans";

/**
 * Razorpay *recurring* plan ids, read from server-only environment variables.
 *
 * These live outside `lib/plans.ts` on purpose: that module is imported by
 * client components, and non-public env vars must never be pulled into a
 * browser bundle. When an id is missing, checkout falls back to a one-time
 * order (see `lib/payments/service.ts`), so the product still works before the
 * Razorpay dashboard plans are created.
 */
const PLAN_IDS: Record<Exclude<PlanId, "free">, Record<BillingInterval, string | undefined>> = {
  pro: {
    monthly: process.env.RAZORPAY_PLAN_PRO_MONTHLY || process.env.RAZORPAY_PLAN_PRO,
    yearly: process.env.RAZORPAY_PLAN_PRO_YEARLY,
  },
  ultra: {
    monthly: process.env.RAZORPAY_PLAN_ULTRA_MONTHLY || process.env.RAZORPAY_PLAN_ULTRA,
    yearly: process.env.RAZORPAY_PLAN_ULTRA_YEARLY,
  },
};

export function razorpayPlanIdFor(plan: PlanId, billing: BillingInterval): string | undefined {
  if (plan === "free") return undefined;
  const id = PLAN_IDS[plan][billing];
  return id && id.trim().length > 0 ? id.trim() : undefined;
}
