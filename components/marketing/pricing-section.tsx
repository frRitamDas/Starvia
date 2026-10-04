"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

import { Odometer } from "@/components/motion/odometer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AI_FEATURES, FEATURE_LABELS, PLAN_ORDER, PLANS, type PlanId } from "@/lib/plans";
import { cn, formatPrice } from "@/lib/utils";

/**
 * Pricing display. Quotas come from lib/plans.ts (the same source the server
 * enforces), so the UI can never drift from the real limits.
 */
export function PricingSection({
  currentPlan,
  signedIn = false,
  className,
}: {
  currentPlan?: PlanId;
  signedIn?: boolean;
  className?: string;
}) {
  const [billing, setBilling] = React.useState<"monthly" | "yearly">("monthly");

  return (
    <div className={cn("space-y-10", className)}>
      <div className="flex flex-col items-center gap-3">
        <Tabs value={billing} onValueChange={(value) => setBilling(value as "monthly" | "yearly")}>
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly · 2 months free</TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-xs text-muted-foreground">
          Prices in INR, inclusive of applicable taxes. Cancel anytime.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = currentPlan === planId;
          const isFree = plan.priceInr === 0;
          const price =
            billing === "yearly" && plan.yearlyPriceInr ? plan.yearlyPriceInr : plan.priceInr;

          return (
            <Card
              key={plan.id}
              className={cn(
                "card-lift relative min-w-0 flex flex-col p-6 transition-shadow",
                plan.id === "pro" && "border-primary/40 shadow-glow",
              )}
            >
              {plan.marketing.badge ? (
                <Badge
                  variant={plan.id === "pro" ? "gradient" : "secondary"}
                  className="absolute -top-3 left-6"
                >
                  {plan.marketing.badge}
                </Badge>
              ) : null}

              <div className="space-y-1.5">
                <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.tagline}</p>
              </div>

              <div className="mt-5 flex min-w-0 items-end gap-1.5">
                {isFree ? (
                  <span className="font-display text-4xl font-semibold tracking-tight">Free</span>
                ) : (
                  <Odometer
                    value={price}
                    className="font-display text-4xl font-semibold tracking-tight"
                  />
                )}
                {!isFree && <span className="pb-1.5 text-sm text-muted-foreground">/month</span>}
              </div>
              {billing === "yearly" && !isFree ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Billed {formatPrice(plan.priceInr * 10)} yearly
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  {isFree ? "Free forever · no card needed" : "Billed monthly"}
                </p>
              )}

              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {plan.marketing.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    <span className="text-muted-foreground">{highlight}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                size="lg"
                variant={isCurrent ? "outline" : plan.id === "free" ? "secondary" : "gradient"}
                className="mt-6 w-full"
                disabled={isCurrent}
              >
                {isCurrent ? (
                  <span>Your current plan</span>
                ) : (
                  <Link href={signedIn ? `/upgrade?plan=${plan.id}` : `/signup?next=/upgrade?plan=${plan.id}`}>
                    {plan.id === "free" ? (
                      "Start free"
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        {`Upgrade to ${plan.name}`}
                      </>
                    )}
                  </Link>
                )}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Desktop comparison table; phones use cards so the page never scrolls sideways. */}
      <div className="hidden overflow-hidden rounded-2xl border border-border/70 sm:block">
        <table className="w-full table-fixed text-sm">
          <caption className="sr-only">Daily AI limits by plan</caption>
          <thead className="bg-muted/40">
            <tr>
              <th scope="col" className="w-[40%] px-4 py-3 text-left font-semibold">
                Daily limits
              </th>
              {PLAN_ORDER.map((planId) => (
                <th key={planId} scope="col" className="px-4 py-3 text-left font-semibold">
                  {PLANS[planId].name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AI_FEATURES.map((feature) => (
              <tr key={feature} className="border-t border-border/60">
                <th scope="row" className="px-4 py-3 text-left font-normal text-muted-foreground">
                  {FEATURE_LABELS[feature]}
                </th>
                {PLAN_ORDER.map((planId) => {
                  const value = PLANS[planId].limits[feature];
                  return (
                    <td key={planId} className="px-4 py-3 font-medium">
                      {value === 0 ? <span className="text-muted-foreground">—</span> : value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 sm:hidden">
        <p className="text-sm font-semibold">Daily AI limits</p>
        {AI_FEATURES.map((feature) => (
          <div key={feature} className="min-w-0 rounded-2xl border border-border/70 bg-card p-4">
            <p className="text-[13px] font-medium">{FEATURE_LABELS[feature]}</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {PLAN_ORDER.map((planId) => {
                const value = PLANS[planId].limits[feature];
                return (
                  <div key={planId} className="min-w-0 rounded-xl bg-muted/55 px-2 py-2.5 text-center">
                    <p className="truncate text-[10px] text-muted-foreground">{PLANS[planId].name}</p>
                    <p className="mt-0.5 text-sm font-semibold">{value === 0 ? "—" : value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
