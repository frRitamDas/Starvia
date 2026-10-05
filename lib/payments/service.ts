import "server-only";

import { ApiError } from "@/lib/http";
import { demoMode, serverEnv, razorpayConfigured } from "@/lib/env";
import { demoStore, demoId } from "@/lib/demo/store";
import {
  PLANS,
  billingPeriodEnd,
  billingPrice,
  subscriptionGrantsAccess,
  type BillingInterval,
  type PlanId,
} from "@/lib/plans";
import { razorpayPlanIdFor } from "@/lib/payments/plan-ids";
import type { SessionContext } from "@/lib/session";
import type { Payment, Subscription } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  cancelSubscription as cancelRazorpaySubscription,
  createOrder,
  createSubscription as createRazorpaySubscription,
  fetchPayment,
  fetchSubscription,
  RazorpayError,
  verifyPaymentSignature,
  verifySubscriptionSignature,
} from "@/lib/payments/razorpay";

/**
 * Subscription lifecycle.
 *
 * Rules enforced here:
 *  - The browser never decides which plan the user gets.
 *  - Payment signatures are verified server-side, then the payment is re-fetched
 *    from Razorpay and its amount/status re-checked before any upgrade.
 *  - Activations are idempotent: a replayed webhook or double confirm is a no-op.
 */

export interface CheckoutSession {
  mode: "subscription" | "order" | "mock";
  keyId: string | null;
  plan: PlanId;
  amountInr: number;
  billing: BillingInterval;
  providerSubscriptionId?: string | null;
  providerOrderId?: string | null;
  prefill?: { email?: string | null; name?: string | null };
  message?: string;
}

export async function getSubscription(context: SessionContext): Promise<Subscription | null> {
  if (!context.user) return null;
  if (context.demo) return demoStore().subscription;
  const { data } = await context.db!
    .from("subscriptions")
    .select("*")
    .eq("user_id", context.user.id)
    .maybeSingle();
  return (data as unknown as Subscription | null) ?? null;
}

export function paymentsAvailable() {
  return razorpayConfigured();
}

/**
 * Mock checkout is available in demo mode, or in non-production deployments
 * that explicitly opt in with ALLOW_MOCK_CHECKOUT=true. It is never implicit in
 * production, so a real deployment can never hand out paid plans for free.
 */
export function mockCheckoutAvailable() {
  if (demoMode()) return true;
  if (process.env.NODE_ENV === "production") return false;
  return serverEnv.allowMockCheckout;
}

export async function startCheckout(
  context: SessionContext,
  input: { plan: Exclude<PlanId, "free">; billing: BillingInterval },
): Promise<CheckoutSession> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  const plan = PLANS[input.plan];
  if (!plan || plan.priceInr <= 0) {
    throw new ApiError("BAD_REQUEST", "That plan cannot be purchased.");
  }

  const currentPlan = context.plan;
  const currentSubscription = await getSubscription(context);
  if (currentPlan === input.plan) {
    if (currentSubscription?.billing_interval === input.billing) {
      throw new ApiError("CONFLICT", `You're already on the ${plan.name} ${input.billing} plan.`);
    }
    throw new ApiError(
      "CONFLICT",
      `Your ${plan.name} subscription is already active. Cancel it first; you can switch billing frequency when the current period ends.`,
    );
  }
  if (currentPlan !== "free" && currentSubscription && subscriptionGrantsAccess(currentSubscription)) {
    throw new ApiError(
      "CONFLICT",
      `Your ${PLANS[currentPlan].name} subscription is still active. Cancel it before starting ${plan.name} so you are never charged for two plans at once.`,
    );
  }

  const amountInr = billingPrice(input.plan, input.billing);

  // Mock/dev path — clearly separated from production payment logic.
  if (!razorpayConfigured()) {
    if (mockCheckoutAvailable()) {
      return {
        mode: "mock",
        keyId: null,
        plan: input.plan,
        amountInr,
        message:
          "Razorpay is not configured on this deployment. This is a development activation — no money moves.",
      };
    }
    throw new ApiError(
      "NOT_CONFIGURED",
      "Payments are not configured yet. Please contact support if this is unexpected.",
    );
  }

  // Paid plans are always true recurring subscriptions. We deliberately do not
  // fall back to a one-time order because that would silently turn a monthly or
  // yearly SaaS plan into a different product with different lifecycle rules.
  const razorpayPlanId = razorpayPlanIdFor(input.plan, input.billing);
  if (!razorpayPlanId) {
    throw new ApiError(
      "NOT_CONFIGURED",
      `The Razorpay ${plan.name} ${input.billing} plan is not configured yet. No payment was started.`,
      { plan: input.plan, billing: input.billing },
    );
  }

  try {
    const subscription = await createRazorpaySubscription({
      planId: razorpayPlanId,
      notes: { user_id: context.user.id, plan: input.plan, billing: input.billing },
    });
    await upsertSubscription(context, {
      plan: "free",
      status: "created",
      provider: "razorpay",
      providerSubscriptionId: subscription.id,
      providerPlanId: razorpayPlanId,
      billingInterval: input.billing,
      amountInr,
    });
    return {
      mode: "subscription",
      keyId: serverEnv.razorpayKeyId,
      plan: input.plan,
      amountInr,
      billing: input.billing,
      providerSubscriptionId: subscription.id,
      prefill: { email: context.user.email, name: context.profile?.full_name ?? null },
    };
  } catch (error) {
    console.error("[payments] subscription create failed:", error);
    if (error instanceof RazorpayError && error.status >= 400 && error.status < 500) {
      throw new ApiError(
        "SERVER_ERROR",
        "The payment provider rejected this subscription setup. Please try again or contact support.",
      );
    }
    throw new ApiError(
      "SERVER_ERROR",
      "The payment provider is temporarily unavailable. Please try again in a moment.",
    );
  }
}

