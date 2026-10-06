import { NextResponse } from "next/server";

import { integrationStatus } from "@/lib/env";

/**
 * Deployment health check. Reports which integrations are configured
 * (booleans only — never keys) so you can verify a Vercel setup quickly.
 */
export async function GET() {
  const status = integrationStatus();
  return NextResponse.json(
    {
      ok: true,
      data: {
        app: "starvia",
        version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
        time: new Date().toISOString(),
        integrations: status,
        warnings: [
          ...(status.supabase ? [] : ["Supabase is not configured — auth and data storage are disabled."]),
          ...(status.gemini || status.openRouter || status.naraRouter
            ? []
            : ["No AI provider is configured — AI features will be unavailable."]),
          ...(status.razorpay ? [] : ["Razorpay keys are missing — upgrades are disabled."]),
        ],
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
