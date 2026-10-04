"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv, supabaseConfigured } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Browser Supabase client (anon key only, RLS enforced).
 * Returns null when Supabase is not configured so callers can degrade gracefully.
 */
export function getSupabaseBrowserClient() {
  if (!supabaseConfigured()) return null;
  if (browserClient) return browserClient;
  browserClient = createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
  return browserClient;
}
