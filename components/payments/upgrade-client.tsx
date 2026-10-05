"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  CreditCard,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiFetch, ApiClientError } from "@/lib/client/api";
import { AI_FEATURES, FEATURE_LABELS, PLANS, PLAN_ORDER, billingPrice, type BillingInterval, type PlanId } from "@/lib/plans";
import { cn, formatDate, formatPrice } from "@/lib/utils";

/* ------------------------- Razorpay script loading ------------------------ */

interface RazorpayCheckoutResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  subscription_id?: string;
  amount?: number;
  prefill?: { name?: string | null; email?: string | null };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
  handler: (response: RazorpayCheckoutResponse) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

const SCRIPT_ID = "razorpay-checkout-js";

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/* ------------------------------- plan cards ------------------------------ */

function limitSummary(planId: PlanId) {
  const limits = PLANS[planId].limits;
  return AI_FEATURES.filter((feature) => limits[feature] > 0).map((feature) => ({
    label: `${limits[feature]} ${FEATURE_LABELS[feature].toLowerCase()}`,
  }));
}

export function PlanGrid({
  currentPlan,
  paymentsAvailable,
  mockAvailable,
  signedIn,
  recurringPlans,
}: {
  currentPlan: PlanId;
  paymentsAvailable: boolean;
  mockAvailable: boolean;
  signedIn: boolean;
  recurringPlans: {
    proMonthly: boolean;
    proYearly: boolean;
    ultraMonthly: boolean;
    ultraYearly: boolean;
  };
}) {
  const router = useRouter();
  const [billing, setBilling] = React.useState<BillingInterval>("monthly");
  const [busy, setBusy] = React.useState<PlanId | null>(null);

  async function verifyPayment(
    response: RazorpayCheckoutResponse,
    plan: PlanId,
    mode: "subscription" | "order",
  ) {
    try {
      await apiFetch("/api/payments/verify", {
        method: "POST",
        json: {
          plan: plan === "free" ? undefined : plan,
          billing,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_subscription_id: response.razorpay_subscription_id ?? undefined,
        },
      });
      toast.success(
        mode === "subscription"
          ? "Payment successful — your subscription is active."
          : "Payment successful — your plan is active.",
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Payment could not be completed. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function upgrade(plan: PlanId) {
    if (!signedIn) {
      router.push("/signup?next=/upgrade");
      return;
    }
    if (plan === "free" || plan === currentPlan) return;

    setBusy(plan);
    try {
      const { checkout } = await apiFetch<{
        checkout: {
          mode: "subscription" | "order" | "mock";
          keyId: string | null;
          plan: PlanId;
          amountInr: number;
          billing: BillingInterval;
          providerSubscriptionId?: string | null;
          providerOrderId?: string | null;
          prefill?: { email?: string | null; name?: string | null };
          message?: string;
        };
      }>("/api/payments/checkout", {
        method: "POST",
        json: { plan, billing },
      });

      const mode = checkout.mode;

      /* Development activation — clearly separated from production payments. */
      if (mode === "mock") {
        await apiFetch("/api/payments/mock", { method: "POST", json: { plan, action: "activate" } });
        toast.success(`${PLANS[plan].name} activated in test mode — no payment was taken.`);
        router.refresh();
        setBusy(null);
        return;
      }

      const ready = await loadRazorpay();
      if (!ready || !window.Razorpay || !checkout.keyId) {
        toast.error("Could not open the payment window. Please try again in a moment.");
        setBusy(null);
        return;
      }

      const options: RazorpayOptions = {
        key: checkout.keyId,
        currency: "INR",
        name: "Starvia",
        description: `${PLANS[plan].name} · ${billing === "yearly" ? "annual" : "monthly"} subscription`,
        prefill: checkout.prefill,
        notes: { plan },
        theme: { color: "#6366f1" },
        modal: { ondismiss: () => setBusy(null) },
        handler: (response) => void verifyPayment(response, plan, mode),
      };

      if (mode === "subscription" && checkout.providerSubscriptionId) {
        options.subscription_id = checkout.providerSubscriptionId;
      } else {
        options.order_id = checkout.providerOrderId ?? undefined;
        options.amount = Math.round(checkout.amountInr * 100);
      }

      new window.Razorpay(options).open();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Payment could not be completed. Please try again.",
      );
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="inline-flex rounded-full border border-border/70 bg-card p-1">
          {(["monthly", "yearly"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setBilling(value)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[12.5px] font-medium capitalize transition-colors",
                billing === value ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {value}
            </button>
          ))}
        </div>
        <Badge variant="success">Save 2 months on yearly</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const active = planId === currentPlan;
          const recurringConfigured =
            planId === "free" ||
            (planId === "pro"
              ? billing === "yearly"
                ? recurringPlans.proYearly
                : recurringPlans.proMonthly
              : billing === "yearly"
                ? recurringPlans.ultraYearly
                : recurringPlans.ultraMonthly);
          const price = billingPrice(plan.id, billing);
          const limits = limitSummary(planId);

          return (
            <Card
              key={planId}
              className={cn(
                "relative flex flex-col",
                plan.marketing.badge && "border-primary/35 shadow-glow",
              )}
            >
              {plan.marketing.badge ? (
                <Badge variant="gradient" className="absolute -top-3 left-5">
                  {plan.marketing.badge}
                </Badge>
              ) : null}

              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  {plan.name}
                  {active ? <Badge variant="success">Current plan</Badge> : null}
                </CardTitle>
                <p className="text-[12.5px] text-muted-foreground">{plan.tagline}</p>
                <p className="pt-1 font-display text-2xl font-semibold">
                  {plan.priceInr === 0 ? "Free" : formatPrice(billing === "yearly" ? price : plan.priceInr)}
                  {plan.priceInr > 0 ? (
                    <span className="text-[12.5px] font-normal text-muted-foreground">
                      /{billing === "yearly" ? "year" : "month"}
                    </span>
                  ) : null}
                </p>
                {plan.priceInr > 0 && billing === "yearly" ? (
                  <p className="text-[11.5px] text-muted-foreground">
                    {formatPrice(price / 12)} / month effective · billed {formatPrice(price)} yearly
                  </p>
                ) : plan.priceInr > 0 ? (
                  <p className="text-[11.5px] text-muted-foreground">Renews monthly until cancelled</p>
                ) : null}
              </CardHeader>

              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <ul className="space-y-1.5">
                  {(plan.marketing.highlights.length ? plan.marketing.highlights : limits.map((item) => item.label))
                    .slice(0, 6)
                    .map((item) => (
                      <li key={item} className="flex gap-2 text-[12.5px]">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                        <span>{item}</span>
                      </li>
                    ))}
                </ul>

                {planId === "free" ? (
                  <Button variant="outline" asChild disabled={active}>
                    <Link href={active ? "/dashboard" : "/signup"}>{active ? "Current plan" : "Start free"}</Link>
                  </Button>
                ) : (
                  <Button
                    variant={plan.marketing.badge ? "gradient" : "default"}
                    disabled={active || busy !== null || !recurringConfigured}
                    onClick={() => upgrade(planId)}
                  >
                    {busy === planId ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    {active
                      ? "Current plan"
                      : !recurringConfigured
                        ? (billing === "yearly" ? "Yearly billing not configured" : "Monthly billing not configured")
                        : `Upgrade to ${plan.name}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {paymentsAvailable &&
      ((billing === "yearly" && (!recurringPlans.proYearly || !recurringPlans.ultraYearly)) ||
        (billing === "monthly" && (!recurringPlans.proMonthly || !recurringPlans.ultraMonthly))) ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning/[0.06] p-4 text-[12.5px]">
          <AlertTriangle className="size-4 shrink-0 text-warning" />
          <p className="min-w-0 flex-1">
            {billing === "yearly"
              ? "Annual checkout is not fully configured yet. Configure the Pro and Ultra yearly Razorpay plans before accepting annual subscriptions."
              : "Monthly checkout is not fully configured yet. Configure the Pro and Ultra monthly Razorpay plans before accepting monthly subscriptions."}
          </p>
        </div>
      ) : null}
      {!paymentsAvailable ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning/[0.06] p-4 text-[12.5px]">
          <AlertTriangle className="size-4 shrink-0 text-warning" />
          <p className="min-w-0 flex-1">
            {mockAvailable
              ? "Razorpay keys aren't configured on this deployment, so upgrades use a clearly-labelled test activation — no money moves. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to take real payments."
              : "Payments aren't configured on this deployment yet. Add the Razorpay keys to enable upgrades."}
          </p>
        </div>
      ) : (
        <p className="flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-success" />
          Payments are processed by Razorpay. Starvia never sees your card details.
        </p>
      )}
    </div>
  );
}

/* ------------------------------ billing panel ---------------------------- */

export function BillingPanel({
  currentPlan,
  status,
  periodEnd,
  billingInterval,
  payments,
  mockAvailable,
}: {
  currentPlan: PlanId;
  status: string | null;
  periodEnd: string | null;
  billingInterval: BillingInterval | null;
  payments: {
    id: string;
    amount_inr: number;
    status: string;
    created_at: string;
    payment_id: string | null;
  }[];
  mockAvailable: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function cancel() {
    setPending(true);
    try {
      const result = await apiFetch<{ effective: string; plan: PlanId }>("/api/payments/cancel", {
        method: "POST",
        json: {},
      });
      toast.success(
        periodEnd && result.effective === "period_end"
          ? `Cancelled — ${PLANS[currentPlan].name} stays active until ${formatDate(periodEnd)}.`
          : "Your plan has been cancelled.",
      );
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "NOT_CONFIGURED" && mockAvailable) {
        try {
          await apiFetch("/api/payments/mock", {
            method: "POST",
            json: { plan: currentPlan === "free" ? "pro" : currentPlan, action: "cancel" },
          });
          toast.success("Test subscription cancelled.");
          router.refresh();
          return;
        } catch {
          /* fall through to the generic message */
        }
      }
      toast.error(error instanceof ApiClientError ? error.message : "Payment could not be completed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card id="billing" className="scroll-mt-24">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <CreditCard className="size-4 text-primary" />
          Billing
          <Badge variant={currentPlan === "free" ? "secondary" : "success"} className="ml-auto capitalize">
            {PLANS[currentPlan].name} {status ? `· ${status.replace("_", " ")}` : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 p-4">
          <div>
            <p className="text-[13.5px] font-medium">{PLANS[currentPlan].name} plan</p>
            <p className="text-[12px] text-muted-foreground">
              {currentPlan === "free"
                ? "Free forever — upgrade any time for a bigger daily AI allowance."
                : periodEnd
                  ? `Renews ${billingInterval === "yearly" ? "yearly" : "monthly"} on ${formatDate(periodEnd)} · cancel any time.`
                  : "Active subscription"}
            </p>
          </div>

          {currentPlan !== "free" ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={pending}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Cancel plan
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel your {PLANS[currentPlan].name} plan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You&apos;ll keep every Pro feature until the end of the period you already paid for.
                    After that your account returns to the free plan — no further charges.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my plan</AlertDialogCancel>
                  <AlertDialogAction onClick={cancel}>Yes, cancel</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button size="sm" variant="gradient" asChild>
              <Link href="#plans">Compare plans</Link>
            </Button>
          )}
        </div>

        <div>
          <p className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            <BadgeCheck className="size-3.5" />
            Payment history
          </p>
          {payments.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground">
              No payments yet. Your invoices will appear here after your first upgrade.
            </p>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3.5 py-2.5 text-[12.5px]"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{formatPrice(payment.amount_inr)}</p>
                    <p className="truncate text-[11.5px] text-muted-foreground">
                      {formatDate(payment.created_at)}
                      {payment.payment_id ? ` · ${payment.payment_id}` : ""}
                    </p>
                  </div>
                  <Badge
                    variant={
                      payment.status === "captured" || payment.status === "paid"
                        ? "success"
                        : payment.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                    className="capitalize"
                  >
                    {payment.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
