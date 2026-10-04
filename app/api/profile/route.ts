import { NextResponse } from "next/server";

import { guard, readJson, ONBOARDED_COOKIE } from "@/lib/api/helpers";
import { ok } from "@/lib/http";
import { getProfile, upsertProfile } from "@/lib/data/profile";
import { requireUser } from "@/lib/session";
import { profileSchema, profileUpdateSchema } from "@/lib/validation";

/** Read the signed-in student's profile. */
export async function GET() {
  return guard("profile.get", async () => {
    const context = await requireUser();
    const profile = await getProfile(context);
    return ok({ profile, plan: context.plan, demo: context.demo });
  });
}

/**
 * Create or update the profile. `markOnboarded` (default true) finishes
 * onboarding and sets the cookie that the middleware uses to gate app routes.
 */
export async function POST(request: Request) {
  return guard("profile.post", async () => {
    const context = await requireUser();
    const body = await readJson(request);
    const payload = { ...(body as Record<string, unknown>) };
    const isUpdateOnly = Boolean(payload.__updateOnly);
    delete payload.__updateOnly;

    const schema = isUpdateOnly ? profileUpdateSchema : profileSchema;
    const parsed = schema.parse(payload);
    const markOnboarded = (parsed as { markOnboarded?: boolean }).markOnboarded !== false;

    const profile = await upsertProfile(context, parsed, { markOnboarded });

    const response = ok({ profile, onboarded: Boolean(profile.onboarded_at) });
    if (markOnboarded) {
      response.cookies.set(ONBOARDED_COOKIE, "1", {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  });
}

/** Sign-out helper for clients that prefer API over a form action. */
export async function DELETE() {
  return guard("profile.delete", async () => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = await getSupabaseServerClient();
    if (supabase) await supabase.auth.signOut();
    const response = NextResponse.json({ ok: true, data: { signedOut: true } });
    response.cookies.delete(ONBOARDED_COOKIE);
    return response;
  });
}
