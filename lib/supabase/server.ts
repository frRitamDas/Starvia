import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { publicEnv, supabaseConfigured } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Request-scoped Supabase client that reads/writes the auth cookies.
 * RLS applies — this client only ever sees what the signed-in user may see.
 */
export async function getSupabaseServerClient() {
  if (!supabaseConfigured()) return null;
  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component render: safe to ignore because
          // middleware refreshes the session on every request.
        }
      },
    },
  });
}
