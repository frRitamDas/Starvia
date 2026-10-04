import { NextResponse } from "next/server";

import { ONBOARDED_COOKIE } from "@/lib/api/helpers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Signs the student out and clears the local onboarding marker. */
export async function POST() {
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  const response = NextResponse.json({ ok: true, data: { signedOut: true } });
  response.cookies.delete(ONBOARDED_COOKIE);
  return response;
}