/* ------------------------------------------------------------------ */
/* Confirmation (checkout handshake)                                   */
/* ------------------------------------------------------------------ */

export async function confirmOrderPayment(
  context: SessionContext,
  input: {
    plan: Exclude<PlanId, "free">;
    orderId: string;
    paymentId: string;
    signature: string;
    billing: BillingInterval;
  },
) {
  if (!context.user) throw new ApiError("UNAUTHORIZED");
  if (!razorpayConfigured()) throw new ApiError("NOT_CONFIGURED", "Payments are not configured.");

  const valid = verifyPaymentSignature({
    orderId: input.orderId,
    paymentId: input.paymentId,
    signature: input.signature,
  });
  if (!valid) {
    await recordPayment(context, {
      plan: input.plan,
      amountInr: PLANS[input.plan].priceInr,
      status: "failed",
      orderId: input.orderId,
      paymentId: input.paymentId,
      signatureVerified: false,
    });
    throw new ApiError("BAD_REQUEST", "We couldn't verify that payment. No plan was changed.");
  }

  // Defence in depth: confirm with Razorpay that the payment really was captured
  // and that the amount matches this plan.
  const payment = await fetchPayment(input.paymentId);
  const expectedPaise = billingPrice(input.plan, input.billing) * 100;

  if (payment.status !== "captured" && payment.status !== "authorized") {
    throw new ApiError("BAD_REQUEST", "That payment was not completed. No plan was changed.");
  }
  if (payment.amount < expectedPaise) {
    throw new ApiError("BAD_REQUEST", "The payment amount did not match the plan. Please contact support.");
  }

  await activatePlan(context, {
    plan: input.plan,
    provider: "razorpay",
    providerPaymentId: input.paymentId,
    amountInr: Math.round(payment.amount / 100),
    paymentOrderId: input.orderId,
    billingInterval: input.billing,
    status: "captured",
  });

  return { plan: input.plan };
}

