import { NextResponse } from "next/server";

import { integrationStatus, razorpayRecurringPlanStatus } from "@/lib/env";

/**
 * Configuration health check. It reports whether required environment and
 * integration settings are present; it does not call billable AI/payment
 * providers. Live AI verification is admin-only via /api/admin/ai-diagnostics.
 */
export async function GET() {
  const status = integrationStatus();
  const recurringPlans = razorpayRecurringPlanStatus();
  const warnings: string[] = [
    ...(status.supabase ? [] : ["Supabase is not configured — auth and data storage are disabled."]),
    ...(status.naraRouter || status.gemini ? [] : ["No AI provider is configured — AI study services are unavailable."]),
    ...(status.razorpay ? [] : ["Razorpay keys are missing — upgrades are disabled."]),
    ...(status.razorpay && Object.values(recurringPlans).some((configured) => !configured)
      ? ["One or more recurring Razorpay plan ids are missing — the affected monthly/yearly checkout must stay disabled until configured."]
      : []),
  ];
  return NextResponse.json(
    {
      ok: warnings.length === 0,
      data: {
        app: "starvia",
        version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
        time: new Date().toISOString(),
        checkType: "configuration",
        operationalStatus: "not_probed",
        integrations: status,
        recurringPlans,
        warnings,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
