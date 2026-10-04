import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publicEnv, supabaseConfigured } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Refreshes the Supabase auth session on every request and returns
 * the (possibly updated) response with cookies applied.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!supabaseConfigured()) {
    return { response, userId: null as string | null };
  }

  const supabase = createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, userId: user?.id ?? null };
}