export async function confirmSubscriptionPayment(
  context: SessionContext,
  input: {
    subscriptionId: string;
    paymentId: string;
    signature: string;
  },
) {
  if (!context.user) throw new ApiError("UNAUTHORIZED");
  if (!razorpayConfigured()) throw new ApiError("NOT_CONFIGURED", "Payments are not configured.");

  const valid = verifySubscriptionSignature({
    paymentId: input.paymentId,
    subscriptionId: input.subscriptionId,
    signature: input.signature,
  });
  if (!valid) {
    throw new ApiError("BAD_REQUEST", "We couldn't verify that payment. No plan was changed.");
  }

  const pending = context.subscription;
  if (!pending?.provider_subscription_id || pending.provider_subscription_id !== input.subscriptionId) {
    throw new ApiError("FORBIDDEN", "That payment session does not belong to this account.");
  }

  const subscription = await fetchSubscription(input.subscriptionId);
  const planId = planFromNotes(subscription.notes);
  const billing = billingFromNotes(subscription.notes);
  if (!planId || !billing) {
    throw new ApiError("BAD_REQUEST", "We couldn't match that subscription to a valid Starvia plan.");
  }

  const payment = await fetchPayment(input.paymentId);
  const expectedPaise = billingPrice(planId, billing) * 100;
  if (payment.status !== "captured" && payment.status !== "authorized") {
    throw new ApiError("BAD_REQUEST", "That payment was not completed. No plan was changed.");
  }
  if (payment.amount < expectedPaise) {
    throw new ApiError("BAD_REQUEST", "The payment amount did not match the selected plan. No plan was changed.");
  }

  await activatePlan(context, {
    plan: planId,
    provider: "razorpay",
    providerSubscriptionId: subscription.id,
    providerPaymentId: input.paymentId,
    providerPlanId: subscription.plan_id,
    billingInterval: billing,
    amountInr: Math.round(payment.amount / 100),
    periodEnd: subscription.current_end ? new Date(subscription.current_end * 1000) : null,
    periodStart: subscription.current_start ? new Date(subscription.current_start * 1000) : null,
    status: "captured",
  });

  return { plan: planId };
}

/** Development-only activation. Never reachable in production. */
export async function mockActivate(context: SessionContext, plan: PlanId) {
  if (!mockCheckoutAvailable()) {
    throw new ApiError(
      "NOT_CONFIGURED",
      "Payments are not configured. Set the Razorpay keys in your environment to enable checkout.",
    );
  }
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  if (plan === "free") {
    await activatePlan(context, {
      plan: "free",
      provider: context.demo ? "mock" : "razorpay",
      periodEnd: null,
      amountInr: 0,
      status: "captured",
      isMock: true,
    });
    return { plan: "free" as PlanId };
  }

  await activatePlan(context, {
    plan,
    provider: "mock",
    billingInterval: "monthly",
    periodEnd: billingPeriodEnd(new Date(), "monthly"),
    amountInr: PLANS[plan].priceInr,
    status: "captured",
    isMock: true,
  });

  return { plan };
}

/* ------------------------------------------------------------------ */
/* Activation / cancellation                                           */
/* ------------------------------------------------------------------ */

