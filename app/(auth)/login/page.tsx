import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { GoogleButton } from "@/components/auth/auth-form";
import { DemoNotice } from "@/components/auth/demo-notice";
import { Card } from "@/components/ui/card";
import { getSessionContext } from "@/lib/session";
import { demoMode } from "@/lib/env";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Starvia account with Google.",
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

  const demo = demoMode();

  return (
    <Card className="p-6 sm:p-8">
      <div className="space-y-1.5 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-brand-gradient text-white">
          <Sparkles className="size-5" />
        </div>
        <h1 className="pt-2 font-display text-xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in securely with your Google account.
        </p>
      </div>

      {params.error ? (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/[0.07] px-3.5 py-2.5 text-sm">
          {params.error === "oauth_unavailable"
            ? "Google sign-in is not configured on this deployment yet."
            : decodeURIComponent(params.error)}
        </p>
      ) : null}

      <div className="mt-6 space-y-3">
        <GoogleButton next={params.next} />
        <p className="text-center text-xs leading-5 text-muted-foreground">
          By continuing, you agree to Starvia&apos;s Terms and Privacy Policy.
        </p>
        {demo ? <DemoNotice /> : null}
      </div>
    </Card>
  );
}
