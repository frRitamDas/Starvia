import "server-only";

import { ApiError } from "@/lib/http";
import { demoStore, demoToday, demoUsageKey } from "@/lib/demo/store";
import { AI_FEATURES, FEATURE_LABELS, type AiFeature } from "@/lib/plans";
import { publicEnv } from "@/lib/env";
import type { AiUsageSummary } from "@/lib/types";
import type { SessionContext } from "@/lib/session";

/**
 * Server-side AI quota engine.
 *
 * Flow for every AI route:
 *   authenticate → resolve plan → check + consume quota atomically →
 *   call Gemini → log event → return.
 *
 * Quotas live in the database (ai_usage) and are consumed with an atomic
 * Postgres function, so refreshing the page, opening many tabs or replaying a
 * request cannot bypass them.
 */

export interface QuotaState {
  feature: AiFeature;
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
}

export const UNLIMITED = Number.MAX_SAFE_INTEGER;

/** Milliseconds until the daily quota resets (next midnight, Asia/Kolkata). */
export function msUntilReset() {
  const now = new Date();
  const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const nextMidnightIst = new Date(istNow);
  nextMidnightIst.setHours(24, 0, 0, 0);
  return Math.max(0, nextMidnightIst.getTime() - istNow.getTime());
}

function limitFor(context: SessionContext, feature: AiFeature) {
  return context.limits[feature] ?? 0;
}

async function callQuotaService(
  context: SessionContext,
  action: "consume" | "refund",
  feature: AiFeature,
  limit: number,
  amount = 1,
) {
  const client = context.db;
  if (!client || !context.user) {
    throw new ApiError("SERVER_ERROR", "Study services are not configured correctly. Please try again later.");
  }

  const { data: sessionData } = await client.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new ApiError("UNAUTHORIZED", "Your study session has expired. Please sign in again.");
  }

  const response = await fetch(`${publicEnv.supabaseUrl}/functions/v1/starvia-quota`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: publicEnv.supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, feature, limit, amount }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { data?: Record<string, unknown>; error?: string; code?: string }
    | null;

  if (!response.ok || !payload?.data) {
    console.error("[usage] quota service failed:", {
      action,
      feature,
      status: response.status,
      code: payload?.code,
      message: payload?.error,
    });
    throw new ApiError(
      "SERVER_ERROR",
      payload?.error === "Authentication required."
        ? "Your study session has expired. Please sign in again."
        : "Study services are temporarily unavailable. Please try again.",
    );
  }

  return payload.data;
}

/**
 * Consume one unit of a feature's daily quota.
 *
 * The RPC is safe for both the privileged server client and the user's
 * authenticated RLS client. The database function validates auth.uid(),
 * derives the authoritative limit from plan_limits, and only allows one unit
 * per call. This means a temporary/misconfigured server secret cannot take
 * the entire AI service down.
 */
export async function consumeQuota(
  context: SessionContext,
  feature: AiFeature,
  amount = 1,
): Promise<QuotaState> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  const limit = limitFor(context, feature);

  if (limit <= 0) {
    throw new ApiError(
      "PAYMENT_REQUIRED",
      `${FEATURE_LABELS[feature]} aren't included in your current plan. Upgrade to continue.`,
      { feature, upgrade: true },
    );
  }

  if (limit >= UNLIMITED) {
    return { feature, used: 0, limit: UNLIMITED, remaining: UNLIMITED, unlimited: true };
  }

  if (context.demo) {
    const store = demoStore();
    const key = demoUsageKey(feature, demoToday());
    const used = store.usage.get(key) ?? 0;
    if (used + amount > limit) {
      throw new ApiError("LIMIT_REACHED", limitMessage(feature), {
        feature,
        used,
        limit,
        resetsInMs: msUntilReset(),
        upgrade: true,
      });
    }
    store.usage.set(key, used + amount);
    return {
      feature,
      used: used + amount,
      limit,
      remaining: limit - (used + amount),
      unlimited: false,
    };
  }

  if (amount !== 1) {
    throw new ApiError("BAD_REQUEST", "Invalid AI quota request.");
  }

  const result = await callQuotaService(context, "consume", feature, limit, amount);
  const row = result as { allowed: boolean; used: number; remaining: number };  if (!row.allowed) {
    throw new ApiError("LIMIT_REACHED", limitMessage(feature), {
      feature,
      used: row.used,
      limit,
      resetsInMs: msUntilReset(),
      upgrade: true,
    });
  }

  return {
    feature,
    used: row.used,
    limit,
    remaining: row.remaining,
    unlimited: false,
  };
}

/**
 * Refund quota only for a request that was charged but did not complete.
 * The database function is atomic and never allows the counter below zero.
 */
