import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { demoMode, serverEnv, supabaseConfigured } from "@/lib/env";
import { demoStore, DEMO_USER_ID, demoToday } from "@/lib/demo/store";
import { ApiError } from "@/lib/http";
import {
  getCapabilities,
  getLimits,
  subscriptionGrantsAccess,
  type PlanCapabilities,
  type PlanId,
  type PlanLimits,
} from "@/lib/plans";
import type { Database } from "@/lib/supabase/types";
import type { Profile, Subscription } from "@/lib/types";

export type Supabase = SupabaseClient<Database>;

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
}

export interface SessionContext {
  /** True when running without Supabase (local preview / explicit demo mode). */
  demo: boolean;
  user: SessionUser | null;
  profile: Profile | null;
  subscription: Subscription | null;
  plan: PlanId;
  limits: PlanLimits;
  capabilities: PlanCapabilities;
  onboarded: boolean;
  isAdmin: boolean;
  /** RLS-scoped client (user's own rows only). */
  db: Supabase | null;
  /** Service-role client — privileged server operations only. */
  admin: Supabase | null;
}

const ADMIN_EMAILS = (() => {
  try {
    return serverEnv.adminEmails;
  } catch {
    return [] as string[];
  }
})();

/**
 * The single entry point for auth + entitlements on the server.
 * Reads the signed-in user, profile, subscription and resolves plan limits.
 */
