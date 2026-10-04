import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { guard, readJson } from "@/lib/api/helpers";
import { firebaseConfigured, supabaseConfigured } from "@/lib/env";
import { verifyFirebaseIdToken } from "@/lib/firebase/verify";
import { signInWithVerifiedEmail } from "@/lib/firebase/session";
import { ApiError, assertRateLimit, clientKey, ok } from "@/lib/http";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const firebaseSignInSchema = z.object({
  idToken: z.string().min(100).max(8_192),
  next: z.string().max(300).optional(),
});

function safeNext(value: string | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

/**
 * Primary Google sign-in path: Firebase popup on the client, cryptographic ID
 * token verification here, then a normal Supabase SSR session for RLS.
 */
export async function POST(request: Request) {
  return guard("auth.firebase-google", async () => {
    assertRateLimit(`firebase-google:${clientKey(request)}`, 20, 60_000);
    if (!firebaseConfigured() || !supabaseConfigured()) {
      throw new ApiError("NOT_CONFIGURED", "Google sign-in is not configured on this deployment yet.");
    }
    const parsed = firebaseSignInSchema.parse(await readJson(request));
    const identity = await verifyFirebaseIdToken(parsed.idToken);
    const { user, created, onboarded } = await signInWithVerifiedEmail(identity);
    const needsOnboarding = created || !onboarded;
    const response = ok({
      redirect: needsOnboarding ? "/onboarding" : safeNext(parsed.next),
      user: { id: user.id, email: user.email },
    });
    if (needsOnboarding) {
      response.cookies.set("starvia_onboarded", "0", {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    } else {
      response.cookies.set("starvia_onboarded", "1", {
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

/**
 * Supabase Google OAuth fallback. The provider redirects back to /auth/callback,
 * which exchanges the code for a session cookie server-side.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (!supabaseConfigured()) {
    return NextResponse.redirect(new URL("/login?error=oauth_unavailable", url.origin));
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/login?error=oauth_unavailable", url.origin));
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${url.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", url.origin));
  }

  return NextResponse.redirect(data.url);
}
