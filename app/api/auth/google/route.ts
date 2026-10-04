import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";

/**
 * Starts Google OAuth. The provider redirects back to /auth/callback, which
 * exchanges the code for a session cookie server-side.
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
