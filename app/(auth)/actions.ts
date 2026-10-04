"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { demoMode, publicEnv, supabaseConfigured } from "@/lib/env";
import { passwordUpdateSchema, resetRequestSchema, signInSchema, signUpSchema } from "@/lib/validation";

export interface AuthState {
  error?: string;
  message?: string;
}

function safeNext(value: unknown, fallback = "/dashboard") {
  const next = typeof value === "string" ? value : "";
  // Only allow same-origin relative paths.
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

async function origin() {
  try {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
    const protocol = headerList.get("x-forwarded-proto") ?? "https";
    if (host) return `${protocol}://${host}`;
  } catch {
    /* fall through */
  }
  return publicEnv.siteUrl;
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseConfigured()) {
    return {
      error: demoMode()
        ? "This deployment is running in demo mode. Use “Continue to demo dashboard” below."
        : "Authentication is not configured yet. Add your Supabase keys to enable sign-in.",
    };
  }

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { error: "Authentication is unavailable right now." };

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      error:
        error.message.toLowerCase().includes("invalid login")
          ? "That email or password doesn't look right. Please try again."
          : error.message,
    };
  }

  redirect(safeNext(parsed.data.next));
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseConfigured()) {
    return {
      error: demoMode()
        ? "This deployment is running in demo mode. Use “Continue to demo dashboard” below."
        : "Authentication is not configured yet. Add your Supabase keys to enable sign-up.",
    };
  }

  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { error: "Authentication is unavailable right now." };

  const base = await origin();
  const next = safeNext(parsed.data.next, "/onboarding");

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return {
      error: error.message.toLowerCase().includes("already registered")
        ? "An account with that email already exists. Try signing in instead."
        : error.message,
    };
  }

  // Email confirmation enabled → user must confirm before a session exists.
  if (!data.session) {
    return {
      message:
        "Almost there! Check your inbox and click the confirmation link to finish creating your account.",
    };
  }

  redirect(next);
}

export async function requestResetAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseConfigured()) {
    return { error: "Password reset needs Supabase to be configured." };
  }

  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email." };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { error: "Authentication is unavailable right now." };

  const base = await origin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${base}/auth/callback?next=/reset-password`,
  });

  if (error) return { error: "We couldn't send that email. Please try again." };

  return {
    message: "If that email is registered, a reset link is on its way. Check your spam folder too.",
  };
}

export async function updatePasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseConfigured()) {
    return { error: "Password update needs Supabase to be configured." };
  }

  const parsed = passwordUpdateSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Choose a stronger password." };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { error: "Authentication is unavailable right now." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "We couldn't update your password. Please request a new link." };

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/");
}