export async function getSessionContext(): Promise<SessionContext> {
  const demo = demoMode();

  if (demo || !supabaseConfigured()) {
    const store = demoStore();
    const profile = store.profile;
    const subscription = store.subscription;
    const plan: PlanId = subscriptionGrantsAccess(subscription) ? (subscription.plan as PlanId) : "free";
    return {
      demo: true,
      user: {
        id: profile.id ?? DEMO_USER_ID,
        email: profile.email,
        name: profile.full_name,
      },
      profile,
      subscription,
      plan,
      limits: await resolveLimits(plan, null),
      capabilities: getCapabilities(plan),
      onboarded: Boolean(profile.onboarded_at),
      isAdmin: profile.role === "admin",
      db: null,
      admin: null,
    };
  }

  const db = await getSupabaseServerClient();
  const admin = getSupabaseAdmin();
  if (!db) {
    throw new ApiError("SERVER_ERROR", "Database connection is not available right now.");
  }

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    return {
      demo: false,
      user: null,
      profile: null,
      subscription: null,
      plan: "free",
      limits: await resolveLimits("free", admin),
      capabilities: getCapabilities("free"),
      onboarded: false,
      isAdmin: false,
      db,
      admin,
    };
  }

  const [{ data: profileRow }, { data: subscriptionRow }] = await Promise.all([
    db.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    db.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const profile = (profileRow as Profile | null) ?? null;
  let subscription = (subscriptionRow as Subscription | null) ?? null;

  // A mock subscription is never a production entitlement. This prevents a
  // test activation written during development from granting paid access on
  // the live app. Expired provider subscriptions are also reconciled lazily so
  // a missed webhook cannot leave a paid plan active forever.
  if (subscription && subscription.provider === "mock" && process.env.NODE_ENV === "production") {
    if (admin) {
      await admin
        .from("subscriptions")
        .update({
          plan: "free",
          status: "expired",
          amount_inr: null,
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
          cancelled_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }
    subscription = { ...subscription, plan: "free", status: "expired", amount_inr: null } as Subscription;
  } else if (
    subscription &&
    subscription.plan !== "free" &&
    subscription.current_period_end &&
    new Date(subscription.current_period_end).getTime() <= Date.now() &&
    !["expired", "completed"].includes(subscription.status)
  ) {
    if (admin) {
      await admin
        .from("subscriptions")
        .update({
          plan: "free",
          status: "expired",
          cancel_at_period_end: false,
          cancelled_at: subscription.cancelled_at ?? new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }
    subscription = { ...subscription, plan: "free", status: "expired" } as Subscription;
  }

  const plan: PlanId =
    subscription && subscriptionGrantsAccess(subscription) ? (subscription.plan as PlanId) : "free";

  const email = (user.email ?? "").toLowerCase();

  return {
    demo: false,
    user: { id: user.id, email: user.email ?? null, name: profile?.full_name ?? null },
    profile,
    subscription,
    plan,
    limits: await resolveLimits(plan, admin),
    capabilities: getCapabilities(plan),
    onboarded: Boolean(profile?.onboarded_at),
    isAdmin: profile?.role === "admin" || ADMIN_EMAILS.includes(email),
    db,
    admin,
  };
}

/** Throws unless there is a signed-in (or demo) user. */
export async function requireUser(): Promise<SessionContext & { user: SessionUser }> {
  const context = await getSessionContext();
  if (!context.user) {
    throw new ApiError("UNAUTHORIZED");
  }
  return context as SessionContext & { user: SessionUser };
}

/** Throws unless the user is signed in and has finished onboarding. */
export async function requireOnboarded(): Promise<SessionContext & { user: SessionUser; profile: Profile }> {
  const context = await requireUser();
  if (!context.profile) {
    throw new ApiError(
      "BAD_REQUEST",
      "Your student profile is missing. Please refresh or finish onboarding.",
    );
  }
  if (!context.onboarded) {
    throw new ApiError("BAD_REQUEST", "Finish your student profile to use this feature.", {
      needsOnboarding: true,
    });
  }
  return context as SessionContext & { user: SessionUser; profile: Profile };
}

export async function requireAdmin(): Promise<SessionContext & { user: SessionUser }> {
  const context = await requireUser();
  if (!context.isAdmin) {
    throw new ApiError("FORBIDDEN", "Admin access only.");
  }
  return context as SessionContext & { user: SessionUser };
}

/* ------------------------------------------------------------------ */
/* Plan limit overrides (editable in the plan_limits table)            */
/* ------------------------------------------------------------------ */

type LimitsCache = { value: Partial<Record<string, PlanLimits>>; expiresAt: number };
const globalForLimits = globalThis as unknown as { __starviaLimits?: LimitsCache };

/** DB overrides win over code defaults so limits can change without a deploy. */
export async function resolveLimits(plan: PlanId, admin: Supabase | null): Promise<PlanLimits> {
  const base = getLimits(plan);
  if (!admin) return base;

  const cached = globalForLimits.__starviaLimits;
  if (!cached || cached.expiresAt < Date.now()) {
    try {
      const { data, error } = await admin.from("plan_limits").select("plan, feature, daily_limit");
      if (!error && data) {
        const overrides: Partial<Record<string, PlanLimits>> = {};
        for (const row of data as { plan: string; feature: string; daily_limit: number }[]) {
          const planKey = row.plan as PlanId;
          overrides[planKey] = {
            ...(overrides[planKey] ?? ({} as PlanLimits)),
            [row.feature]: row.daily_limit,
          } as PlanLimits;
        }
        globalForLimits.__starviaLimits = { value: overrides, expiresAt: Date.now() + 5 * 60_000 };
      }
    } catch {
      // Table may not exist yet — fall back to code defaults.
    }
  }

  const override = globalForLimits.__starviaLimits?.value?.[plan];
  return override ? { ...base, ...override } : base;
}

/** Records that the student was active today and keeps the streak in sync. */
export async function touchActivity(context: SessionContext, minutes = 0) {
  const today = demoToday();

  if (context.demo) {
    const store = demoStore();
    const profile = store.profile;
    const last = profile.last_active_date;
    if (last !== today) {
      const yesterday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
        new Date(Date.now() - 86_400_000),
      );
      profile.streak_count = last === yesterday ? profile.streak_count + 1 : 1;
      profile.longest_streak = Math.max(profile.longest_streak, profile.streak_count);
      profile.last_active_date = today;
    }
    profile.study_minutes += Math.max(0, Math.round(minutes));
    profile.updated_at = new Date().toISOString();
    return;
  }

  if (!context.user || !context.db || !context.profile) return;

  const last = context.profile.last_active_date;
  if (last === today && minutes <= 0) return;

  const yesterday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(Date.now() - 86_400_000),
  );

  const patch: Partial<Profile> = { last_active_date: today };
  if (last !== today) {
    patch.streak_count = last === yesterday ? (context.profile.streak_count ?? 0) + 1 : 1;
    patch.longest_streak = Math.max(
      context.profile.longest_streak ?? 0,
      patch.streak_count ?? 1,
    );
  }
  if (minutes > 0) {
    patch.study_minutes = (context.profile.study_minutes ?? 0) + Math.round(minutes);
  }

  const { error } = await context.db.from("profiles").update(patch).eq("id", context.user.id);
  if (error) {
    // Non-fatal: activity tracking must never break a study session.
    console.error("[touchActivity]", error.message);
  }
  Object.assign(context.profile, patch);
}
