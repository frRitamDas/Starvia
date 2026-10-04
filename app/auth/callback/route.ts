import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";

/**
 * Auth callback for email confirmation links, magic links and OAuth (PKCE).
 * Exchanges the code for a session cookie, then sends the student onward.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const errorDescription = url.searchParams.get("error_description");

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (errorDescription) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Sign-in was cancelled or failed.")}`, url.origin),
    );
  }

  if (!supabaseConfigured() || !code) {
    return NextResponse.redirect(new URL(safeNext, url.origin));
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/login?error=auth_unavailable", url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("That link has expired. Please sign in again.")}`, url.origin),
    );
  }

  // New accounts land on onboarding; the middleware also guards this.
  return NextResponse.redirect(new URL(safeNext === "/dashboard" ? "/onboarding" : safeNext, url.origin));
}
