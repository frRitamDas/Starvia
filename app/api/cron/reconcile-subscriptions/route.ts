import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = serverEnv.cronSecret;
  if (!secret) return false;
  return request.headers.get("authorization") === "Bearer " + secret;
}

/**
 * Daily reconciliation safety net for subscriptions whose provider webhook was
 * delayed or lost. Provider webhooks remain the primary lifecycle mechanism;
 * this job only expires already-ended paid periods.
 */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "server_not_configured" }, { status: 503 });
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("subscriptions")
    .update({
      plan: "free",
      status: "expired",
      amount_inr: null,
      cancel_at_period_end: false,
    })
    .in("plan", ["pro", "ultra"])
    .not("current_period_end", "is", null)
    .lte("current_period_end", now)
    .not("status", "in", "(expired,completed)")
    .select("user_id");

  if (error) {
    console.error("[cron:reconcile-subscriptions]", error.message);
    return NextResponse.json({ ok: false, error: "reconciliation_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      reconciled: data?.length ?? 0,
      checkedAt: now,
    },
  });
}
