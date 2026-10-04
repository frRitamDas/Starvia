import "server-only";

import { ApiError } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { VerifiedFirebaseUser } from "@/lib/firebase/verify";

/**
 * Bridges a verified Firebase identity into a normal Supabase SSR session.
 * Supabase remains the source of truth for users, cookies, Postgres and RLS.
 */
export async function signInWithVerifiedEmail(identity: VerifiedFirebaseUser) {
  const admin = getSupabaseAdmin();
  const supabase = await getSupabaseServerClient();
  if (!admin || !supabase) {
    throw new ApiError(
      "NOT_CONFIGURED",
      "Google sign-in needs Supabase and its service-role key to be configured.",
    );
  }

  const metadata = {
    full_name: identity.name ?? identity.email.split("@")[0] ?? "Student",
    name: identity.name ?? undefined,
    avatar_url: identity.picture ?? undefined,
    picture: identity.picture ?? undefined,
    firebase_uid: identity.uid,
    auth_provider: "firebase_google",
  };

  const { error: createError } = await admin.auth.admin.createUser({
    email: identity.email,
    email_confirm: true,
    user_metadata: metadata,
    app_metadata: { provider: "google", providers: ["google"] },
  });

  if (
    createError &&
    !/already|registered|exists|duplicate/i.test(createError.message)
  ) {
    console.error("[firebase-session:create]", createError.message);
    throw new ApiError("SERVER_ERROR");
  }

  // Generate a one-use server-side magic-link token, then exchange its hash
  // through the request-scoped SSR client so Supabase writes its own cookies.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: identity.email,
    options: { data: metadata },
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    console.error("[firebase-session:link]", linkError?.message ?? "missing token hash");
    throw new ApiError("SERVER_ERROR");
  }

  const { data: session, error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (verifyError || !session.user) {
    console.error("[firebase-session:verify]", verifyError?.message ?? "missing user");
    throw new ApiError("SERVER_ERROR");
  }

  // Keep Google profile details fresh without ever trusting client-supplied
  // email/name fields. The values came from the signed Firebase token.
  const profilePatch: { full_name?: string; avatar_url?: string } = {};
  if (identity.name) profilePatch.full_name = identity.name;
  if (identity.picture) profilePatch.avatar_url = identity.picture;
  if (Object.keys(profilePatch).length) {
    const { error } = await admin.from("profiles").update(profilePatch).eq("id", session.user.id);
    if (error) console.error("[firebase-session:profile]", error.message);
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("onboarded_at")
    .eq("id", session.user.id)
    .maybeSingle();

  return { user: session.user, created: !createError, onboarded: Boolean(profile?.onboarded_at) };
}
