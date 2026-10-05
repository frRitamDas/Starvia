import { CheckCircle2, CircleAlert, CreditCard } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  recurringPlans: {
    proMonthly: boolean;
    proYearly: boolean;
    ultraMonthly: boolean;
    ultraYearly: boolean;
  };
};

export function BillingConfigurationCard({ recurringPlans }: Props) {
  const entries = [
    ["Pro monthly", recurringPlans.proMonthly],
    ["Pro yearly", recurringPlans.proYearly],
    ["Ultra monthly", recurringPlans.ultraMonthly],
    ["Ultra yearly", recurringPlans.ultraYearly],
  ] as const;
  const ready = entries.every(([, configured]) => configured);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="size-4 text-primary" />
          Recurring billing configuration
          <Badge variant={ready ? "success" : "destructive"} className="ml-auto">
            {ready ? "Ready" : "Incomplete"}
          </Badge>
        </CardTitle>
        <p className="text-[12px] text-muted-foreground">
          Paid checkout is enabled only when the provider cadence matches Starvia pricing.
        </p>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {entries.map(([label, configured]) => (
          <div key={label} className="flex items-center justify-between rounded-xl border border-border/70 p-3">
            <span className="text-[12.5px]">{label}</span>
            <Badge variant={configured ? "secondary" : "outline"} className="gap-1">
              {configured ? <CheckCircle2 className="size-3.5" /> : <CircleAlert className="size-3.5" />}
              {configured ? "configured" : "missing"}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
