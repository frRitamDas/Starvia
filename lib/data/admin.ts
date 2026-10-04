import "server-only";

import { demoStore } from "@/lib/demo/store";
import type { SessionContext } from "@/lib/session";

/** Aggregated platform metrics for /admin. All reads use the service role. */

export interface AdminStats {
  totals: {
    users: number;
    onboarded: number;
    activeToday: number;
    activeWeek: number;
    free: number;
    pro: number;
    ultra: number;
  };
  revenue: {
    totalInr: number;
    thisMonthInr: number;
    payments: number;
    activeSubscriptions: number;
  };
  ai: {
    requests7d: number;
    tokens7d: number;
    errorRate: number;
    avgLatencyMs: number;
    byFeature: { feature: string; count: number }[];
    daily: { date: string; count: number; errors: number }[];
  };
  activity: {
    quizzes7d: number;
    tutorials7d: number;
    attempts7d: number;
    dauSeries: { date: string; users: number }[];
  };
  recentFeedback: {
    id: string;
    category: string;
    message: string;
    email: string | null;
    created_at: string;
    status: string;
  }[];
}

function isoDay(offset: number) {
  return new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);
}

export async function getAdminStats(context: SessionContext): Promise<AdminStats> {
  if (context.demo) return demoAdminStats();

  const client = context.admin ?? context.db;
  if (!client) {
    return emptyStats();
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const today = isoDay(0);

  const [
    usersCount,
    onboardedCount,
    activeTodayCount,
    profilesWeek,
    subscriptions,
    payments,
    aiEvents,
    quizzes7d,
    tutorials7d,
    attempts7d,
    feedback,
  ] = await Promise.all([
    client.from("profiles").select("id", { count: "exact", head: true }),
    client.from("profiles").select("id", { count: "exact", head: true }).not("onboarded_at", "is", null),
    client.from("profiles").select("id", { count: "exact", head: true }).eq("last_active_date", today),
    client.from("profiles").select("id, last_active_date").gte("last_active_date", isoDay(6)),
    client.from("subscriptions").select("plan, status, current_period_end"),
    client.from("payments").select("amount_inr, status, created_at"),
    client
      .from("ai_events")
      .select("feature, status, latency_ms, tokens_used, created_at")
      .gte("created_at", thirtyDaysAgo)
      .limit(5000),
    client.from("quizzes").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    client.from("tutorials").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    client.from("quiz_attempts").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    client
      .from("feedback")
      .select("id, category, message, email, created_at, status")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const subscriptionRows = (subscriptions.data ?? []) as {
    plan: string;
    status: string;
    current_period_end: string | null;
  }[];
  const activeSubscriptions = subscriptionRows.filter(
    (row) => row.status === "active" && (!row.current_period_end || new Date(row.current_period_end) > new Date()),
  );

  const planCounts = { free: 0, pro: 0, ultra: 0 };
  for (const row of activeSubscriptions) {
    if (row.plan === "pro") planCounts.pro += 1;
    else if (row.plan === "ultra") planCounts.ultra += 1;
    else planCounts.free += 1;
  }
  const totalUsers = usersCount.count ?? 0;
  planCounts.free = Math.max(planCounts.free, totalUsers - planCounts.pro - planCounts.ultra);

  const paymentRows = (payments.data ?? []) as { amount_inr: number; status: string; created_at: string }[];
  const captured = paymentRows.filter((row) => row.status === "captured");

  const events = (aiEvents.data ?? []) as {
    feature: string;
    status: string;
    latency_ms: number | null;
    tokens_used: number;
    created_at: string;
  }[];
  const events7d = events.filter((event) => event.created_at >= sevenDaysAgo);
  const errors = events7d.filter((event) => event.status === "error").length;
  const latencies = events7d.map((event) => event.latency_ms ?? 0).filter(Boolean);

  const byFeature = new Map<string, number>();
  const daily = new Map<string, { count: number; errors: number }>();
  for (let index = 6; index >= 0; index -= 1) daily.set(isoDay(index), { count: 0, errors: 0 });
  for (const event of events7d) {
    byFeature.set(event.feature, (byFeature.get(event.feature) ?? 0) + 1);
    const day = event.created_at.slice(0, 10);
    const bucket = daily.get(day);
    if (bucket) {
      bucket.count += 1;
      if (event.status === "error") bucket.errors += 1;
    }
  }

  const dauSeries = (() => {
    const rows = (profilesWeek.data ?? []) as { last_active_date: string | null }[];
    const series = new Map<string, number>();
    for (let index = 6; index >= 0; index -= 1) series.set(isoDay(index), 0);
    for (const row of rows) {
      if (!row.last_active_date) continue;
      if (series.has(row.last_active_date)) {
        series.set(row.last_active_date, (series.get(row.last_active_date) ?? 0) + 1);
      }
    }
    return [...series.entries()].map(([date, users]) => ({ date, users }));
  })();

  return {
    totals: {
      users: totalUsers,
      onboarded: onboardedCount.count ?? 0,
      activeToday: activeTodayCount.count ?? 0,
      activeWeek: (profilesWeek.data ?? []).length,
      free: planCounts.free,
      pro: planCounts.pro,
      ultra: planCounts.ultra,
    },
    revenue: {
      totalInr: captured.reduce((sum, row) => sum + (row.amount_inr ?? 0), 0),
      thisMonthInr: captured
        .filter((row) => row.created_at >= monthStart)
        .reduce((sum, row) => sum + (row.amount_inr ?? 0), 0),
      payments: captured.length,
      activeSubscriptions: activeSubscriptions.filter((row) => row.plan !== "free").length,
    },
    ai: {
      requests7d: events7d.length,
      tokens7d: events7d.reduce((sum, event) => sum + (event.tokens_used ?? 0), 0),
      errorRate: events7d.length ? Math.round((errors / events7d.length) * 10000) / 100 : 0,
      avgLatencyMs: latencies.length
        ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
        : 0,
      byFeature: [...byFeature.entries()]
        .map(([feature, count]) => ({ feature, count }))
        .sort((a, b) => b.count - a.count),
      daily: [...daily.entries()].map(([date, value]) => ({ date, ...value })),
    },
    activity: {
      quizzes7d: quizzes7d.count ?? 0,
      tutorials7d: tutorials7d.count ?? 0,
      attempts7d: attempts7d.count ?? 0,
      dauSeries,
    },
    recentFeedback: (feedback.data ?? []) as AdminStats["recentFeedback"],
  };
}

function emptyStats(): AdminStats {
  return {
    totals: { users: 0, onboarded: 0, activeToday: 0, activeWeek: 0, free: 0, pro: 0, ultra: 0 },
    revenue: { totalInr: 0, thisMonthInr: 0, payments: 0, activeSubscriptions: 0 },
    ai: { requests7d: 0, tokens7d: 0, errorRate: 0, avgLatencyMs: 0, byFeature: [], daily: [] },
    activity: { quizzes7d: 0, tutorials7d: 0, attempts7d: 0, dauSeries: [] },
    recentFeedback: [],
  };
}

/** Demo-mode numbers are computed from the in-memory store — clearly non-production. */
function demoAdminStats(): AdminStats {
  const store = demoStore();
  const daily: { date: string; count: number; errors: number }[] = [];
  for (let index = 6; index >= 0; index -= 1) {
    const date = isoDay(index);
    const count = 12 + ((index * 7) % 11);
    daily.push({ date, count, errors: index % 5 === 0 ? 1 : 0 });
  }
  return {
    totals: {
      users: 128,
      onboarded: 121,
      activeToday: 42,
      activeWeek: 96,
      free: 104,
      pro: 19,
      ultra: 5,
    },
    revenue: {
      totalInr: 4246,
      thisMonthInr: 1485,
      payments: 24,
      activeSubscriptions: 24,
    },
    ai: {
      requests7d: daily.reduce((sum, day) => sum + day.count, 0),
      tokens7d: 486_000,
      errorRate: 1.4,
      avgLatencyMs: 2380,
      byFeature: [
        { feature: "tutor", count: 214 },
        { feature: "quiz", count: 96 },
        { feature: "tutorial", count: 71 },
        { feature: "solver", count: 44 },
        { feature: "flashcards", count: 22 },
      ],
      daily,
    },
    activity: {
      quizzes7d: store.quizzes.length,
      tutorials7d: store.tutorials.length,
      attempts7d: store.quizAttempts.length,
      dauSeries: daily.map((day) => ({ date: day.date, users: Math.round(day.count * 1.6) })),
    },
    recentFeedback: [
      {
        id: "demo-feedback-1",
        category: "idea",
        message: "Add a Hindi medium mode for Science explanations.",
        email: "demo@starvia.study",
        created_at: new Date().toISOString(),
        status: "new",
      },
    ],
  };
}
