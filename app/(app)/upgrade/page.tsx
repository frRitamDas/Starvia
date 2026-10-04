import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, HelpCircle } from "lucide-react";

import { BillingPanel, PlanGrid } from "@/components/payments/upgrade-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSubscription, mockCheckoutAvailable, paymentsAvailable } from "@/lib/payments/service";
import { AI_FEATURES, FEATURE_LABELS, PLANS, PLAN_ORDER } from "@/lib/plans";
import { requireOnboarded } from "@/lib/session";
import { getUsageSummary } from "@/lib/usage";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Plans & pricing",
  description: "Upgrade Starvia for more daily AI help, advanced exam prep and full analytics.",
  robots: { index: false, follow: false },
};

export default async function UpgradePage() {
  const context = await requireOnboarded();
  const [subscription, usage] = await Promise.all([
    getSubscription(context),
    getUsageSummary(context),
  ]);

  let payments: {
    id: string;
    amount_inr: number;
    status: string;
    created_at: string;
    payment_id: string | null;
  }[] = [];

  if (context.db) {
    const { data } = await context.db
      .from("payments")
      .select("id, amount_inr, status, created_at, payment_id")
      .eq("user_id", context.user?.id ?? "")
      .order("created_at", { ascending: false })
      .limit(12);
    payments = data ?? [];
  }

  const periodEnd = subscription?.current_period_end ?? null;

  return (
    <div className="space-y-8">
      <section className="space-y-2 text-center">
        <Badge variant="secondary" className="mx-auto w-fit">
          Plans
        </Badge>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">
          Study more, fight fewer limits
        </h1>
        <p className="mx-auto max-w-xl text-sm text-muted-foreground">
          Start free. Upgrade only when you need more AI help — cancel any time and your access lasts
          until the end of the paid period.
        </p>
      </section>

      <section id="plans" className="scroll-mt-24">
        <PlanGrid
          currentPlan={context.plan}
          paymentsAvailable={paymentsAvailable()}
          mockAvailable={mockCheckoutAvailable()}
          signedIn
        />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">What you get each day</h2>
        <div className="overflow-x-auto rounded-2xl border border-border/70">
          <table className="w-full min-w-[560px] text-left text-[12.5px]">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 font-medium">Feature</th>
                {PLAN_ORDER.map((planId) => (
                  <th key={planId} className="px-4 py-3 font-medium">
                    {PLANS[planId].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AI_FEATURES.map((feature) => (
                <tr key={feature} className="border-t border-border/60">
                  <td className="px-4 py-2.5">{FEATURE_LABELS[feature]}</td>
                  {PLAN_ORDER.map((planId) => {
                    const limit = PLANS[planId].limits[feature];
                    return (
                      <td key={planId} className="px-4 py-2.5">
                        {limit === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="font-medium">{limit}/day</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t border-border/60">
                <td className="px-4 py-2.5">Advanced exam prep & deep analytics</td>
                {PLAN_ORDER.map((planId) => (
                  <td key={planId} className="px-4 py-2.5">
                    {PLANS[planId].capabilities.advancedExamPrep ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-border/60">
                <td className="px-4 py-2.5">Priority AI (faster, larger responses)</td>
                {PLAN_ORDER.map((planId) => (
                  <td key={planId} className="px-4 py-2.5">
                    {PLANS[planId].capabilities.priorityAi ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-border/60">
                <td className="px-4 py-2.5">Price (yearly, per month)</td>
                {PLAN_ORDER.map((planId) => (
                  <td key={planId} className="px-4 py-2.5">
                    {PLANS[planId].priceInr === 0
                      ? "Free"
                      : `₹${PLANS[planId].yearlyPriceInr}/mo`}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Your usage today</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AI_FEATURES.map((feature) => {
            const item = usage.usage[feature];
            if (item.limit === 0) return null;
            return (
              <Card key={feature} className="p-4">
                <p className="text-[12px] text-muted-foreground">{FEATURE_LABELS[feature]}</p>
                <p className="mt-1 font-display text-lg font-semibold">
                  {item.used}
                  <span className="text-[12.5px] font-normal text-muted-foreground">
                    /{item.limit}
                  </span>
                </p>
              </Card>
            );
          })}
        </div>
        <Alert variant="info">
          <HelpCircle className="size-4" />
          <AlertDescription>
            Limits reset at midnight IST.{" "}
            <Link href="/faq" className="font-medium underline">
              Read the FAQ
            </Link>{" "}
            for how billing and refunds work.
          </AlertDescription>
        </Alert>
      </section>

      <BillingPanel
        currentPlan={context.plan}
        status={subscription?.status ?? null}
        periodEnd={periodEnd}
        payments={payments}
        mockAvailable={mockCheckoutAvailable()}
      />

      <section className="space-y-3 pb-2">
        <h2 className="font-display text-lg font-semibold">Questions before you upgrade?</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/pricing">Full pricing details</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Talk to support</Link>
          </Button>
          {periodEnd ? (
            <p className="self-center text-[12px] text-muted-foreground">
              Current period ends {formatDate(periodEnd)}.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
