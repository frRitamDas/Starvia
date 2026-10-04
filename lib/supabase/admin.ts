import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv, supabaseConfigured } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Service-role client. Bypasses RLS — use only inside server routes for
 * privileged work (usage counters, payments, admin stats, AI cache writes).
 *
 * Never import this from a client component: `server-only` throws at build time
 * if it leaks into the browser bundle.
 */
let adminClient: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> | null {
  if (!supabaseConfigured()) return null;
  const serviceKey = serverEnv.supabaseServiceRoleKey;
  if (!serviceKey) return null;
  if (adminClient) return adminClient;
  adminClient = createClient<Database>(publicEnv.supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "x-starvia-client": "admin" } },
  });
  return adminClient;
}

/** True when the privileged key exists — some features (usage counters) need it. */
export function hasServiceRole() {
  try {
    return Boolean(serverEnv.supabaseServiceRoleKey);
  } catch {
    return false;
  }
}
