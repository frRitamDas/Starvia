import "server-only";

import type { PlanId } from "@/lib/plans";

/**
 * Razorpay *recurring* plan ids, read from server-only environment variables.
 *
 * These live outside `lib/plans.ts` on purpose: that module is imported by
 * client components, and non-public env vars must never be pulled into a
 * browser bundle. When an id is missing, checkout falls back to a one-time
 * order (see `lib/payments/service.ts`), so the product still works before the
 * Razorpay dashboard plans are created.
 */
const PLAN_IDS: Partial<Record<PlanId, string | undefined>> = {
  pro: process.env.RAZORPAY_PLAN_PRO,
  ultra: process.env.RAZORPAY_PLAN_ULTRA,
};

export function razorpayPlanIdFor(plan: PlanId): string | undefined {
  const id = PLAN_IDS[plan];
  return id && id.trim().length > 0 ? id.trim() : undefined;
}
