import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { AuthForm, AuthLink } from "@/components/auth/auth-form";
import { Card } from "@/components/ui/card";
import { updatePasswordAction } from "@/app/(auth)/actions";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Card className="p-6 sm:p-8">
      <div className="space-y-1.5 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="size-5" />
        </div>
        <h1 className="pt-2 font-display text-xl font-semibold">Set a new password</h1>
        <p className="text-sm text-muted-foreground">
          Choose something you&apos;ll remember — at least 8 characters.
        </p>
      </div>

      <div className="mt-6">
        <AuthForm
          action={updatePasswordAction}
          fields={[
            {
              name: "password",
              label: "New password",
              type: "password",
              autoComplete: "new-password",
              required: true,
              minLength: 8,
              hint: "8+ characters",
            },
          ]}
          submitLabel="Update password"
          footer={
            <p>
              <AuthLink href="/login">Back to sign in</AuthLink>
            </p>
          }
        />
      </div>
    </Card>
  );
}
