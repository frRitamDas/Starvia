import "server-only";

import { ApiError } from "@/lib/http";
import { demoStore, demoToday, demoUsageKey } from "@/lib/demo/store";
import { AI_FEATURES, FEATURE_LABELS, type AiFeature } from "@/lib/plans";
import type { AiUsageSummary } from "@/lib/types";
import type { SessionContext } from "@/lib/session";

/**
 * Server-side AI quota engine.
 *
 * Flow for every AI route:
 *   authenticate → resolve plan → check + consume quota atomically →
 *   call Gemini → log event → return.
 *
 * Quotas live in the database (`ai_usage`) and are consumed with an atomic
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

/**
 * Consume one unit of a feature's daily quota.
 * Returns the resulting state; throws LIMIT_REACHED / PAYMENT_REQUIRED otherwise.
 */
export async function consumeQuota(
  context: SessionContext,
  feature: AiFeature,
  amount = 1,
): Promise<QuotaState> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  const limit = limitFor(context, feature);

  // Not part of this plan at all (e.g. AI flashcards on the free plan).
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

  /* ------------------------------ demo mode ----------------------------- */
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
    return { feature, used: used + amount, limit, remaining: limit - (used + amount), unlimited: false };
  }

  const client = context.admin ?? context.db;
  if (!client) throw new ApiError("SERVER_ERROR");

  /* -------------------- atomic RPC (preferred path) --------------------- */
  const { data: rpcData, error: rpcError } = await client.rpc("consume_ai_quota", {
    p_user_id: context.user.id,
    p_feature: feature,
    p_limit: limit,
    p_amount: amount,
  });

  if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
    const row = rpcData[0] as { allowed: boolean; used: number; remaining: number };
    if (!row.allowed) {
      throw new ApiError("LIMIT_REACHED", limitMessage(feature), {
        feature,
        used: row.used,
        limit,
        resetsInMs: msUntilReset(),
        upgrade: true,
      });
    }
    return { feature, used: row.used, limit, remaining: row.remaining, unlimited: false };
  }

  if (rpcError) {
    console.error("[usage] consume_ai_quota RPC failed, falling back:", rpcError.message);
  }

  /* ------------------- fallback: optimistic read + write ---------------- */
  if (!context.db) throw new ApiError("SERVER_ERROR");
  const today = demoToday();
  const { data: existing } = await context.db
    .from("ai_usage")
    .select("used")
    .eq("user_id", context.user.id)
    .eq("usage_date", today)
    .eq("feature", feature)
    .maybeSingle();

  const used = (existing as { used: number } | null)?.used ?? 0;
  if (used + amount > limit) {
    throw new ApiError("LIMIT_REACHED", limitMessage(feature), {
      feature,
      used,
      limit,
      resetsInMs: msUntilReset(),
      upgrade: true,
    });
  }

  const { error: upsertError } = await context.db.from("ai_usage").upsert(
    {
      user_id: context.user.id,
      usage_date: today,
      feature,
      used: used + amount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,usage_date,feature" },
  );
  if (upsertError) {
    console.error("[usage] upsert failed:", upsertError.message);
    throw new ApiError("SERVER_ERROR");
  }

  return { feature, used: used + amount, limit, remaining: limit - (used + amount), unlimited: false };
}

/** Record token consumption so cost stays visible in the admin panel. */
export async function addTokenUsage(context: SessionContext, feature: AiFeature, tokens: number) {
  if (tokens <= 0 || !context.user) return;
  if (context.demo) {
    return;
  }
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
    AI_FEATURES.map((feature) => [feature, { used: 0, limit: limitFor(context, feature), remaining: limitFor(context, feature) }]),
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
      summary.usage[feature] = { used: row.used, limit, remaining: Math.max(0, limit - row.used) };
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

function limitMessage(_feature: AiFeature) {
  return "You've reached today's AI limit. Upgrade to continue learning.";
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
