import type { Metadata } from "next";
import { KeyRound } from "lucide-react";

import { AuthForm, AuthLink } from "@/components/auth/auth-form";
import { Card } from "@/components/ui/card";
import { requestResetAction } from "@/app/(auth)/actions";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a password reset link for your Starvia account.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <Card className="p-6 sm:p-8">
      <div className="space-y-1.5 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <KeyRound className="size-5" />
        </div>
        <h1 className="pt-2 font-display text-xl font-semibold">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a secure reset link.
        </p>
      </div>

      <div className="mt-6">
        <AuthForm
          action={requestResetAction}
          fields={[
            {
              name: "email",
              label: "Email",
              type: "email",
              placeholder: "you@example.com",
              autoComplete: "email",
              required: true,
            },
          ]}
          submitLabel="Send reset link"
          footer={
            <p>
              Remembered it? <AuthLink href="/login">Back to sign in</AuthLink>
            </p>
          }
        />
      </div>
    </Card>
  );
}
