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
          ...(status.serviceRole ? [] : ["SUPABASE_SERVICE_ROLE_KEY is missing — trusted writes and Firebase session bridging are disabled."]),
          ...(status.firebaseAuth ? [] : ["Firebase web configuration is missing — primary Google sign-in is disabled."]),
          ...(status.gemini ? [] : ["GEMINI_API_KEY is missing — AI features will return NOT_CONFIGURED."]),
          ...(status.razorpay ? [] : ["Razorpay keys are missing — upgrades are disabled."]),
        ],
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