export async function activatePlan(
  context: SessionContext,
  input: {
    plan: PlanId;
    provider: Subscription["provider"];
    providerSubscriptionId?: string | null;
    providerPaymentId?: string | null;
    providerPlanId?: string | null;
    billingInterval?: BillingInterval | null;
    amountInr: number;
    periodStart?: Date | null;
    periodEnd?: Date | null;
    paymentOrderId?: string | null;
    status?: Payment["status"];
    isMock?: boolean;
  },
) {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  const now = new Date();
  const periodEnd =
    input.plan === "free"
      ? null
      : (input.periodEnd ?? billingPeriodEnd(now, input.billingInterval ?? "monthly")).toISOString();

  if (context.demo) {
    const store = demoStore();
    store.subscription = {
      ...store.subscription,
      plan: input.plan,
      status: input.plan === "free" ? "cancelled" : "active",
      provider: input.provider,
      provider_subscription_id: input.providerSubscriptionId ?? null,
      provider_payment_id: input.providerPaymentId ?? null,
      current_period_start: (input.periodStart ?? now).toISOString(),
      current_period_end: periodEnd,
      cancel_at_period_end: false,
      cancelled_at: null,
      amount_inr: input.amountInr,
      updated_at: now.toISOString(),
    };
    if (input.plan !== "free") {
      store.payments.unshift({
        id: demoId("a"),
        user_id: context.user.id,
        amount_inr: input.amountInr,
        currency: "INR",
        status: input.status ?? "captured",
        provider: input.provider === "mock" ? "mock" : "razorpay",
        order_id: input.paymentOrderId ?? null,
        payment_id: input.providerPaymentId ?? null,
        subscription_id: input.providerSubscriptionId ?? null,
        signature_verified: !input.isMock,
        notes: { demo: true },
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
    }
    return { plan: input.plan };
  }

  const client = context.admin ?? context.db;
  if (!client) throw new ApiError("SERVER_ERROR");

  const subscriptionId = await upsertSubscription(context, {
    plan: input.plan,
    status: input.plan === "free" ? "cancelled" : "active",
    provider: input.provider,
    providerSubscriptionId: input.providerSubscriptionId ?? null,
    providerPlanId: input.providerPlanId ?? null,
    billingInterval: input.billingInterval ?? (input.plan === "free" ? null : "monthly"),
    providerPaymentId: input.providerPaymentId ?? null,
    amountInr: input.amountInr,
    periodStart: (input.periodStart ?? now).toISOString(),
    periodEnd,
  });

  if (input.plan !== "free") {
    await recordPayment(context, {
      plan: input.plan,
      amountInr: input.amountInr,
      status: input.status ?? "captured",
      orderId: input.paymentOrderId ?? null,
      paymentId: input.providerPaymentId ?? null,
      subscriptionId,
      signatureVerified: !input.isMock,
    });
  }

  return { plan: input.plan };
}

export async function cancelPlan(
  context: SessionContext,
  options: { immediate?: boolean } = {},
) {
  if (!context.user) throw new ApiError("UNAUTHORIZED");
  const subscription = await getSubscription(context);
  if (!subscription || subscription.plan === "free") {
    throw new ApiError("CONFLICT", "You don't have an active paid plan to cancel.");
  }

  const providerSubscriptionId = subscription.provider_subscription_id;

  if (providerSubscriptionId && razorpayConfigured() && subscription.provider === "razorpay") {
    try {
      await cancelRazorpaySubscription(providerSubscriptionId, { atCycleEnd: !options.immediate });
    } catch (error) {
      console.error("[payments] cancel failed:", error);
      throw new ApiError(
        "SERVER_ERROR",
        "We couldn't cancel with the payment provider. Please try again or contact support.",
      );
    }
  }

  const now = new Date();
  const keepUntilEnd = !options.immediate && subscription.current_period_end;

  if (context.demo) {
    const store = demoStore();
    store.subscription = {
      ...store.subscription,
      status: keepUntilEnd ? "active" : "cancelled",
      cancel_at_period_end: Boolean(keepUntilEnd),
      cancelled_at: now.toISOString(),
      ...(keepUntilEnd ? {} : { plan: "free" as PlanId, current_period_end: now.toISOString() }),
      updated_at: now.toISOString(),
    };
    return { plan: keepUntilEnd ? store.subscription.plan : ("free" as PlanId) };
  }

  await upsertSubscription(context, {
    plan: keepUntilEnd ? (subscription.plan as PlanId) : "free",
    status: keepUntilEnd ? "active" : "cancelled",
    provider: subscription.provider,
    providerSubscriptionId,
    providerPaymentId: subscription.provider_payment_id,
    amountInr: subscription.amount_inr ?? 0,
    billingInterval: (subscription.billing_interval as BillingInterval | null) ?? "monthly",
    providerPlanId: subscription.provider_plan_id,
    periodStart: subscription.current_period_start,
    periodEnd: keepUntilEnd ? subscription.current_period_end : now.toISOString(),
    cancelAtPeriodEnd: Boolean(keepUntilEnd),
    cancelledAt: now.toISOString(),
  });

  return { plan: keepUntilEnd ? (subscription.plan as PlanId) : "free" };
}

async function upsertSubscription(
  context: SessionContext,
  input: {
    plan: PlanId;
    status: Subscription["status"];
    provider: Subscription["provider"];
    providerSubscriptionId?: string | null;
    providerPaymentId?: string | null;
    providerPlanId?: string | null;
    billingInterval?: BillingInterval | null;
    amountInr: number;
    periodStart?: string | null;
    periodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
    cancelledAt?: string | null;
  },
) {
  if (!context.user) return;
  const client = context.admin ?? context.db;
  if (!client) return;

  const payload = {
    user_id: context.user.id,
    plan: input.plan,
    status: input.status,
    provider: input.provider,
    provider_subscription_id: input.providerSubscriptionId ?? null,
    provider_payment_id: input.providerPaymentId ?? null,
    provider_plan_id: input.providerPlanId ?? null,
    billing_interval: input.billingInterval ?? null,
    amount_inr: input.amountInr,
    current_period_start: input.periodStart ?? null,
    current_period_end: input.periodEnd ?? null,
    cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
    cancelled_at: input.cancelledAt ?? null,
    currency: "INR",
  };

  const { data, error } = await client
    .from("subscriptions")
    .upsert(payload, { onConflict: "user_id" })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[payments] upsertSubscription:", error?.message);
    throw new ApiError("SERVER_ERROR", "Could not update your subscription. Please contact support.");
  }
  return data.id as string;
}

async function recordPayment(
  context: SessionContext,
  input: {
    plan: PlanId;
    amountInr: number;
    status: Payment["status"];
    orderId: string | null;
    paymentId: string | null;
    subscriptionId?: string | null;
    signatureVerified: boolean;
  },
) {
  if (!context.user) return;
  const client = context.admin ?? context.db;
  if (!client) return;

  const payload = {
    user_id: context.user.id,
    amount_inr: input.amountInr,
    currency: "INR",
    status: input.status,
    provider: "razorpay" as const,
    order_id: input.orderId,
    payment_id: input.paymentId,
    subscription_id: input.subscriptionId ?? null,
    signature_verified: input.signatureVerified,
    notes: { plan: input.plan },
  };

  // The unique index on payment_id makes replayed callbacks safe.
  const { error } = await client
    .from("payments")
    .upsert(payload, { onConflict: "payment_id", ignoreDuplicates: true });

  if (error) console.error("[payments] recordPayment:", error.message);
}

/* ------------------------------------------------------------------ */
/* Webhook handling                                                    */
/* ------------------------------------------------------------------ */

export interface WebhookResult {
  handled: boolean;
  action: string;
  userId?: string | null;
}

/**
 * Processes a verified Razorpay webhook. Every branch is idempotent, so a
 * retried delivery cannot double-apply a plan change.
 */
export async function handleWebhookEvent(event: {
  event: string;
  payload?: Record<string, unknown>;
}): Promise<WebhookResult> {
  const admin = getAdminClient();
  if (!admin) {
    return { handled: false, action: "no_admin_client" };
  }

  const eventName = event.event;
  const subscriptionEntity = pick(event.payload, ["subscription", "entity"]) as
    | { id?: string; status?: string; current_end?: number; notes?: Record<string, string> }
    | undefined;

  const paymentEntity = pick(event.payload, ["payment", "entity"]) as
    | {
        id?: string;
        amount?: number;
        status?: string;
        order_id?: string;
        subscription_id?: string;
        notes?: Record<string, string>;
        email?: string;
      }
    | undefined;

  switch (eventName) {
    case "subscription.activated":
    case "subscription.authenticated":
    case "subscription.charged": {
      const userId = subscriptionEntity?.notes?.user_id ?? paymentEntity?.notes?.user_id ?? null;
      const plan = (subscriptionEntity?.notes?.plan ?? paymentEntity?.notes?.plan ?? null) as PlanId | null;
      if (!userId || !plan || plan === "free") {
        return { handled: false, action: "missing_notes", userId };
      }
      await applySubscriptionForUser(admin, userId, {
        plan,
        status: eventName === "subscription.charged" ? "active" : "authenticated",
        providerSubscriptionId: subscriptionEntity?.id ?? null,
        providerPaymentId: paymentEntity?.id ?? null,
        periodEnd: subscriptionEntity?.current_end
          ? new Date(subscriptionEntity.current_end * 1000).toISOString()
          : null,
        amountInr: plan ? PLANS[plan].priceInr : 0,
      });
      if (paymentEntity?.id && paymentEntity.status === "captured") {
        await recordPaymentForUser(admin, userId, {
          plan,
          amountInr: Math.round((paymentEntity.amount ?? 0) / 100),
          paymentId: paymentEntity.id,
          subscriptionId: subscriptionEntity?.id ?? null,
          orderId: paymentEntity.order_id ?? null,
        });
      }
      return { handled: true, action: eventName, userId };
    }

    case "subscription.pending":
    case "subscription.halted": {
      const userId = subscriptionEntity?.notes?.user_id ?? null;
      if (!userId) return { handled: false, action: "missing_notes" };
      await admin
        .from("subscriptions")
        .update({ status: eventName === "subscription.halted" ? "halted" : "pending" })
        .eq("user_id", userId);
      return { handled: true, action: eventName, userId };
    }

    case "subscription.cancelled":
    case "subscription.completed":
    case "subscription.expired": {
      const userId = subscriptionEntity?.notes?.user_id ?? null;
      if (!userId) return { handled: false, action: "missing_notes" };
      await admin
        .from("subscriptions")
        .update({
          plan: "free",
          status: eventName === "subscription.completed" ? "completed" : "cancelled",
          cancelled_at: new Date().toISOString(),
          current_period_end: new Date().toISOString(),
          cancel_at_period_end: false,
        })
        .eq("user_id", userId);
      return { handled: true, action: eventName, userId };
    }

    case "payment.captured": {
      const userId = paymentEntity?.notes?.user_id ?? null;
      const plan = (paymentEntity?.notes?.plan ?? null) as PlanId | null;
      if (!userId || !plan || plan === "free") {
        return { handled: false, action: "missing_notes", userId };
      }
      await recordPaymentForUser(admin, userId, {
        plan,
        amountInr: Math.round((paymentEntity?.amount ?? 0) / 100),
        paymentId: paymentEntity?.id ?? null,
        subscriptionId: paymentEntity?.subscription_id ?? null,
        orderId: paymentEntity?.order_id ?? null,
      });
      return { handled: true, action: eventName, userId };
    }

    case "payment.failed": {
      const userId = paymentEntity?.notes?.user_id ?? null;
      if (userId && paymentEntity?.id) {
        await admin.from("payments").upsert(
          {
            user_id: userId,
            amount_inr: Math.round((paymentEntity.amount ?? 0) / 100),
            currency: "INR",
            status: "failed",
            provider: "razorpay",
            order_id: paymentEntity.order_id ?? null,
            payment_id: paymentEntity.id,
            subscription_id: paymentEntity.subscription_id ?? null,
            signature_verified: true,
            notes: {},
          },
          { onConflict: "payment_id", ignoreDuplicates: true },
        );
      }
      return { handled: true, action: eventName, userId };
    }

    default:
      return { handled: false, action: eventName };
  }
}

function getAdminClient() {
  return getSupabaseAdmin();
}

async function applySubscriptionForUser(
  admin: NonNullable<ReturnType<typeof getAdminClient>>,
  userId: string,
  input: {
    plan: PlanId;
    status: Subscription["status"];
    providerSubscriptionId: string | null;
    providerPaymentId: string | null;
    periodEnd: string | null;
    amountInr: number;
  },
) {
  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      plan: input.plan,
      status: input.status,
      provider: "razorpay",
      provider_subscription_id: input.providerSubscriptionId,
      provider_payment_id: input.providerPaymentId,
      amount_inr: input.amountInr,
      currency: "INR",
      current_period_start: new Date().toISOString(),
      current_period_end: input.periodEnd,
      cancel_at_period_end: false,
      cancelled_at: null,
    },
    { onConflict: "user_id" },
  );
  if (error) console.error("[payments] applySubscriptionForUser:", error.message);
}

async function recordPaymentForUser(
  admin: NonNullable<ReturnType<typeof getAdminClient>>,
  userId: string,
  input: {
    plan: PlanId;
    amountInr: number;
    paymentId: string | null;
    subscriptionId: string | null;
    orderId: string | null;
  },
) {
  await admin.from("payments").upsert(
    {
      user_id: userId,
      amount_inr: input.amountInr,
      currency: "INR",
      status: "captured",
      provider: "razorpay",
      order_id: input.orderId,
      payment_id: input.paymentId,
      subscription_id: input.subscriptionId,
      signature_verified: true,
      notes: { plan: input.plan },
    },
    { onConflict: "payment_id", ignoreDuplicates: true },
  );
}

function planFromNotes(notes?: Record<string, string>) {
  const plan = notes?.plan;
  return plan === "pro" || plan === "ultra" ? (plan as PlanId) : null;
}

function planFromSubscription(context: SessionContext) {
  const plan = context.subscription?.plan;
  return plan === "pro" || plan === "ultra" ? (plan as PlanId) : null;
}

function pick(source: Record<string, unknown> | undefined, path: string[]) {
  let current: unknown = source;
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export { RazorpayError };
