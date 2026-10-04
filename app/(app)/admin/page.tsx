import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

import { BarChart, ProgressRing } from "@/components/learn/stat-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getAdminStats } from "@/lib/data/admin";
import { requireOnboarded } from "@/lib/session";
import { formatPrice, formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin analytics",
  robots: { index: false, follow: false },
};

function shortDay(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    timeZone: "UTC",
  });
}

export default async function AdminPage() {
  const context = await requireOnboarded();
  if (!context.isAdmin) redirect("/dashboard");

  const stats = await getAdminStats(context);
  const { totals, revenue, ai, activity, recentFeedback } = stats;

  const paidUsers = totals.pro + totals.ultra;
  const conversion = totals.users ? Math.round((paidUsers / totals.users) * 1000) / 10 : 0;
  const churn = revenue.activeSubscriptions + paidUsers > 0
    ? Math.max(0, paidUsers - revenue.activeSubscriptions)
    : 0;

  const kpis = [
    { icon: Users, label: "Total users", value: totals.users, hint: `${totals.onboarded} onboarded` },
    { icon: Activity, label: "Active today", value: totals.activeToday, hint: `${totals.activeWeek} this week` },
    { icon: TrendingUp, label: "Paid subscribers", value: paidUsers, hint: `${conversion}% conversion` },
    { icon: ShieldCheck, label: "MRR (this month)", value: formatPrice(revenue.thisMonthInr), hint: `${revenue.payments} payments` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-xl font-semibold sm:text-2xl">Admin analytics</h1>
          <p className="text-sm text-muted-foreground">
            Platform health, revenue and AI consumption. Visible only to configured admin emails.
          </p>
        </div>
        <Badge variant={context.demo ? "warning" : "success"}>
          {context.demo ? "Demo data" : "Live data"}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <kpi.icon className="size-4 text-primary" />
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight">{kpi.value}</p>
            <p className="text-[12px] text-muted-foreground">{kpi.label}</p>
            <p className="mt-1 text-[11.5px] text-muted-foreground/80">{kpi.hint}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-primary" />
              AI requests · last 7 days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={ai.daily.map((day) => ({ label: shortDay(day.date), value: day.count }))} />
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/70 pt-3 sm:grid-cols-4">
              <div>
                <p className="text-[11.5px] text-muted-foreground">Requests (7d)</p>
                <p className="font-medium">{ai.requests7d}</p>
              </div>
              <div>
                <p className="text-[11.5px] text-muted-foreground">Tokens (7d)</p>
                <p className="font-medium">{ai.tokens7d.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-[11.5px] text-muted-foreground">Avg latency</p>
                <p className="font-medium">{ai.avgLatencyMs} ms</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
                  <AlertTriangle className="size-3" />
                  Error rate
                </p>
                <p className={ai.errorRate > 5 ? "font-medium text-destructive" : "font-medium"}>
                  {ai.errorRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Plan mix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-around">
              <ProgressRing value={conversion} label="Paid conversion" sublabel={`${paidUsers} subscribers`} />
            </div>
            {(["free", "pro", "ultra"] as const).map((plan) => {
              const value = totals[plan];
              const percent = totals.users ? Math.round((value / totals.users) * 100) : 0;
              return (
                <div key={plan} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="capitalize">{plan === "free" ? "Starter" : plan}</span>
                    <span className="text-muted-foreground">
                      {value} · {percent}%
                    </span>
                  </div>
                  <Progress value={percent} />
                </div>
              );
            })}
            <p className="rounded-xl border border-border/70 p-3 text-[11.5px] text-muted-foreground">
              {churn} subscriber{churn === 1 ? "" : "s"} have ended their paid period or cancelled.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Feature demand (7d)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ai.byFeature.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No AI activity recorded yet.</p>
            ) : (
              ai.byFeature.map((item) => {
                const max = ai.byFeature[0]?.count || 1;
                return (
                  <div key={item.feature} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className="capitalize">{item.feature.replace("_", " ")}</span>
                      <span className="text-muted-foreground">{item.count}</span>
                    </div>
                    <Progress value={Math.round((item.count / max) * 100)} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Study activity (7d)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Tutorials", value: activity.tutorials7d },
                { label: "Quizzes", value: activity.quizzes7d },
                { label: "Attempts", value: activity.attempts7d },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border/70 p-3 text-center">
                  <p className="font-display text-xl font-semibold">{item.value}</p>
                  <p className="text-[11.5px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-1 text-[11.5px] text-muted-foreground">Daily active students</p>
              <BarChart
                data={activity.dauSeries.map((day) => ({ label: shortDay(day.date), value: day.users }))}
                height={120}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border/70 pt-3">
              <div>
                <p className="text-[11.5px] text-muted-foreground">Revenue (all time)</p>
                <p className="font-medium">{formatPrice(revenue.totalInr)}</p>
              </div>
              <div>
                <p className="text-[11.5px] text-muted-foreground">Active subscriptions</p>
                <p className="font-medium">{revenue.activeSubscriptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4 text-primary" />
            Latest feedback
            <Badge variant="secondary" className="ml-auto">
              {recentFeedback.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {recentFeedback.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No feedback yet.</p>
          ) : (
            recentFeedback.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/70 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {item.category}
                    </Badge>
                    <Badge variant={item.status === "new" ? "warning" : "secondary"} className="capitalize">
                      {item.status}
                    </Badge>
                  </div>
                  <span className="text-[11.5px] text-muted-foreground">
                    {formatRelativeTime(item.created_at)}
                  </span>
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed">{item.message}</p>
                {item.email ? (
                  <p className="mt-1 text-[11.5px] text-muted-foreground">{item.email}</p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
