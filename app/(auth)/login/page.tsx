import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { AuthDivider, AuthForm, AuthLink, GoogleButton } from "@/components/auth/auth-form";
import { DemoNotice } from "@/components/auth/demo-notice";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Card } from "@/components/ui/card";
import { signInAction } from "@/app/(auth)/actions";
import { getSessionContext } from "@/lib/session";
import { demoMode, integrationStatus, publicEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Starvia account to continue studying.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const session = await getSessionContext().catch(() => null);
  if (session?.user && !demoMode()) {
    redirect(params.next && params.next.startsWith("/") ? params.next : "/dashboard");
  }

  const status = integrationStatus();
  const demo = demoMode();
  const firebaseConfig = status.firebaseAuth
    ? {
        apiKey: publicEnv.firebaseApiKey,
        authDomain: publicEnv.firebaseAuthDomain,
        projectId: publicEnv.firebaseProjectId,
        appId: publicEnv.firebaseAppId,
        messagingSenderId: publicEnv.firebaseMessagingSenderId || undefined,
      }
    : null;

  return (
    <Card className="p-6 sm:p-8">
      <div className="space-y-1.5 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-brand-gradient text-white">
          <Sparkles className="size-5" />
        </div>
        <h1 className="pt-2 font-display text-xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to pick up where you left off.
        </p>
      </div>

      {params.error ? (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/[0.07] px-3.5 py-2.5 text-sm">
          {params.error === "oauth_unavailable"
            ? "Google sign-in isn't configured on this deployment yet."
            : decodeURIComponent(params.error)}
        </p>
      ) : null}

      <div className="mt-6">
        {firebaseConfig ? (
          <>
            <GoogleAuthButton
              config={firebaseConfig}
              next={params.next && params.next.startsWith("/") ? params.next : "/dashboard"}
            />
            {status.googleOAuth ? (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Pop-up not working?{" "}
                <AuthLink href={`/api/auth/google?next=${encodeURIComponent(params.next ?? "/dashboard")}`}>
                  Use redirect sign-in
                </AuthLink>
              </p>
            ) : null}
            <AuthDivider label="or sign in with email" />
          </>
        ) : status.googleOAuth ? (
          <>
            <GoogleButton next={params.next} />
            <AuthDivider label="or sign in with email" />
          </>
        ) : demo ? (
          <>
            <GoogleAuthButton config={null} next="/dashboard" />
            <AuthDivider label="or sign in with email" />
          </>
        ) : null}

        <AuthForm
          action={signInAction}
          hidden={params.next ? { next: params.next } : undefined}
          fields={[
            {
              name: "email",
              label: "Email",
              type: "email",
              placeholder: "you@example.com",
              autoComplete: "email",
              required: true,
            },
            {
              name: "password",
              label: "Password",
              type: "password",
              autoComplete: "current-password",
              required: true,
              hint: "Forgot it?",
            },
          ]}
          submitLabel="Sign in"
          footer={
            <div className="space-y-2">
              <p>
                <AuthLink href="/forgot-password">Reset your password</AuthLink>
              </p>
              <p>
                New to Starvia? <AuthLink href="/signup">Create a free account</AuthLink>
              </p>
            </div>
          }
        />

        {demo ? <DemoNotice /> : null}
      </div>
    </Card>
  );
}