export async function refundQuota(
  context: SessionContext,
  feature: AiFeature,
  amount = 1,
): Promise<{ refunded: number; used: number; remaining: number }> {
  if (!context.user || amount <= 0) {
    return { refunded: 0, used: 0, remaining: limitFor(context, feature) };
  }

  const limit = limitFor(context, feature);
  if (limit >= UNLIMITED) {
    return { refunded: 0, used: 0, remaining: UNLIMITED };
  }

  if (context.demo) {
    const store = demoStore();
    const key = demoUsageKey(feature, demoToday());
    const used = store.usage.get(key) ?? 0;
    const refunded = Math.min(amount, used);
    const next = Math.max(0, used - refunded);
    if (next === 0) store.usage.delete(key);
    else store.usage.set(key, next);
    return { refunded, used: next, remaining: Math.max(0, limit - next) };
  }

  if (amount !== 1) {
    return { refunded: 0, used: 0, remaining: limit };
  }

  const result = await callQuotaService(context, "refund", feature, limit, amount);
  const row = result as { refunded: number; used: number; remaining: number };  return {
    refunded: Math.max(0, row.refunded ?? 0),
    used: Math.max(0, row.used ?? 0),
    remaining: Math.max(0, row.remaining ?? 0),
  };
}

/** Record token consumption so cost stays visible in the admin panel. */
export async function addTokenUsage(context: SessionContext, feature: AiFeature, tokens: number) {
  if (tokens <= 0 || !context.user) return;
  if (context.demo) return;

  const client = context.admin ?? context.db;
  if (!client) return;

  const today = demoToday();
  try {
    const { data } = await client
      .from("ai_usage")
      .select("tokens_used")
      .eq("user_id", context.user.id)
      .eq("usage_date", today)
      .eq("feature", feature)
      .maybeSingle();

    const current = (data as { tokens_used: number } | null)?.tokens_used ?? 0;

    await client
      .from("ai_usage")
      .update({ tokens_used: current + tokens })
      .eq("user_id", context.user.id)
      .eq("usage_date", today)
      .eq("feature", feature);
  } catch {
    // analytics only — never block a response on this
  }
}

/** Read-only quota snapshot for the dashboard and the usage widget. */
export async function getUsageSummary(context: SessionContext): Promise<AiUsageSummary> {
  const today = demoToday();
  const empty = Object.fromEntries(
    AI_FEATURES.map((feature) => [
      feature,
      { used: 0, limit: limitFor(context, feature), remaining: limitFor(context, feature) },
    ]),
  ) as AiUsageSummary["usage"];

  const summary: AiUsageSummary = {
    plan: context.plan,
    planName: context.plan,
    date: today,
    usage: empty,
    resetsInMs: msUntilReset(),
  };

  if (!context.user) return summary;

  if (context.demo) {
    const store = demoStore();
    for (const feature of AI_FEATURES) {
      const used = store.usage.get(demoUsageKey(feature, today)) ?? 0;
      const limit = limitFor(context, feature);
      summary.usage[feature] = {
        used,
        limit,
        remaining: Math.max(0, limit - used),
      };
    }
    return summary;
  }

  if (!context.db) return summary;

  const { data, error } = await context.db
    .from("ai_usage")
    .select("feature, used")
    .eq("user_id", context.user.id)
    .eq("usage_date", today);

  if (error) {
    console.error("[usage] summary fetch failed:", error.message);
    return summary;
  }

  for (const row of (data ?? []) as { feature: string; used: number }[]) {
    if ((AI_FEATURES as readonly string[]).includes(row.feature)) {
      const feature = row.feature as AiFeature;
      const limit = limitFor(context, feature);
      summary.usage[feature] = {
        used: row.used,
        limit,
        remaining: Math.max(0, limit - row.used),
      };
    }
  }

  return summary;
}

/** Feature availability check without consuming quota (used to gate the UI). */
export function assertFeatureIncluded(context: SessionContext, feature: AiFeature) {
  if (limitFor(context, feature) <= 0) {
    throw new ApiError(
      "PAYMENT_REQUIRED",
      `${FEATURE_LABELS[feature]} aren't included in your current plan. Upgrade to continue.`,
      { feature, upgrade: true },
    );
  }
}

function limitMessage(feature: AiFeature) {
  return `${limitNoun(feature)} for today are done. Upgrade for a higher limit, or come back after midnight.`;
}

function limitNoun(feature: AiFeature) {
  switch (feature) {
    case "tutor":
      return "Your AI tutor messages";
    case "tutorial":
      return "Your AI tutorials";
    case "quiz":
      return "Your AI quizzes";
    case "image":
      return "Your image questions";
    case "solver":
      return "Your solved questions";
    case "flashcards":
      return "Your flashcard generations";
    case "exam_prep":
      return "Your exam prep plans";
    default:
      return "Your daily AI requests";
  }
}

/** Append an AI event for admin analytics (requests, latency, error rate). */
export async function logAiEvent(
  context: SessionContext | null,
  event: {
    feature: AiFeature | "cache" | "payment";
    status: "success" | "error" | "blocked" | "cached";
    model?: string | null;
    latencyMs?: number | null;
    tokens?: number;
    errorCode?: string | null;
  },
) {
  const client = context?.admin ?? context?.db ?? null;
  if (context?.demo || !client) return;

  try {
    await client.from("ai_events").insert({
      user_id: context?.user?.id ?? null,
      feature: event.feature,
      status: event.status,
      model: event.model ?? null,
      latency_ms: event.latencyMs ?? null,
      tokens_used: event.tokens ?? 0,
      error_code: event.errorCode ?? null,
    });
  } catch {
    // best effort only
  }
}
